import React, { useState } from "react";
import {
  getWalrusUrl,
  demoRetrieveAndRead,
  uploadToWalrus,
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
      try {
        setFileStates((s) =>
          s.map((f, idx) =>
            idx === fileIndex ? { ...f, status: "uploading" } : f,
          ),
        );
        addLog(`Uploading ${file.name}...`);

        // Use the simplified upload function which does not require a signer
        const blobId = await uploadToWalrus(file, { identifier: file.name });

        addLog(`Successfully uploaded ${file.name}. Blob ID: ${blobId}`);
        uploadedFiles.push({ name: file.name, blobId });
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
              <div className="mt-2">
                {results
                  .map((r: any) => r?.blobId)
                  .filter(Boolean)
                  ?.map((id: string) => (
                    <div key={id} className="flex items-center gap-2">
                      <a
                        className="text-indigo-600"
                        href={getWalrusUrl(id)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open {id}
                      </a>
                      <button
                        onClick={() => onRetrieve(id)}
                        className="rounded bg-slate-200 px-2 py-1 text-xs"
                      >
                        Retrieve
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </details>
  );
};

export default WalrusUploadDemo;
