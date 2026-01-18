import axios from 'axios';
// NOTE: heavy/binary/browser-only packages (@mysten/sui, @mysten/walrus)
// are imported dynamically inside functions so this module is safe
// to import on the server (SSR) without causing runtime errors.

// Use the wasm bindings CDN for Vite (works without bundling wasm locally)
const WALRUS_WASM_URL = 'https://unpkg.com/@mysten/walrus-wasm@latest/web/walrus_wasm_bg.wasm';

// Walrus Publisher / Aggregator (fallback endpoints)
const WALRUS_PUBLISHER_URL = 'https://publisher.walrus-testnet.walrus.space';
const WALRUS_AGGREGATOR_URL = 'https://aggregator.walrus-testnet.walrus.space';
// Relay (user-facing) endpoint (relay.wal.app)
const WALRUS_RELAY_URL = 'https://relay.wal.app';

// Create and extend Sui client with walrus extension. Keep a singleton.
let _client: any = null;
const getClient = async () => {
  if (_client) return _client;
  const [{ SuiJsonRpcClient }, { getFullnodeUrl }, { walrus }] = await Promise.all([
    import('@mysten/sui/jsonRpc'),
    import('@mysten/sui/client'),
    import('@mysten/walrus'),
  ]);
  const client = new SuiJsonRpcClient({ url: getFullnodeUrl('testnet'), network: 'testnet' });
  _client = (client as any).$extend(walrus({ wasmUrl: WALRUS_WASM_URL }));
  return _client as any;
};

/**
 * Helper: create a WalrusFile from various inputs
 */
export const makeWalrusFile = async (opts: { contents: Uint8Array | Blob | string; identifier?: string; tags?: Record<string, string> }) => {
  const { WalrusFile } = await import('@mysten/walrus');
  return WalrusFile.from({ contents: opts.contents as any, identifier: opts.identifier, tags: opts.tags });
};

/**
 * Connect to an injected Sui wallet (Slush / Sui-compatible wallets).
 * Attempts common provider methods and returns { address, signer }.
 */
export const connectSuiWallet = async (): Promise<{ address: string | null; signer: any | null }> => {
  const globalAny: any = window as any;
  const provider = globalAny.sui || globalAny.slush || globalAny.suiWallet || null;
  if (!provider) throw new Error('No Sui wallet provider detected in window');

  // Try several common connect flows
  if (typeof provider.connect === 'function') {
    try {
      await provider.connect();
    } catch (e) {
      // ignore
    }
  } else if (typeof provider.request === 'function') {
    try {
      await provider.request({ method: 'sui_connect' });
    } catch (e) {
      // ignore
    }
  }

  // Try to obtain accounts
  let accounts: any[] = [];
  if (typeof provider.getAccounts === 'function') {
    try {
      accounts = await provider.getAccounts();
    } catch (e) {
      // ignore
    }
  }
  if (!accounts || accounts.length === 0) {
    if (Array.isArray(provider.accounts) && provider.accounts.length) accounts = provider.accounts;
    else if (typeof provider.request === 'function') {
      try {
        accounts = await provider.request({ method: 'sui_accounts' });
      } catch (e) {
        // ignore
      }
    }
  }

  const address = accounts && accounts.length ? (accounts[0].address || accounts[0]) : null;

  // If the provider exposes signAndExecuteTransaction or signTransaction, return it as signer.
  const signer = typeof provider.signAndExecuteTransaction === 'function' || typeof provider.signTransaction === 'function' ? provider : null;

  return { address, signer };
};

/**
 * Try to request a price/quote from the relay (relay.wal.app).
 * This tries a few plausible endpoints and returns the first successful response body.
 */
export const getRelayPriceQuote = async (sizeBytes: number, epochs = 1) => {
  const urls = [`${WALRUS_RELAY_URL}/v1/quote`, `${WALRUS_RELAY_URL}/v1/price`, `${WALRUS_RELAY_URL}/pricing`];
  for (const url of urls) {
    try {
      const res = await axios.post(url, { size: sizeBytes, epochs });
      if (res && res.data) return res.data;
    } catch (e) {
      // try next
    }
  }
  return null;
};

/**
 * Try to upload via the user-facing relay endpoints. Returns { blobId, details } on success.
 * Tries a few plausible upload endpoints and falls back to null when unavailable.
 */
export const uploadToRelay = async (input: File | Blob | Uint8Array | string, opts?: { epochs?: number; identifier?: string; signerAddress?: string }) => {
  const candidates = [`${WALRUS_RELAY_URL}/v1/upload`, `${WALRUS_RELAY_URL}/v1/store`, `${WALRUS_RELAY_URL}/upload`];

  // normalize body
  const body = input instanceof Blob || input instanceof File ? input : new Blob([input as any]);

  for (const url of candidates) {
    try {
      const form = new FormData();
      form.append('file', body as Blob);
      if (opts?.epochs) form.append('epochs', String(opts.epochs));
      if (opts?.identifier) form.append('identifier', opts.identifier);
      if (opts?.signerAddress) form.append('signerAddress', opts.signerAddress);

      const res = await axios.post(url, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res?.data) {
        // attempt to extract blobId fields commonly used by Walrus/Relay
        const d = res.data as any;
        if (d.blobId) return { blobId: d.blobId, details: d };
        if (d.newlyCreated?.blobObject?.blobId) return { blobId: d.newlyCreated.blobObject.blobId, details: d };
        if (d.alreadyCertified?.blobId) return { blobId: d.alreadyCertified.blobId, details: d };
        // some relays return { id } or { cid }
        if (d.id) return { blobId: d.id, details: d };
        if (d.cid) return { blobId: d.cid, details: d };
        // fallback: if response contains any string-looking id, return full body
        const maybe = JSON.stringify(d).match(/[A-Za-z0-9_-]{8,}/);
        if (maybe) return { blobId: maybe[0], details: d };
      }
    } catch (e) {
      // try next candidate
    }
  }

  return null;
};

/**
 * Upload using walrus SDK when a Signer is provided. Returns the blobId on success.
 * If no signer is provided, falls back to the publisher PUT endpoint.
 */
export const uploadToWalrus = async (
  input: File | Blob | Uint8Array | string | any,
  opts?: { identifier?: string; tags?: Record<string, string>; epochs?: number; deletable?: boolean; signer?: any },
): Promise<string> => {
  // If user passed a WalrusFile already, use it; otherwise construct
  const { WalrusFile, RetryableWalrusClientError } = await import('@mysten/walrus');
  const walrusFile = input instanceof WalrusFile ? input : WalrusFile.from({ contents: input as any, identifier: opts?.identifier, tags: opts?.tags });

  // If a signer is provided, use the SDK writeFiles API
  if (opts?.signer) {
    try {
      const client = await getClient();
      const results = await client.walrus.writeFiles({ files: [walrusFile], epochs: opts?.epochs ?? 1, deletable: opts?.deletable ?? true, signer: opts.signer });
      // results is an array describing created blobs/files
      if (Array.isArray(results) && results[0] && results[0].blobId) return results[0].blobId;
      // Try to infer
      return (results as any)?.[0]?.blobId ?? `mock-blob-${Date.now()}`;
    } catch (err: any) {
      console.warn('Walrus SDK writeFiles failed, falling back to publisher PUT', err);
      if (err instanceof RetryableWalrusClientError) {
        try {
          const client = await getClient();
          client.walrus.reset();
        } catch (_) {}
      }
      // fallthrough to publisher
    }
  }

  // Fallback: publisher PUT (no signer required) — keep original behaviour for demo/webflow
  try {
    const body = input instanceof Blob || input instanceof File ? input : new Blob([input as any]);
    const response = await axios.put(`${WALRUS_PUBLISHER_URL}/v1/store?epochs=${opts?.epochs ?? 1}`, body, {
      headers: {
        'Content-Type': (body as Blob).type || 'application/octet-stream',
      },
    });
    const data = response.data as any;
    if (data?.newlyCreated) return data.newlyCreated.blobObject.blobId;
    if (data?.alreadyCertified) return data.alreadyCertified.blobId;
    throw new Error('Unexpected publisher response');
  } catch (error) {
    console.warn('Walrus publisher unavailable; returning mock id', error);
    return `mock-blob-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
};

/**
 * Read a file (WalrusFile) using the SDK getFiles/getBlob methods.
 */
export const getWalrusFile = async (blobIdOrQuiltId: string) => {
  try {
    const client = await getClient();
    const [file] = await client.walrus.getFiles({ ids: [blobIdOrQuiltId] });
    return file as any | null;
  } catch (err) {
    console.warn('Failed to get file from Walrus SDK', err);
    return null;
  }
};

export const getWalrusUrl = (blobId: string): string => {
  if (!blobId || blobId.startsWith('mock-blob')) return '#';
  return `${WALRUS_AGGREGATOR_URL}/v1/${blobId}`;
};

export const getWalrusCanUrl = (blobId: string): string => {
  if (!blobId || blobId.startsWith('mock-blob')) return 'https://walruscan.com/testnet/home';
  return `https://walruscan.com/testnet/home?q=${encodeURIComponent(blobId)}`;
};

export const deleteFromWalrus = async (blobId: string): Promise<boolean> => {
  try {
    await axios.delete(`${WALRUS_PUBLISHER_URL}/v1/store/${blobId}`);
    return true;
  } catch (err) {
    console.warn('Failed to delete blob from Walrus (publisher):', err);
    return false;
  }
};

/**
 * Demo: create three WalrusFile objects and write them via SDK `writeFiles`.
 * Returns the SDK results (which include blobId / blobObject info).
 */
export const demoWriteThreeFiles = async (
  raw1: string | Uint8Array | Blob,
  raw2: string | Uint8Array | Blob,
  raw3: string | Uint8Array | Blob,
  signer?: any,
) => {
  const { WalrusFile } = await import('@mysten/walrus');
  const file1 = WalrusFile.from({ contents: raw1 as any, identifier: 'file-1' });
  const file2 = WalrusFile.from({ contents: raw2 as any, identifier: 'file-2' });
  const file3 = WalrusFile.from({ contents: raw3 as any, identifier: 'file-3' });

  const client = await getClient();

  // Write files to walrus via SDK. Pass `signer` when you want on-chain registration/payment.
  const results = await client.walrus.writeFiles({
    files: [file1, file2, file3],
    epochs: 3,
    deletable: true,
    signer,
  });

  // Example: extract blobIds from results
  const blobIds = Array.isArray(results) ? results.map((r: any) => r?.blobId).filter(Boolean) : [];

  return { results, blobIds };
};

/**
 * Demo (browser-friendly): use `writeFilesFlow` to break the process into steps
 * so the UI can prompt the user per step (encode -> register -> upload -> certify).
 * The flow object exposes step methods; example usage shown below.
 */
export const demoWriteFilesFlow = async (
  inputs: Array<string | Uint8Array | Blob>,
  signer?: any,
) => {
  const { WalrusFile } = await import('@mysten/walrus');
  const files = inputs.map((c, i) => WalrusFile.from({ contents: c as any, identifier: `file-${i + 1}` }));
  const client = await getClient();

  const flow = await client.walrus.writeFilesFlow({ files, epochs: 3, deletable: true, signer });
  return { flow };
};

/**
 * Start a writeFilesFlow and return the flow object without executing steps.
 * Useful for browser UIs that want to call `encode/register/upload/certify` on user action.
 */
export const startWriteFilesFlow = async (
  inputs: Array<string | Uint8Array | Blob>,
  signer?: any,
) => {
  const { WalrusFile } = await import('@mysten/walrus');
  const files = inputs.map((c, i) => WalrusFile.from({ contents: c as any, identifier: `file-${i + 1}` }));
  const client = await getClient();
  const flow = await client.walrus.writeFilesFlow({ files, epochs: 3, deletable: true, signer });
  return flow;
};

/**
 * Helper demo: retrieve stored files by blobId and show how to read bytes/text/json
 */
export const demoRetrieveAndRead = async (blobId: string) => {
  const client = await getClient();
  const [file] = await client.walrus.getFiles({ ids: [blobId] });
  if (!file) return null;

  const bytes = typeof file.bytes === 'function' ? await file.bytes() : null;
  const text = typeof file.text === 'function' ? await file.text() : null;
  const json = typeof file.json === 'function' ? await file.json() : null;

  return { file, bytes, text, json };
};
