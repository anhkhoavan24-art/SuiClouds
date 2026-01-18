import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { getFullnodeUrl } from '@mysten/sui/client';
import { walrus, WalrusFile } from '@mysten/walrus';
import { Ed25519Keypair, RawSigner, JsonRpcProvider } from '@mysten/sui';

const WALRUS_WASM_URL = 'https://unpkg.com/@mysten/walrus-wasm@latest/web/walrus_wasm_bg.wasm';

async function main() {
  try {
    const client = new SuiJsonRpcClient({ url: getFullnodeUrl('testnet'), network: 'testnet' }).$extend(
      walrus({ wasmUrl: WALRUS_WASM_URL }),
    );

    const f1 = WalrusFile.from({ contents: 'Hello from test 1', identifier: 't1' });
    const f2 = WalrusFile.from({ contents: 'Hello from test 2', identifier: 't2' });
    const f3 = WalrusFile.from({ contents: 'Hello from test 3', identifier: 't3' });

    console.log('--- Attempting writeFiles WITHOUT signer (publisher fallback) ---');
    try {
      const res = await client.walrus.writeFiles({ files: [f1, f2, f3], epochs: 1, deletable: true });
      console.log('writeFiles (no signer) results:', JSON.stringify(res, null, 2));
    } catch (e) {
      console.error('writeFiles (no signer) failed:', e);
    }

    console.log('\n--- Attempting writeFiles WITH a RawSigner (may fail if account unfunded) ---');
    try {
      // Create a random keypair and RawSigner. If your environment provides a funded keypair,
      // replace this with your real secret key to pay for registration/upload.
      const kp = Ed25519Keypair.generate();
      const provider = new JsonRpcProvider({ url: getFullnodeUrl('testnet') });
      const signer = new RawSigner(kp, provider);

      const res2 = await client.walrus.writeFiles({ files: [f1, f2, f3], epochs: 3, deletable: true, signer });
      console.log('writeFiles (with signer) results:', JSON.stringify(res2, null, 2));
    } catch (e) {
      console.error('writeFiles (with signer) failed (this is expected if account not funded or API mismatch):', e);
    }
  } catch (err) {
    console.error('Script failed:', err);
  }
}

main();
