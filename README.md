# Google TV Remote — React Native

A fully standalone Google TV remote app for Android & iOS. No ads. No server. Direct TLS connection from your phone to your TV over local Wi-Fi.

---

## How it works

```
Phone (React Native)
  └─ TLS TCP → port 6467  (one-time pairing)
  └─ TLS TCP → port 6466  (remote control)
       └─ Google TV
```

- **Discovery**: mDNS scans for `_androidtvremote2._tcp` services on local network
- **Pairing**: TLS handshake + protobuf exchange → PIN shown on TV screen
- **Control**: Persistent TLS socket with protobuf-encoded key events
- **Certificate**: RSA-2048 self-signed cert stored in device secure keychain (persists across app restarts)

---

## Prerequisites

- Node.js 18+
- Expo CLI: `npm i -g expo-cli`
- For Android: Android Studio + emulator or physical device
- For iOS: Xcode 15+ (Mac only)
- **Expo Managed workflow is NOT supported** — you need a dev build or bare workflow because `react-native-tcp-socket` and `react-native-zeroconf` require native modules

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Generate native projects
npx expo prebuild --clean

# 3a. Run on Android
npx expo run:android

# 3b. Run on iOS
npx expo run:ios
```

---

## Project Structure

```
├── app/
│   ├── _layout.tsx          # Root layout (cert init, nav)
│   ├── index.tsx            # Remote screen
│   ├── discover.tsx         # TV discovery screen
│   └── pair.tsx             # Pairing screen
│
└── src/
    ├── lib/
    │   ├── proto.ts         # Protobuf encoder/decoder + message builders
    │   ├── certificates.ts  # RSA cert generation + pairing secret
    │   ├── pairing.ts       # One-time pairing protocol (port 6467)
    │   ├── remote.ts        # Remote control connection (port 6466)
    │   └── discovery.ts     # mDNS TV discovery
    ├── store/
    │   └── tvStore.ts       # Zustand global state
    └── components/
        ├── RemoteScreen.tsx  # Main remote UI
        ├── DiscoverScreen.tsx# TV discovery UI
        ├── PairScreen.tsx    # Pairing flow UI
        ├── DPad.tsx          # Circular D-pad
        ├── RemoteButton.tsx  # Animated button
        └── ConnectionBadge.tsx # Status indicator
```

---

## Android Setup (Required)

Add to `android/app/src/main/res/xml/network_security_config.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </base-config>
</network-security-config>
```

Reference it in `AndroidManifest.xml`:
```xml
<application
  android:networkSecurityConfig="@xml/network_security_config"
  ...>
```

---

## iOS Setup (Required)

The `NSLocalNetworkUsageDescription` and `NSBonjourServices` keys are already in `app.json`. After prebuild they'll appear in `Info.plist` automatically.

If mDNS discovery doesn't work on iOS 14+, add this to your `Info.plist` manually:
```xml
<key>NSBonjourServices</key>
<array>
    <string>_androidtvremote2._tcp</string>
</array>
```

---

## Pairing your TV

1. Open the app → tap **Find TV**
2. App scans for Google TVs on your Wi-Fi (takes ~6 seconds)
3. Tap your TV — pairing screen opens
4. A 6-character hex code appears on your TV screen
5. Confirm on the TV with your physical remote → **OK**
6. App pairs automatically and opens the remote

> Pairing is one-time. The certificate is stored securely on your phone. Future connections are automatic.

---

## Key codes reference

All key codes are in `src/lib/proto.ts` under the `KeyCode` object. To add a button, import `KeyCode` and use `RemoteButton`:

```tsx
<RemoteButton
  keyCode={KeyCode.NETFLIX}  // add custom codes as needed
  icon={<Ionicons name="play" size={20} color="#E50914" />}
  size={56}
/>
```

---

## Known limitations

- `getPeerCertificate()` support depends on your `react-native-tcp-socket` version. Version 6.x supports it via the native TLS layer. If pairing fails with a cert error, ensure you're on v6+.
- mDNS discovery may not work on some corporate/mesh Wi-Fi networks that block multicast. Use manual IP entry in that case.
- Background connections: the TCP socket will disconnect when the app is backgrounded on iOS. Reconnection is automatic when the app foregrounds.

---

## Tech Stack

| Layer | Library |
|-------|---------|
| Framework | React Native + Expo (bare) |
| Navigation | Expo Router |
| State | Zustand |
| TCP/TLS | react-native-tcp-socket |
| mDNS | react-native-zeroconf |
| Crypto | node-forge |
| Storage | expo-secure-store + AsyncStorage |
| Animations | react-native-reanimated |
