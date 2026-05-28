import forge from 'node-forge';
import * as SecureStore from 'expo-secure-store';

const CERT_STORE_KEY = 'tv_remote_client_cert';
const KEY_STORE_KEY = 'tv_remote_client_key';

export interface ClientCert {
  certPem: string;
  keyPem: string;
  certObj: forge.pki.Certificate;
}

/**
 * Retrieve stored cert or generate a new one.
 * The cert is persisted in the device's secure keychain.
 */
export async function getOrCreateClientCert(): Promise<ClientCert> {
  const storedCert = await SecureStore.getItemAsync(CERT_STORE_KEY);
  const storedKey = await SecureStore.getItemAsync(KEY_STORE_KEY);

  if (storedCert && storedKey) {
    try {
      const certObj = forge.pki.certificateFromPem(storedCert);
      return { certPem: storedCert, keyPem: storedKey, certObj };
    } catch {
      // Corrupt cert — regenerate
    }
  }

  return generateClientCert();
}

export async function generateClientCert(): Promise<ClientCert> {
  console.log('[Cert] Generating RSA 2048 key pair...');

  const keypair = await new Promise<forge.pki.rsa.KeyPair>((resolve, reject) => {
    forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 2 }, (err, kp) => {
      if (err) reject(err);
      else resolve(kp);
    });
  });

  const cert = forge.pki.createCertificate();
  cert.publicKey = keypair.publicKey;
  cert.serialNumber = forge.util.bytesToHex(forge.random.getBytesSync(16));

  const now = new Date();
  cert.validity.notBefore = now;
  cert.validity.notAfter = new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);

  const attrs = [
    { name: 'commonName', value: 'TVRemoteApp' },
    { name: 'organizationName', value: 'TVRemote' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
    { name: 'extKeyUsage', clientAuth: true },
  ]);

  cert.sign(keypair.privateKey, forge.md.sha256.create());

  const certPem = forge.pki.certificateToPem(cert);
  const keyPem = forge.pki.privateKeyToPem(keypair.privateKey);

  await SecureStore.setItemAsync(CERT_STORE_KEY, certPem);
  await SecureStore.setItemAsync(KEY_STORE_KEY, keyPem);

  console.log('[Cert] Client certificate generated and stored.');
  return { certPem, keyPem, certObj: cert };
}

export async function clearClientCert(): Promise<void> {
  await SecureStore.deleteItemAsync(CERT_STORE_KEY);
  await SecureStore.deleteItemAsync(KEY_STORE_KEY);
}

/**
 * Compute the pairing secret.
 *
 * Algorithm (matches the Google TV pairing service):
 *   SHA-256(
 *     client_rsa_modulus_bytes ||
 *     client_rsa_exponent_bytes ||
 *     server_rsa_modulus_bytes ||
 *     server_rsa_exponent_bytes
 *   )
 *
 * @param clientCert  The phone's self-signed cert (forge Certificate)
 * @param serverCertPem  The TV's cert received during TLS handshake (PEM string)
 */
export function computePairingSecret(
  clientCert: forge.pki.Certificate,
  serverCertPem: string,
): Buffer {
  const serverCert = forge.pki.certificateFromPem(serverCertPem);

  const clientKey = clientCert.publicKey as forge.pki.rsa.PublicKey;
  const serverKey = serverCert.publicKey as forge.pki.rsa.PublicKey;

  const md = forge.md.sha256.create();

  const clientMod = rsaBigIntToBytes(clientKey.n);
  const clientExp = rsaBigIntToBytes(clientKey.e);
  const serverMod = rsaBigIntToBytes(serverKey.n);
  const serverExp = rsaBigIntToBytes(serverKey.e);

  md.update(bytesToForgeStr(clientMod));
  md.update(bytesToForgeStr(clientExp));
  md.update(bytesToForgeStr(serverMod));
  md.update(bytesToForgeStr(serverExp));

  return Buffer.from(md.digest().bytes(), 'binary');
}

/** Get a human-readable display code from the secret (first 6 hex chars). */
export function secretToDisplayCode(secret: Buffer): string {
  return secret.toString('hex').substring(0, 6).toUpperCase();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rsaBigIntToBytes(n: forge.jsbn.BigInteger): Uint8Array {
  const hex = n.toString(16);
  const padded = hex.length % 2 === 0 ? hex : '0' + hex;
  const bytes = new Uint8Array(padded.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(padded.slice(i * 2, i * 2 + 2), 16);
  }
  // Strip leading zero (unsigned big-endian)
  return bytes[0] === 0 ? bytes.slice(1) : bytes;
}

function bytesToForgeStr(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => String.fromCharCode(b))
    .join('');
}
