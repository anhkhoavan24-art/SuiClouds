import React, { useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import FileGrid from "../components/FileGrid";
import { useAuth } from "../contexts/AuthContext";
import { Search, Bell, UploadCloud } from "lucide-react";
import { StoredFile, FileType } from "../types";
import {
  uploadToWalrus,
  getWalrusUrl,
  deleteFromWalrus,
  getWalrusCanUrl,
} from "../services/walrusService";
import WalrusUploadDemo from "../components/WalrusUploadDemo";
import {
  getAllFilesFromDB,
  addFileToDB,
  updateFileInDB,
  deleteFileFromDB,
} from "../services/dbService";

// Mock initial data
const INITIAL_FILES: StoredFile[] = [
  {
    id: "1",
    blobId: "mock-blob-1",
    name: "Project Specs.pdf",
    size: 2048,
    type: FileType.DOCUMENT,
    uploadDate: new Date(),
    starred: false,
    trashed: false,
  },
  {
    id: "2",
    blobId: "mock-blob-2",
    name: "Sui Logo.png",
    size: 512,
    type: FileType.IMAGE,
    uploadDate: new Date(),
    url: "https://cryptologos.cc/logos/sui-sui-logo.png",
    starred: true,
    trashed: false,
  },
  {
    id: "3",
    blobId: "mock-blob-3",
    name: "Vacation.jpg",
    size: 4096,
    type: FileType.IMAGE,
    uploadDate: new Date(),
    url: "https://picsum.photos/400/300",
    starred: false,
    trashed: false,
  },
  {
    id: "4",
    blobId: "mock-blob-4",
    name: "Demo Reel.mp4",
    size: 15000,
    type: FileType.VIDEO,
    uploadDate: new Date(),
    starred: false,
    trashed: false,
  },
];

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [files, setFiles] = useState<StoredFile[]>(INITIAL_FILES);
  const [view, setView] = useState<string>("recent");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // 1. Upload to Walrus (Service now handles fallbacks gracefully)
      const blobId = await uploadToWalrus(file);

      // 2. Determine Type
      let type = FileType.OTHER;
      if (file.type.startsWith("image/")) type = FileType.IMAGE;
      else if (file.type.startsWith("video/")) type = FileType.VIDEO;
      else if (file.type.includes("pdf")) type = FileType.DOCUMENT;

      // 3. Create Local Record
      const newFile: StoredFile = {
        id: Date.now().toString(),
        blobId: blobId,
        name: file.name,
        size: file.size,
        type: type,
        uploadDate: new Date(),
        starred: false,
        trashed: false,
        // Create object URL for immediate preview
        url: URL.createObjectURL(file),
        // set aggregator direct access and walruscan explorer link
        walrusUrl: getWalrusUrl(blobId),
        explorerUrl: getWalrusCanUrl(blobId),
      };

      // persist to DB
      await addFileToDB(newFile);
      setFiles((prev) => [newFile, ...prev]);
    } catch (error) {
      console.error("Critical Upload process failed:", error);
      alert("Failed to upload file.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Load files from IndexedDB on mount
  React.useEffect(() => {
    (async () => {
      try {
        const stored = await getAllFilesFromDB();
        if (stored && stored.length > 0) {
          setFiles(
            stored.sort(
              (a, b) => +new Date(b.uploadDate) - +new Date(a.uploadDate),
            ),
          );
        } else {
          // seed initial files into DB
          for (const f of INITIAL_FILES) {
            try {
              await addFileToDB(f);
            } catch (e) {
              // ignore individual errors
            }
          }
          setFiles(INITIAL_FILES);
        }
      } catch (err) {
        console.warn("Failed to load from DB, using memory state", err);
      }
    })();
  }, []);

  return (
    <div className="flex h-full w-full">
      {/* Hidden Input for Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      <Sidebar
        onUploadClick={handleUploadClick}
        currentView={view}
        onNavigate={(v) => setView(v)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-20 items-center justify-between px-8 pt-4">
          <div className="flex items-center gap-3 rounded-md border border-gray-100 bg-white px-3 py-2 transition-all">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search in Drive"
              className="bg-transparent text-sm text-slate-800 placeholder-slate-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications intentionally minimized for a cleaner UI */}
            <div className="flex items-center gap-3 rounded-full bg-white/30 p-1 pl-4 pr-1 backdrop-blur-md">
              <span className="text-sm font-semibold text-slate-700">
                {currentUser?.displayName || "User"}
              </span>
              <img
                src={currentUser?.photoURL || "https://picsum.photos/200"}
                alt="Profile"
                className="h-7 w-7 rounded-full border border-gray-100"
              />
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mb-8">
            <h2 className="mb-4 text-2xl font-bold text-slate-800">
              Welcome to SuiCloud
            </h2>
            <div className="relative overflow-hidden rounded-lg bg-white/80 p-6 text-slate-800 border border-gray-100">
              <div className="relative z-10">
                <h3 className="text-lg font-semibold">
                  Secure Decentralized Storage
                </h3>
                <p className="mt-2 max-w-lg text-slate-600">
                  Files stored on Walrus Protocol. Simple, durable, and private.
                </p>
                <button
                  onClick={handleUploadClick}
                  className="mt-4 rounded-md bg-sui-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Start Uploading
                </button>
              </div>
            </div>
          </div>

          {/* Demo UI for interactive walrus writeFilesFlow */}
          <WalrusUploadDemo />

          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-700">
              {view === "recent"
                ? "Recent Files"
                : view === "starred"
                  ? "Starred"
                  : view === "trash"
                    ? "Trash"
                    : "My Drive"}
            </h3>
            <div className="flex gap-2">
              {/* Sort/Filter options could go here */}
            </div>
          </div>

          {isUploading && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-sui-200 bg-sui-50 p-4 text-sui-700 animate-pulse">
              <UploadCloud className="h-6 w-6 animate-bounce" />
              <span className="font-medium">
                Uploading to Walrus Protocol...
              </span>
            </div>
          )}

          <FileGrid
            files={(() => {
              if (view === "recent")
                return [...files]
                  .filter((f) => !f.trashed)
                  .sort(
                    (a, b) => +new Date(b.uploadDate) - +new Date(a.uploadDate),
                  );
              if (view === "starred")
                return files.filter((f) => f.starred && !f.trashed);
              if (view === "trash") return files.filter((f) => f.trashed);
              return files.filter((f) => !f.trashed);
            })()}
            onToggleStar={async (id: string) => {
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === id ? { ...f, starred: !f.starred } : f,
                ),
              );
              try {
                const target = files.find((f) => f.id === id);
                if (target)
                  await updateFileInDB(id, { starred: !target.starred });
              } catch (e) {
                console.warn("Failed to persist star state", e);
              }
            }}
            onTrash={async (id: string) => {
              setFiles((prev) =>
                prev.map((f) => (f.id === id ? { ...f, trashed: true } : f)),
              );
              try {
                await updateFileInDB(id, { trashed: true });
              } catch (e) {
                console.warn("Failed to persist trash state", e);
              }
            }}
            onRestore={async (id: string) => {
              setFiles((prev) =>
                prev.map((f) => (f.id === id ? { ...f, trashed: false } : f)),
              );
              try {
                await updateFileInDB(id, { trashed: false });
              } catch (e) {
                console.warn("Failed to persist restore state", e);
              }
            }}
            onDeletePermanent={async (id: string) => {
              const target = files.find((f) => f.id === id);
              console.debug(
                "[Dashboard] Attempting permanent delete id=",
                id,
                "blobId=",
                target?.blobId,
              );
              try {
                if (target?.blobId) {
                  await deleteFromWalrus(target.blobId);
                }
              } catch (err) {
                console.warn("Permanent delete failed at network level", err);
              }

              try {
                const ok = await deleteFileFromDB(id);
                console.debug("[Dashboard] deleteFileFromDB returned", ok);
              } catch (e) {
                console.warn("Failed to remove from local DB", e);
              }

              // Refresh local state from DB to ensure consistency
              try {
                const remaining = await getAllFilesFromDB();
                console.debug(
                  "[Dashboard] reloaded files count=",
                  remaining.length,
                );
                setFiles(
                  remaining.sort(
                    (a, b) => +new Date(b.uploadDate) - +new Date(a.uploadDate),
                  ),
                );
              } catch (e) {
                // Fallback: update in-memory state if DB read fails
                console.warn("Failed to reload files from DB after delete", e);
                setFiles((prev) => prev.filter((f) => f.id !== id));
              }

              // Refresh local state from DB to ensure consistency
              try {
                const remaining = await getAllFilesFromDB();
                setFiles(
                  remaining.sort(
                    (a, b) => +new Date(b.uploadDate) - +new Date(a.uploadDate),
                  ),
                );
              } catch (e) {
                // Fallback: update in-memory state if DB read fails
                console.warn("Failed to reload files from DB after delete", e);
                setFiles((prev) => prev.filter((f) => f.id !== id));
              }
            }}
          />
        </main>
      </div>
    </div>
  );
};

// Decorative Component
const CloudDecoration = () => (
  <>
    <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
    <div className="absolute -bottom-20 right-20 h-48 w-48 rounded-full bg-purple-500/20 blur-3xl"></div>
  </>
);

export default Dashboard;
