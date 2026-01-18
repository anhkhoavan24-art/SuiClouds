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
 * Create an approachable bundle of pricing packages for a given size/epochs.
 * Tries the relay price endpoints and falls back to simple USD-per-MB heuristics.
 * Returns an array of packages like { key, name, priceUSD, totalUSD, description }.
 */
export const makePriceBundle = async (sizeBytes: number, epochs = 1) => {
  // Try relay pricing first
  try {
    const quote = await getRelayPriceQuote(sizeBytes, epochs);
    if (quote) {
      // If relay returns structured tiers, map to simple bundle format
      // Common fields might include pricePerEpoch, total, currency. We defensively map.
      if (Array.isArray(quote.tiers) && quote.tiers.length) {
        return quote.tiers.map((t: any) => ({
          key: t.name || t.id || String(t.price || Math.random()),
          name: t.name || 'Plan',
          priceUSD: t.price_usd ?? t.price ?? null,
          totalUSD: (t.price_usd ?? t.price ?? 0) * 1,
          description: t.description || '',
        }));
      }
      // Some relays return a simple price field
      if (quote.price || quote.total) {
        const p = quote.price ?? quote.total;
        return [
          { key: 'relay', name: 'Relay Price', priceUSD: p, totalUSD: p, description: 'Price from relay.wal.app' },
        ];
      }
    }
  } catch (e) {
    // ignore and fallback
  }

  // Fallback heuristic: price per MB per epoch in USD (approachable bundles)
  const mb = Math.max(1, Math.ceil(sizeBytes / 1024 / 1024));
  const basicPerMb = 0.01; // $0.01 / MB / epoch
  const standardPerMb = 0.02;
  const proPerMb = 0.05;

  const basicTotal = Number((mb * basicPerMb * epochs).toFixed(4));
  const standardTotal = Number((mb * standardPerMb * epochs).toFixed(4));
  const proTotal = Number((mb * proPerMb * epochs).toFixed(4));

  return [
    { key: 'basic', name: 'Basic', priceUSD: basicPerMb, totalUSD: basicTotal, description: `Approx ${basicPerMb}$/MB/epoch` },
    { key: 'standard', name: 'Standard', priceUSD: standardPerMb, totalUSD: standardTotal, description: `Approx ${standardPerMb}$/MB/epoch` },
    { key: 'pro', name: 'Pro', priceUSD: proPerMb, totalUSD: proTotal, description: `Approx ${proPerMb}$/MB/epoch` },
  ];
};

// Cache for SUI price
let _cachedSuiUsd: number | null = null;
let _suiPriceFetchedAt = 0;

/**
 * Fetch SUI price in USD (CoinGecko). Cache briefly to avoid repeated network calls.
 * Returns number (USD per SUI) or null on failure.
 */
export const getSuiUsdPrice = async (): Promise<number | null> => {
  const now = Date.now();
  if (_cachedSuiUsd && now - _suiPriceFetchedAt < 60_000) return _cachedSuiUsd;
  try {
    const res = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd');
    const val = res?.data?.sui?.usd;
    if (typeof val === 'number') {
      _cachedSuiUsd = val;
      _suiPriceFetchedAt = now;
      return val;
    }
  } catch (e) {
    // ignore
  }
  return null;
};

/**
 * Build a simulated transaction object describing an upload flow for the UI.
 * The returned object includes a friendly package selection and step breakdown.
 */
export const simulateUploadTransaction = async (sizeBytes: number, opts?: { epochs?: number }) => {
  const epochs = opts?.epochs ?? 1;
  const bundles = await makePriceBundle(sizeBytes, epochs);

  // Pick a default recommended package (Standard)
  const recommended = bundles.find((b: any) => b.key === 'standard') ?? bundles[0];

  const tx = {
    id: `sim-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    sizeBytes,
    sizeMB: Math.max(1, Math.ceil(sizeBytes / 1024 / 1024)),
    epochs,
    bundles,
    recommended,
    steps: [
      { step: 'encode', description: 'Encode file, compute multihash, prepare chunks', feeUSD: 0 },
      { step: 'register', description: 'Register upload intent on relay (optional on-chain step)', feeUSD: Number((recommended.totalUSD * 0.3).toFixed(4)) },
      { step: 'upload', description: 'Upload content to walrus publishers/aggregators', feeUSD: Number((recommended.totalUSD * 0.6).toFixed(4)) },
      { step: 'certify', description: 'Certify the file; finalization step', feeUSD: Number((recommended.totalUSD * 0.1).toFixed(4)) },
    ],
    totalEstimatedUSD: Number((recommended.totalUSD).toFixed(4)),
    // SUI equivalents will be filled below when possible
    totalEstimatedSUI: null as number | null,
    bundlesWithSui: [] as any[],
  };

  // Try to compute SUI equivalents
  try {
    const suiUsd = await getSuiUsdPrice();
    if (suiUsd && suiUsd > 0) {
      const bundlesWithSui = (tx.bundles as any[]).map((b: any) => ({
        ...b,
        priceSui: b.priceUSD != null ? Number((b.priceUSD / suiUsd).toFixed(6)) : null,
        totalSui: b.totalUSD != null ? Number((b.totalUSD / suiUsd).toFixed(6)) : null,
      }));
      tx.bundles = bundlesWithSui;
      tx.bundlesWithSui = bundlesWithSui;
      tx.totalEstimatedSUI = tx.totalEstimatedUSD ? Number((tx.totalEstimatedUSD / suiUsd).toFixed(6)) : null;
      // convert step fees to SUI where applicable
      tx.steps = tx.steps.map((s: any) => ({
        ...s,
        feeSUI: s.feeUSD != null ? Number((s.feeUSD / suiUsd).toFixed(6)) : null,
      }));
      tx.recommended = { ...tx.recommended, totalSui: tx.recommended.totalUSD != null ? Number((tx.recommended.totalUSD / suiUsd).toFixed(6)) : null };
    }
  } catch (e) {
    // ignore conversion failures; USD values remain
  }

  return tx;
};

/**
 * Try to upload via the user-facing relay endpoints. Returns { blobId, details } on success.
 * Tries a few plausible upload endpoints and falls back to null when unavailable.
 */
export const uploadToRelay = async (input: File | Blob | Uint8Array | string, opts?: { epochs?: number; identifier?: string; signerAddress?: string; plan?: string }) => {
  const candidates = [`${WALRUS_RELAY_URL}/v1/upload`, `${WALRUS_RELAY_URL}/v1/store`, `${WALRUS_RELAY_URL}/upload`];

  // normalize body
  const body = input instanceof Blob || input instanceof File ? input : new Blob([input as any]);

  for (const url of candidates) {
    try {
      const form = new FormData();
      form.append('file', body as Blob);
      if (opts?.epochs) form.append('epochs', String(opts.epochs));
      if (opts?.identifier) form.append('identifier', opts.identifier);
      if (opts?.plan) form.append('plan', opts.plan);
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
  opts?: { identifier?: string; tags?: Record<string, string>; epochs?: number; deletable?: boolean; signer?: any; plan?: string },
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
    const planQuery = opts?.plan ? `&plan=${encodeURIComponent(opts.plan)}` : '';
    const response = await axios.put(`${WALRUS_PUBLISHER_URL}/v1/store?epochs=${opts?.epochs ?? 1}${planQuery}`, body, {
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
