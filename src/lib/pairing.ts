import TcpSocket from 'react-native-tcp-socket';
import {
  MessageReader,
  buildPairingRequest,
  buildOptionsResponse,
  buildSecretMessage,
  parsePairingMessage,
} from './proto';
import { computePairingSecret, secretToDisplayCode } from './certificates';
import type { ClientCert } from './certificates';

export type PairingEvent =
  | { type: 'connecting' }
  | { type: 'connected' }
  | { type: 'secret'; code: string }        // Display code for user to confirm on TV
  | { type: 'success' }
  | { type: 'error'; message: string }
  | { type: 'closed' };

export type PairingListener = (event: PairingEvent) => void;

export const PAIRING_PORT = 6467;
export const REMOTE_PORT = 6466;

export const PAIRING_STATUS = {
  OK: 200,
  BAD_CONFIGURATION: 401,
  BAD_SECRET: 402,
} as const;

/**
 * Run the one-time pairing protocol with a Google TV.
 *
 * Flow:
 *   1. TLS connect to TV:6467 with our client cert
 *   2. Exchange PairingRequest / Options / Configuration
 *   3. Compute secret = SHA256(client_key || server_key)
 *   4. Send Secret — TV shows a 6-char hex code on screen
 *   5. User visually confirms on TV by pressing OK
 *   6. TV responds STATUS_OK → pairing done
 *
 * The TV's cert is extracted via socket.getPeerCertificate() after the
 * TLS handshake completes.
 */
export async function pair(
  host: string,
  clientCert: ClientCert,
  onEvent: PairingListener,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new MessageReader();
    let peerCertPem: string | null = null;
    let stage: 'request' | 'options' | 'configure' | 'secret' | 'done' = 'request';

    onEvent({ type: 'connecting' });

    const socket = TcpSocket.createTLSConnection(
      {
        host,
        port: PAIRING_PORT,
        cert: clientCert.certPem,
        key: clientCert.keyPem,
        rejectUnauthorized: false, // TV uses a self-signed cert
      },
      () => {
        onEvent({ type: 'connected' });

        // Extract TV's cert from the TLS session so we can compute the secret.
        // react-native-tcp-socket v6+ exposes getPeerCertificate().
        try {
          const peerInfo = (socket as any).getPeerCertificate?.();
          if (peerInfo) {
            // May return { raw: Buffer } (DER) or a PEM string depending on version
            if (typeof peerInfo === 'string') {
              peerCertPem = peerInfo;
            } else if (peerInfo.raw) {
              peerCertPem = derToPem(peerInfo.raw);
            } else if (peerInfo.pemEncoded) {
              peerCertPem = peerInfo.pemEncoded;
            }
          }
        } catch {
          // getPeerCertificate not available — secret computation will be skipped
          console.warn('[Pairing] getPeerCertificate not available');
        }

        // Step 1: Send PairingRequest
        socket.write(buildPairingRequest('androidtvremote2', 'TVRemoteApp'));
      },
    );

    socket.on('data', (rawData: Buffer | string) => {
      const chunk = typeof rawData === 'string' ? Buffer.from(rawData, 'binary') : rawData;
      const messages = reader.feed(chunk);

      for (const msg of messages) {
        try {
          handleMessage(msg);
        } catch (err) {
          onEvent({ type: 'error', message: String(err) });
          socket.destroy();
          reject(err);
        }
      }
    });

    socket.on('error', (err: Error) => {
      onEvent({ type: 'error', message: err.message });
      reject(err);
    });

    socket.on('close', () => {
      onEvent({ type: 'closed' });
      if (stage !== 'done') {
        reject(new Error('Connection closed before pairing completed'));
      }
    });

    function handleMessage(msg: Buffer) {
      const parsed = parsePairingMessage(msg);
      console.log('[Pairing] Stage:', stage, '| Message:', parsed);

      if (parsed.status && parsed.status !== PAIRING_STATUS.OK) {
        throw new Error(`Pairing failed with status ${parsed.status}`);
      }

      switch (stage) {
        case 'request':
          if (parsed.hasPairingRequestAck) {
            stage = 'options';
            // TV will send Options next — nothing to do here
          }
          break;

        case 'options':
          if (parsed.hasOptions) {
            stage = 'configure';
            // Send our configuration: hexadecimal encoding, 6 symbols
            socket.write(buildOptionsResponse());
          }
          break;

        case 'configure':
          if (parsed.hasConfigurationAck) {
            stage = 'secret';

            if (!peerCertPem) {
              throw new Error(
                'Could not get TV certificate. Please update react-native-tcp-socket or add a native module.',
              );
            }

            // Compute the pairing secret from both public keys
            const secret = computePairingSecret(clientCert.certObj, peerCertPem);
            const displayCode = secretToDisplayCode(secret);

            // Tell the UI what code will appear on the TV screen
            onEvent({ type: 'secret', code: displayCode });

            // Send the secret — TV will show the code and wait for user to confirm
            socket.write(buildSecretMessage(secret));
          }
          break;

        case 'secret':
          if (parsed.hasSecretAck || parsed.status === PAIRING_STATUS.OK) {
            stage = 'done';
            onEvent({ type: 'success' });
            socket.destroy();
            resolve();
          }
          break;
      }
    }
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function derToPem(der: Buffer): string {
  const b64 = der.toString('base64');
  const lines = b64.match(/.{1,64}/g)?.join('\n') ?? b64;
  return `-----BEGIN CERTIFICATE-----\n${lines}\n-----END CERTIFICATE-----`;
}
