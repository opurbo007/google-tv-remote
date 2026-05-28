import TcpSocket from 'react-native-tcp-socket';
import {
  MessageReader,
  buildRemoteConfigureRequest,
  buildRemoteSetActive,
  buildKeyEvent,
  buildPingResponse,
  parseRemoteMessage,
  KeyCode,
} from './proto';
import type { KeyCodeValue } from './proto';
import type { ClientCert } from './certificates';

export { KeyCode };
export type { KeyCodeValue };

export type RemoteEvent =
  | { type: 'connecting' }
  | { type: 'connected' }
  | { type: 'ready' }
  | { type: 'disconnected' }
  | { type: 'error'; message: string };

export type RemoteListener = (event: RemoteEvent) => void;

const REMOTE_PORT = 6466;
const PING_INTERVAL_MS = 5_000;
const RECONNECT_DELAY_MS = 3_000;
const MAX_RECONNECT_ATTEMPTS = 5;

export class GoogleTVRemote {
  private socket: any = null;
  private reader = new MessageReader();
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private ready = false;
  private destroyed = false;

  constructor(
    private host: string,
    private clientCert: ClientCert,
    private onEvent: RemoteListener,
  ) {}

  // ─── Public API ────────────────────────────────────────────────────────────

  connect() {
    this.destroyed = false;
    this._connect();
  }

  disconnect() {
    this.destroyed = true;
    this._cleanup();
    this.onEvent({ type: 'disconnected' });
  }

  /** Send a single key press (DOWN + UP) */
  sendKey(keyCode: KeyCodeValue) {
    if (!this.ready) {
      console.warn('[Remote] Not ready — ignoring key', keyCode);
      return;
    }
    this._write(buildKeyEvent(keyCode, 1)); // DOWN
    this._write(buildKeyEvent(keyCode, 2)); // UP
  }

  /** Send a key DOWN event (for long press) */
  keyDown(keyCode: KeyCodeValue) {
    if (!this.ready) return;
    this._write(buildKeyEvent(keyCode, 1));
  }

  /** Send a key UP event */
  keyUp(keyCode: KeyCodeValue) {
    if (!this.ready) return;
    this._write(buildKeyEvent(keyCode, 2));
  }

  get isReady() {
    return this.ready;
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  private _connect() {
    this.reader.reset();
    this.ready = false;
    this.onEvent({ type: 'connecting' });

    try {
      this.socket = TcpSocket.createTLSConnection(
        {
          host: this.host,
          port: REMOTE_PORT,
          cert: this.clientCert.certPem,
          key: this.clientCert.keyPem,
          rejectUnauthorized: false,
        },
        () => {
          this.reconnectAttempts = 0;
          this.onEvent({ type: 'connected' });

          // Step 1: Send configure request
          this._write(buildRemoteConfigureRequest());
        },
      );

      this.socket.on('data', (rawData: Buffer | string) => {
        const chunk =
          typeof rawData === 'string' ? Buffer.from(rawData, 'binary') : rawData;
        const messages = this.reader.feed(chunk);

        for (const msg of messages) {
          this._handleMessage(msg);
        }
      });

      this.socket.on('error', (err: Error) => {
        console.error('[Remote] Socket error:', err.message);
        this.onEvent({ type: 'error', message: err.message });
        this._scheduleReconnect();
      });

      this.socket.on('close', () => {
        console.log('[Remote] Connection closed');
        if (!this.destroyed) {
          this.onEvent({ type: 'disconnected' });
          this._scheduleReconnect();
        }
      });
    } catch (err) {
      console.error('[Remote] createTLSConnection failed:', err);
      this._scheduleReconnect();
    }
  }

  private _handleMessage(msg: Buffer) {
    const parsed = parseRemoteMessage(msg);

    if (parsed.configureResponse) {
      // Step 2: Set active after configure ack
      this._write(buildRemoteSetActive(1));
    }

    if (parsed.setActiveResponse) {
      // Step 3: Ready to accept key events
      this.ready = true;
      this.onEvent({ type: 'ready' });
      this._startPing();
    }

    if (parsed.pingRequest !== undefined) {
      // Respond to keep-alive pings
      this._write(buildPingResponse(parsed.pingRequest));
    }
  }

  private _write(data: Buffer) {
    if (!this.socket) return;
    try {
      this.socket.write(data);
    } catch (err) {
      console.error('[Remote] Write error:', err);
    }
  }

  private _startPing() {
    this._stopPing();
    this.pingTimer = setInterval(() => {
      // Send a set-active heartbeat to keep the connection alive
      if (this.ready) {
        this._write(buildRemoteSetActive(1));
      }
    }, PING_INTERVAL_MS);
  }

  private _stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private _cleanup() {
    this._stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ready = false;
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch {}
      this.socket = null;
    }
  }

  private _scheduleReconnect() {
    if (this.destroyed) return;
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('[Remote] Max reconnect attempts reached');
      this.onEvent({ type: 'error', message: 'Could not reconnect to TV' });
      return;
    }

    this._cleanup();
    this.reconnectAttempts++;
    const delay = RECONNECT_DELAY_MS * this.reconnectAttempts;
    console.log(`[Remote] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      if (!this.destroyed) this._connect();
    }, delay);
  }
}
