import React, { useState, useRef } from "react";
import {
  getWalrusUrl,
  demoRetrieveAndRead,
  uploadToWalrus,
  simulateUploadTransaction,
} from "../services/walrusService";

const WalrusUploadDemo: React.FC = () => {
  const [selected, setSelected] = useState<File[]>([]);
  const [fileStates, setFileStates] = useState<
    {
      name: string;
      size: number;
      status: string;
      progress: number;
    }[]
  >([]);
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<any>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planModalSim, setPlanModalSim] = useState<any | null>(null);
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | null>(null);
  const planResolveRef = useRef<
    ((value: { proceed: boolean; planKey?: string }) => void) | null
  >(null);

  const addLog = (m: string) =>
    setLogs((l) => [...l, `${new Date().toLocaleTimeString()}: ${m}`]);

  const onChoose = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setSelected(files);
    addLog(`Selected ${files.length} file(s)`);
    setFileStates(
      files.map((f) => ({
        name: f.name,
        size: f.size,
        status: "ready",
        progress: 0,
      })),
    );
  };

  const uploadAndProcessFiles = async () => {
    if (selected.length === 0) {
      addLog("Please select files to upload.");
      return;
    }

    addLog(`Starting simple upload for ${selected.length} file(s)...`);
    setOverallProgress(0);
    const uploadedFiles: any[] = [];

    for (let i = 0; i < selected.length; i++) {
      const file = selected[i];
      const fileIndex = i;
      let sim: any = null;
      let chosenPlanKey: string | undefined = undefined;
      try {
        // Simulate transaction and show estimated cost
        try {
          sim = await simulateUploadTransaction(file.size, { epochs: 1 });
          // Open modal to choose plan and confirm
          const choice = await new Promise<{
            proceed: boolean;
            planKey?: string;
          }>((resolve) => {
            setPlanModalSim(sim);
            setSelectedPlanKey(
              sim.recommended?.key ??
                (sim.bundles && sim.bundles[0]?.key) ??
                null,
            );
            setPlanModalOpen(true);
            planResolveRef.current = resolve;
          });
          setPlanModalOpen(false);
          setPlanModalSim(null);
          planResolveRef.current = null;
          if (!choice || !choice.proceed) {
            addLog(`User cancelled upload for ${file.name}`);
            setFileStates((s) =>
              s.map((f, idx) =>
                idx === fileIndex ? { ...f, status: "cancelled" } : f,
              ),
            );
            continue;
          }
          // choice.planKey contains the selected plan
          chosenPlanKey = choice.planKey;
        } catch (e) {
          // If simulation fails, continue with upload but log
          addLog(
            `Price simulation failed, proceeding with upload for ${file.name}`,
          );
        }

        setFileStates((s) =>
          s.map((f, idx) =>
            idx === fileIndex ? { ...f, status: "uploading" } : f,
          ),
        );
        addLog(`Uploading ${file.name}...`);

        // Use the simplified upload function which does not require a signer
        const planToSend = chosenPlanKey ?? selectedPlanKey ?? undefined;
        const blobId = await uploadToWalrus(file, {
          identifier: file.name,
          plan: planToSend,
        });

        addLog(`Successfully uploaded ${file.name}. Blob ID: ${blobId}`);
        uploadedFiles.push({ name: file.name, blobId, sim });
        setFileStates((s) =>
          s.map((f, idx) =>
            idx === fileIndex ? { ...f, status: "uploaded", progress: 100 } : f,
          ),
        );
        const newProgress = Math.round(((i + 1) / selected.length) * 100);
        setOverallProgress(newProgress);
      } catch (error: any) {
        console.error(`Upload failed for ${file.name}:`, error);
        addLog(`Error uploading ${file.name}: ${error.message}`);
        setFileStates((s) =>
          s.map((f, idx) =>
            idx === fileIndex ? { ...f, status: "error" } : f,
          ),
        );
      }
    }

    setResults(uploadedFiles);
    addLog("Process complete. Results available.");
    setOverallProgress(100);
  };

  const onRetrieve = async (blobId: string) => {
    addLog(`Retrieving blob ${blobId}`);
    try {
      const r = await demoRetrieveAndRead(blobId);
      console.log("retrieved", r);
      addLog("Retrieved. See console for content preview.");
      setResults((prev: any) => ({ ...prev, retrieved: r }));
    } catch (e: any) {
      addLog("Retrieve failed: " + String(e));
    }
  };

  return (
    <details
      className="mb-6 rounded-lg border border-slate-200 bg-white p-0 shadow-sm"
      open
    >
      <summary className="px-4 py-3 cursor-pointer text-sm font-medium bg-gray-50 border-b border-slate-100">
        Walrus Flow Demo (click to toggle)
      </summary>
      <div className="p-4">
        <h4 className="mb-2 text-lg font-semibold">Walrus Flow Demo</h4>
        <div className="flex gap-2">
          <input type="file" multiple onChange={onChoose} />
          <button
            onClick={uploadAndProcessFiles}
            className="rounded bg-slate-800 px-3 py-1 text-white"
          >
            Upload Files
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="col-span-1">
            <h5 className="mb-2 font-medium">Selected</h5>
            <ul className="max-h-40 overflow-y-auto text-sm">
              {selected.map((f) => (
                <li key={f.name} className="mb-1">
                  {f.name} — {f.size} bytes (
                  {fileStates.find((s) => s.name === f.name)?.status || "ready"}
                  )
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-1">
            <h5 className="mb-2 font-medium">Logs</h5>
            <div className="max-h-40 overflow-y-auto rounded bg-slate-50 p-2 text-xs">
              {logs.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          </div>
        </div>

        {overallProgress > 0 && overallProgress < 100 && (
          <div className="mt-4">
            <h5 className="mb-2 font-medium">Overall Progress</h5>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${overallProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {results && (
          <div className="mt-4">
            <h5 className="mb-2 font-medium">Results</h5>
            <pre className="max-h-48 overflow-auto text-xs">
              {JSON.stringify(results, null, 2)}
            </pre>
            {Array.isArray(results) && (
              <div className="mt-2 space-y-2 text-sm">
                {results.map((r: any) => (
                  <div
                    key={r.blobId || r.name}
                    className="rounded border border-gray-100 p-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-slate-600">{r.name}</div>
                      <div className="text-xs">
                        <a
                          className="text-indigo-600"
                          href={getWalrusUrl(r.blobId)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                        </a>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Blob: {r.blobId}
                    </div>
                    {r.sim && (
                      <div className="mt-2 text-xs text-slate-700">
                        <div>
                          Chosen plan:{" "}
                          <strong>
                            {r.sim.recommended?.name || r.sim.recommended?.key}
                          </strong>
                        </div>
                        <div className="mt-1">
                          Estimated:{" "}
                          {r.sim.totalEstimatedSUI
                            ? `${r.sim.totalEstimatedSUI} SUI`
                            : ""}{" "}
                          {r.sim.totalEstimatedSUI ? " (≈ " : ""}
                          {r.sim.totalEstimatedSUI
                            ? `$${r.sim.totalEstimatedUSD}`
                            : ""}
                          {r.sim.totalEstimatedSUI ? ")" : ""}
                        </div>
                      </div>
                    )}
                    <div className="mt-2">
                      <button
                        onClick={() => onRetrieve(r.blobId)}
                        className="rounded bg-slate-200 px-2 py-1 text-xs"
                      >
                        Retrieve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {planModalOpen && planModalSim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-lg rounded bg-white p-4">
              <h4 className="mb-2 text-lg font-semibold">Choose a plan</h4>
              <div className="max-h-64 overflow-y-auto">
                {planModalSim.bundles && planModalSim.bundles.length > 0 ? (
                  <div className="space-y-2">
                    {planModalSim.bundles.map((b: any) => (
                      <label
                        key={b.key}
                        className="flex items-center gap-3 rounded border p-2"
                      >
                        <input
                          type="radio"
                          name="plan"
                          checked={selectedPlanKey === b.key}
                          onChange={() => setSelectedPlanKey(b.key)}
                        />
                        <div className="flex-1 text-sm">
                          <div className="font-medium">{b.name}</div>
                          <div className="text-xs text-slate-600">
                            {b.priceUSD ? `$${b.priceUSD}` : "—"}{" "}
                            {b.priceSUI ? `(${b.priceSUI} SUI)` : ""}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-600">
                    No plans available
                  </div>
                )}
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  className="rounded border px-3 py-1 text-sm"
                  onClick={() => {
                    planResolveRef.current &&
                      planResolveRef.current({ proceed: false });
                    setPlanModalOpen(false);
                    setPlanModalSim(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="rounded bg-slate-800 px-3 py-1 text-sm text-white"
                  onClick={() => {
                    planResolveRef.current &&
                      planResolveRef.current({
                        proceed: true,
                        planKey: selectedPlanKey ?? undefined,
                      });
                    setPlanModalOpen(false);
                    setPlanModalSim(null);
                  }}
                >
                  Proceed
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </details>
  );
};

export default WalrusUploadDemo;
