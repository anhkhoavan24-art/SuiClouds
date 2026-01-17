import React, { useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import FileGrid from "../components/FileGrid";
import { useAuth } from "../contexts/AuthContext";
import { Search, Bell, UploadCloud } from "lucide-react";
import { StoredFile, FileType } from "../types";
import { uploadToWalrus, getWalrusUrl, deleteFromWalrus } from "../services/walrusService";

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
      };

      setFiles((prev) => [newFile, ...prev]);
    } catch (error) {
      console.error("Critical Upload process failed:", error);
      alert("Failed to upload file.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
          <div className="flex items-center gap-4 rounded-xl border border-white/30 bg-white/20 px-4 py-2 backdrop-blur-md transition-all focus-within:bg-white/40 focus-within:shadow-md">
            <Search className="h-5 w-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search in Drive"
              className="bg-transparent text-sm text-slate-800 placeholder-slate-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="rounded-full bg-white/20 p-2 text-slate-600 hover:bg-white/40">
              <Bell className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 rounded-full bg-white/30 p-1 pl-4 pr-1 backdrop-blur-md">
              <span className="text-sm font-semibold text-slate-700">
                {currentUser?.displayName || "User"}
              </span>
              <img
                src={currentUser?.photoURL || "https://picsum.photos/200"}
                alt="Profile"
                className="h-8 w-8 rounded-full border border-white shadow-sm"
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
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sui-600 to-sui-400 p-8 text-white shadow-xl">
              <div className="relative z-10">
                <h3 className="text-xl font-bold">
                  Secure Decentralized Storage
                </h3>
                <p className="mt-2 max-w-lg text-sui-50 opacity-90">
                  Your files are stored permanently on the Walrus Protocol.
                  Experience the future of cloud storage with zero compromises.
                </p>
                <button
                  onClick={handleUploadClick}
                  className="mt-6 rounded-lg bg-white px-5 py-2 text-sm font-bold text-sui-600 shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                  Start Uploading
                </button>
              </div>
              <CloudDecoration />
            </div>
          </div>

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
            onToggleStar={(id: string) => {
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === id ? { ...f, starred: !f.starred } : f,
                ),
              );
            }}
            onTrash={(id: string) => {
              setFiles((prev) =>
                prev.map((f) => (f.id === id ? { ...f, trashed: true } : f)),
              );
            }}
            onRestore={(id: string) => {
              setFiles((prev) =>
                prev.map((f) => (f.id === id ? { ...f, trashed: false } : f)),
              );
            }}
            onDeletePermanent={async (id: string) => {
              // Find file to get blobId
              const target = files.find((f) => f.id === id);
              if (!target) return;

              const confirmed = window.confirm(
                'Permanently delete this file? This action cannot be undone.'
              );
              if (!confirmed) return;

              // Attempt to delete from Walrus (best-effort); remove locally regardless
              try {
                if (target.blobId) {
                  await deleteFromWalrus(target.blobId);
                }
              } catch (err) {
                console.warn('Permanent delete failed at network level', err);
              }

              setFiles((prev) => prev.filter((f) => f.id !== id));
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
