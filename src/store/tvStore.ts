import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DiscoveredTV } from '../lib/discovery';
import type { ClientCert } from '../lib/certificates';
import { GoogleTVRemote, KeyCode } from '../lib/remote';
import type { KeyCodeValue } from '../lib/remote';

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'ready'
  | 'disconnected'
  | 'error';

export interface PairedTV {
  name: string;
  host: string;
  port: number;
}

const PAIRED_TVS_KEY = '@tv_remote/paired_tvs';

interface TVStore {
  // TV state
  pairedTVs: PairedTV[];
  activeTV: PairedTV | null;
  connectionStatus: ConnectionStatus;
  errorMessage: string | null;

  // Remote instance (not serialized)
  remote: GoogleTVRemote | null;

  // Cert (loaded once at app start)
  clientCert: ClientCert | null;

  // Actions
  setClientCert: (cert: ClientCert) => void;
  loadPairedTVs: () => Promise<void>;
  addPairedTV: (tv: PairedTV) => Promise<void>;
  removePairedTV: (host: string) => Promise<void>;
  connectToTV: (tv: PairedTV) => void;
  disconnectFromTV: () => void;
  sendKey: (keyCode: KeyCodeValue) => void;
  keyDown: (keyCode: KeyCodeValue) => void;
  keyUp: (keyCode: KeyCodeValue) => void;
}

export const useTVStore = create<TVStore>((set, get) => ({
  pairedTVs: [],
  activeTV: null,
  connectionStatus: 'idle',
  errorMessage: null,
  remote: null,
  clientCert: null,

  setClientCert: (cert) => set({ clientCert: cert }),

  loadPairedTVs: async () => {
    try {
      const raw = await AsyncStorage.getItem(PAIRED_TVS_KEY);
      if (raw) {
        const tvs: PairedTV[] = JSON.parse(raw);
        set({ pairedTVs: tvs });
      }
    } catch {
      console.warn('[Store] Failed to load paired TVs');
    }
  },

  addPairedTV: async (tv) => {
    const existing = get().pairedTVs;
    const updated = [...existing.filter((t) => t.host !== tv.host), tv];
    set({ pairedTVs: updated });
    await AsyncStorage.setItem(PAIRED_TVS_KEY, JSON.stringify(updated));
  },

  removePairedTV: async (host) => {
    const updated = get().pairedTVs.filter((t) => t.host !== host);
    set({ pairedTVs: updated });
    await AsyncStorage.setItem(PAIRED_TVS_KEY, JSON.stringify(updated));

    if (get().activeTV?.host === host) {
      get().disconnectFromTV();
    }
  },

  connectToTV: (tv) => {
    const { clientCert, remote: existingRemote } = get();

    if (!clientCert) {
      set({ connectionStatus: 'error', errorMessage: 'Client certificate not ready' });
      return;
    }

    // Clean up existing connection
    existingRemote?.disconnect();

    const remote = new GoogleTVRemote(tv.host, clientCert, (event) => {
      switch (event.type) {
        case 'connecting':
          set({ connectionStatus: 'connecting', errorMessage: null });
          break;
        case 'connected':
          set({ connectionStatus: 'connected' });
          break;
        case 'ready':
          set({ connectionStatus: 'ready' });
          break;
        case 'disconnected':
          set({ connectionStatus: 'disconnected' });
          break;
        case 'error':
          set({ connectionStatus: 'error', errorMessage: event.message });
          break;
      }
    });

    set({ activeTV: tv, remote });
    remote.connect();
  },

  disconnectFromTV: () => {
    const { remote } = get();
    remote?.disconnect();
    set({ remote: null, activeTV: null, connectionStatus: 'idle', errorMessage: null });
  },

  sendKey: (keyCode) => {
    get().remote?.sendKey(keyCode);
  },

  keyDown: (keyCode) => {
    get().remote?.keyDown(keyCode);
  },

  keyUp: (keyCode) => {
    get().remote?.keyUp(keyCode);
  },
}));

export { KeyCode };
export type { KeyCodeValue };
