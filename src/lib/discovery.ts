import Zeroconf from 'react-native-zeroconf';

export interface DiscoveredTV {
  name: string;
  host: string;
  port: number;
  addresses: string[];
}

export type DiscoveryListener =
  | { type: 'found'; tv: DiscoveredTV }
  | { type: 'removed'; name: string }
  | { type: 'error'; message: string }
  | { type: 'started' }
  | { type: 'stopped' };

const SERVICE_TYPE = 'androidtvremote2';
const SERVICE_DOMAIN = 'local.';

/**
 * Scan the local network for Google TV devices using mDNS.
 *
 * Call `stop()` on the returned object when done scanning.
 *
 * @param onEvent  Called for each discovery event
 * @returns        `{ stop }` — call when done
 */
export function startDiscovery(onEvent: (event: DiscoveryListener) => void): { stop: () => void } {
  const zeroconf = new Zeroconf();

  zeroconf.on('start', () => onEvent({ type: 'started' }));
  zeroconf.on('stop', () => onEvent({ type: 'stopped' }));
  zeroconf.on('error', (err: any) => onEvent({ type: 'error', message: String(err) }));

  zeroconf.on('resolved', (service: any) => {
    // Friendly name is in TXT record field 'n' (e.g. "Vision TV")
    // Fallback chain: txt.n → txt.fn → service.name → 'Google TV'
    const txt = service.txt ?? {};
    const friendlyName =
      txt.n ?? txt.fn ?? txt.md ?? service.name ?? 'Google TV';

    const tv: DiscoveredTV = {
      name: friendlyName,
      host: service.host ?? service.addresses?.[0] ?? '',
      port: service.port ?? 6467,
      addresses: service.addresses ?? [],
    };

    if (tv.host) {
      onEvent({ type: 'found', tv });
    }
  });

  zeroconf.on('removed', (service: any) => {
    onEvent({ type: 'removed', name: service.name ?? '' });
  });

  zeroconf.scan(SERVICE_TYPE, 'tcp', SERVICE_DOMAIN);

  return {
    stop: () => {
      try {
        zeroconf.stop();
        zeroconf.removeDeviceListeners();
      } catch {}
    },
  };
}

/**
 * One-shot scan: resolves with a list of TVs found within `timeoutMs`.
 */
export function scanForTVs(timeoutMs = 5000): Promise<DiscoveredTV[]> {
  return new Promise((resolve) => {
    const found = new Map<string, DiscoveredTV>();

    const { stop } = startDiscovery((event) => {
      if (event.type === 'found') {
        found.set(event.tv.name, event.tv);
      }
    });

    setTimeout(() => {
      stop();
      resolve(Array.from(found.values()));
    }, timeoutMs);
  });
}
