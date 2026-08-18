import { webcrypto } from 'node:crypto';

// Node 18 doesn't expose the Web Crypto API as globalThis.crypto by default
// (stable/unflagged only from Node 19+/20 LTS). @modelcontextprotocol/sdk relies
// on it at runtime. Railway currently runs this service on Node 18.20.5.
if (!globalThis.crypto) {
  (globalThis as { crypto?: Crypto }).crypto = webcrypto as unknown as Crypto;
}
