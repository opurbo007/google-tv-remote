/**
 * Minimal protobuf encoder/decoder for the Android TV Remote protocol.
 * Avoids heavy library dependencies and Metro bundler issues.
 */

// ─── Encoder ────────────────────────────────────────────────────────────────

export function encodeVarint(n: number): number[] {
  const bytes: number[] = [];
  // Handle as unsigned 32-bit
  n = n >>> 0;
  do {
    let b = n & 0x7f;
    n = Math.floor(n / 128);
    if (n > 0) b |= 0x80;
    bytes.push(b);
  } while (n > 0);
  return bytes;
}

function tag(fieldNum: number, wireType: number): number[] {
  return encodeVarint((fieldNum << 3) | wireType);
}

/** Encode a varint field (wire type 0) */
export function encodeVarintField(fieldNum: number, value: number): number[] {
  return [...tag(fieldNum, 0), ...encodeVarint(value)];
}

/** Encode a string field (wire type 2) */
export function encodeStringField(fieldNum: number, str: string): number[] {
  const bytes = Array.from(Buffer.from(str, 'utf8'));
  return [...tag(fieldNum, 2), ...encodeVarint(bytes.length), ...bytes];
}

/** Encode a bytes field (wire type 2) */
export function encodeBytesField(fieldNum: number, data: Uint8Array): number[] {
  const bytes = Array.from(data);
  return [...tag(fieldNum, 2), ...encodeVarint(bytes.length), ...bytes];
}

/** Encode a nested message field (wire type 2) */
export function encodeMsgField(fieldNum: number, msgBytes: number[]): number[] {
  return [...tag(fieldNum, 2), ...encodeVarint(msgBytes.length), ...msgBytes];
}

/** Wrap encoded proto bytes with the 2-byte length prefix used by the protocol */
export function frameMessage(protoBytes: number[]): Buffer {
  const len = protoBytes.length;
  const buf = Buffer.alloc(2 + len);
  buf[0] = (len >> 8) & 0xff;
  buf[1] = len & 0xff;
  Buffer.from(protoBytes).copy(buf, 2);
  return buf;
}

// ─── Decoder ────────────────────────────────────────────────────────────────

export type DecodedProto = Record<number, Array<number | Uint8Array>>;

export function decodeVarint(buf: Uint8Array, offset: number): [number, number] {
  let result = 0;
  let shift = 0;
  let b: number;
  do {
    if (offset >= buf.length) throw new Error('Unexpected end of buffer');
    b = buf[offset++];
    result |= (b & 0x7f) << shift;
    shift += 7;
  } while (b & 0x80);
  return [result, offset];
}

export function decodeProto(buf: Uint8Array): DecodedProto {
  const result: DecodedProto = {};
  let offset = 0;

  while (offset < buf.length) {
    let tagVal: number;
    [tagVal, offset] = decodeVarint(buf, offset);
    const fieldNum = tagVal >>> 3;
    const wireType = tagVal & 0x07;

    if (!result[fieldNum]) result[fieldNum] = [];

    if (wireType === 0) {
      // Varint
      let value: number;
      [value, offset] = decodeVarint(buf, offset);
      result[fieldNum].push(value);
    } else if (wireType === 2) {
      // Length-delimited
      let length: number;
      [length, offset] = decodeVarint(buf, offset);
      result[fieldNum].push(buf.slice(offset, offset + length));
      offset += length;
    } else if (wireType === 1) {
      // 64-bit (skip)
      offset += 8;
    } else if (wireType === 5) {
      // 32-bit (skip)
      offset += 4;
    } else {
      break;
    }
  }

  return result;
}

// ─── Message reader (handles TCP fragmentation) ──────────────────────────────

export class MessageReader {
  private buffer: Buffer = Buffer.alloc(0);

  feed(chunk: Buffer | Uint8Array): Buffer[] {
    this.buffer = Buffer.concat([this.buffer, Buffer.from(chunk)]);
    const messages: Buffer[] = [];

    while (this.buffer.length >= 2) {
      const msgLen = (this.buffer[0] << 8) | this.buffer[1];
      if (this.buffer.length < 2 + msgLen) break;
      messages.push(this.buffer.slice(2, 2 + msgLen));
      this.buffer = this.buffer.slice(2 + msgLen);
    }

    return messages;
  }

  reset() {
    this.buffer = Buffer.alloc(0);
  }
}

// ─── Pairing message builders ────────────────────────────────────────────────

export function buildPairingRequest(serviceName: string, clientName: string): Buffer {
  // PairingMessage {
  //   protocol_version (1): 2
  //   pairing_request (10): { service_name (1): string, client_name (2): string }
  // }
  const pairingRequest = [
    ...encodeStringField(1, serviceName),
    ...encodeStringField(2, clientName),
  ];
  const pairingMessage = [
    ...encodeVarintField(1, 2), // protocol_version = 2
    ...encodeMsgField(10, pairingRequest),
  ];
  return frameMessage(pairingMessage);
}

export function buildOptionsResponse(): Buffer {
  // PairingMessage {
  //   protocol_version (1): 2
  //   configuration (13): {
  //     encoding (1): { type (1): 3 (HEXADECIMAL), symbol_length (2): 6 }
  //     client_role (2): 1 (INPUT)
  //   }
  // }
  const encoding = [
    ...encodeVarintField(1, 3), // ENCODING_TYPE_HEXADECIMAL
    ...encodeVarintField(2, 6), // symbol_length = 6
  ];
  const configuration = [
    ...encodeMsgField(1, encoding),
    ...encodeVarintField(2, 1), // ROLE_TYPE_INPUT
  ];
  const pairingMessage = [
    ...encodeVarintField(1, 2),
    ...encodeMsgField(13, configuration),
  ];
  return frameMessage(pairingMessage);
}

export function buildSecretMessage(secret: Uint8Array): Buffer {
  // PairingMessage {
  //   protocol_version (1): 2
  //   secret (14): { secret (1): bytes }
  // }
  const secretMsg = [...encodeBytesField(1, secret)];
  const pairingMessage = [
    ...encodeVarintField(1, 2),
    ...encodeMsgField(14, secretMsg),
  ];
  return frameMessage(pairingMessage);
}

export function parsePairingMessage(buf: Buffer): {
  status?: number;
  hasPairingRequestAck?: boolean;
  hasOptions?: boolean;
  hasConfigurationAck?: boolean;
  hasSecretAck?: boolean;
} {
  const proto = decodeProto(buf);
  const status = proto[2]?.[0] as number | undefined;

  return {
    status,
    hasPairingRequestAck: !!proto[11],
    hasOptions: !!proto[12],
    hasConfigurationAck: !!proto[13],
    hasSecretAck: !!proto[14] || (status !== undefined),
  };
}

// ─── Remote message builders ─────────────────────────────────────────────────

export function buildRemoteConfigureRequest(): Buffer {
  // RemoteMessage {
  //   remote_configure_request (1): { code1 (1): 622, configuration (2): { code1 (1): 0 } }
  // }
  const config = [...encodeVarintField(1, 0)];
  const configureRequest = [
    ...encodeVarintField(1, 622),
    ...encodeMsgField(2, config),
  ];
  return frameMessage([...encodeMsgField(1, configureRequest)]);
}

export function buildRemoteSetActive(active: number): Buffer {
  // RemoteMessage { remote_set_active_request (6): { active (6): 1 } }
  const setActive = [...encodeVarintField(6, active)];
  return frameMessage([...encodeMsgField(6, setActive)]);
}

export function buildKeyEvent(keyCode: number, eventType: 1 | 2 | 3): Buffer {
  // RemoteMessage {
  //   remote_key_inject (10): {
  //     key_code (1): KeyCode,
  //     event_type (2): KeyEventType (1=DOWN, 2=UP, 3=SHORT)
  //   }
  // }
  const keyInject = [
    ...encodeVarintField(1, keyCode),
    ...encodeVarintField(2, eventType),
  ];
  return frameMessage([...encodeMsgField(10, keyInject)]);
}

export function buildPingResponse(val1: number): Buffer {
  // RemoteMessage { remote_ping_response (12): { val1 (1): val1 } }
  const pingResponse = [...encodeVarintField(1, val1)];
  return frameMessage([...encodeMsgField(12, pingResponse)]);
}

export function parseRemoteMessage(buf: Buffer): {
  configureResponse?: boolean;
  setActiveResponse?: boolean;
  pingRequest?: number;
} {
  const proto = decodeProto(buf);
  let pingRequest: number | undefined;

  if (proto[11]) {
    // RemotePingRequest: { val1 (1): number }
    const pingProto = decodeProto(proto[11][0] as Uint8Array);
    pingRequest = pingProto[1]?.[0] as number;
  }

  return {
    configureResponse: !!proto[2],
    setActiveResponse: !!proto[7],
    pingRequest,
  };
}

// ─── Android TV Key Codes ────────────────────────────────────────────────────

export const KeyCode = {
  // System
  HOME: 3,
  BACK: 4,
  POWER: 26,
  SETTINGS: 176,
  TV_INPUT: 178,
  ASSIST: 219,
  SEARCH: 84,
  // D-Pad
  DPAD_UP: 19,
  DPAD_DOWN: 20,
  DPAD_LEFT: 21,
  DPAD_RIGHT: 22,
  DPAD_CENTER: 23,
  // Volume
  VOLUME_UP: 24,
  VOLUME_DOWN: 25,
  MUTE: 91,
  VOLUME_MUTE: 164,
  // Media
  MEDIA_PLAY_PAUSE: 85,
  MEDIA_STOP: 86,
  MEDIA_NEXT: 87,
  MEDIA_PREVIOUS: 88,
  MEDIA_PLAY: 126,
  MEDIA_PAUSE: 127,
  // Numbers
  NUM_0: 7,  NUM_1: 8,  NUM_2: 9,  NUM_3: 10,
  NUM_4: 11, NUM_5: 12, NUM_6: 13, NUM_7: 14,
  NUM_8: 15, NUM_9: 16,
  // Letters A–Z (Android keycodes 29–54)
  A: 29, B: 30, C: 31, D: 32, E: 33, F: 34, G: 35,
  H: 36, I: 37, J: 38, K: 39, L: 40, M: 41, N: 42,
  O: 43, P: 44, Q: 45, R: 46, S: 47, T: 48, U: 49,
  V: 50, W: 51, X: 52, Y: 53, Z: 54,
  // Editing
  ENTER: 66,
  BACKSPACE: 67,
  DEL_FORWARD: 112,
  SPACE: 62,
  TAB: 61,
  // Symbols
  COMMA: 55,
  PERIOD: 56,
  MINUS: 69,
  EQUALS: 70,
  SLASH: 76,
  BACKSLASH: 73,
  SEMICOLON: 74,
  APOSTROPHE: 75,
  AT: 77,
  GRAVE: 68,
  LEFT_BRACKET: 71,
  RIGHT_BRACKET: 72,
} as const;

export type KeyCodeValue = (typeof KeyCode)[keyof typeof KeyCode];

/** Map a character to its Android keycode. Returns null if unmappable. */
export function charToKeyCode(char: string): KeyCodeValue | null {
  const c = char.toUpperCase();
  if (c in KeyCode) return KeyCode[c as keyof typeof KeyCode] as KeyCodeValue;
  const map: Record<string, KeyCodeValue> = {
    ' ': KeyCode.SPACE,
    '.': KeyCode.PERIOD,
    ',': KeyCode.COMMA,
    '-': KeyCode.MINUS,
    '=': KeyCode.EQUALS,
    '/': KeyCode.SLASH,
    '\\': KeyCode.BACKSLASH,
    ';': KeyCode.SEMICOLON,
    "'": KeyCode.APOSTROPHE,
    '@': KeyCode.AT,
    '`': KeyCode.GRAVE,
    '[': KeyCode.LEFT_BRACKET,
    ']': KeyCode.RIGHT_BRACKET,
    '0': KeyCode.NUM_0, '1': KeyCode.NUM_1, '2': KeyCode.NUM_2,
    '3': KeyCode.NUM_3, '4': KeyCode.NUM_4, '5': KeyCode.NUM_5,
    '6': KeyCode.NUM_6, '7': KeyCode.NUM_7, '8': KeyCode.NUM_8,
    '9': KeyCode.NUM_9,
  };
  return map[char] ?? null;
}
