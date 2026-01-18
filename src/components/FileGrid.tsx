import React from "react";
import { StoredFile, FileType } from "../types";
import {
  FileText,
  Image,
  Video,
  MoreVertical,
  File,
  Star,
  Trash2,
  CornerUpLeft,
} from "lucide-react";
import { getWalrusUrl } from "../services/walrusService";

interface FileGridProps {
  files: StoredFile[];
  onToggleStar?: (id: string) => void;
  onTrash?: (id: string) => void;
  onRestore?: (id: string) => void;
  onDeletePermanent?: (id: string) => void;
}

const FileGrid: React.FC<FileGridProps> = ({
  files,
  onToggleStar,
  onTrash,
  onRestore,
}) => {
  const getIcon = (type: FileType) => {
    switch (type) {
      case FileType.IMAGE:
        return <Image className="h-8 w-8 text-purple-500" />;
      case FileType.VIDEO:
        return <Video className="h-8 w-8 text-red-500" />;
      case FileType.DOCUMENT:
        return <FileText className="h-8 w-8 text-blue-500" />;
      default:
        return <File className="h-8 w-8 text-slate-500" />;
    }
  };

  const openFile = (file: StoredFile) => {
    if (file.trashed) return; // don't open trashed files
    const url = file.url || getWalrusUrl(file.blobId);
    window.open(url, "_blank");
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {files.map((file) => (
        <div
          key={file.id}
          onClick={() => openFile(file)}
          className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-white/40 bg-white/40 p-3 shadow-sm backdrop-blur-md transition-all hover:-translate-y-1 hover:bg-white/60 hover:shadow-lg"
        >
          {/* Star Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar && onToggleStar(file.id);
            }}
            className="absolute right-3 top-3 z-20 rounded-full bg-white/40 p-1 text-slate-600 hover:bg-white"
            aria-label="Toggle Star"
          >
            <Star
              className={`h-4 w-4 ${file.starred ? "text-yellow-400" : "text-slate-400"}`}
            />
          </button>
          {/* File Preview Area */}
          <div className="mb-3 flex h-32 w-full items-center justify-center rounded-lg bg-sui-50/50 transition-colors group-hover:bg-sui-100/50 overflow-hidden">
            {file.type === FileType.IMAGE && file.url ? (
              <img
                src={file.url}
                alt={file.name}
                className="h-full w-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-500"
              />
            ) : (
              getIcon(file.type)
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-slate-700">
                {file.name}
              </span>
              <span className="text-xs text-slate-500">
                {(file.size / 1024).toFixed(1)} KB
              </span>
            </div>
            <div className="flex items-center gap-2">
              {file.trashed ? (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore && onRestore(file.id);
                    }}
                    className="rounded-full p-1 text-slate-400 hover:bg-slate-200/50 hover:text-slate-600"
                  >
                    <CornerUpLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const ok = window.confirm(
                        "Permanently delete this file? This cannot be undone.",
                      );
                      if (!ok) return;
                      onDeletePermanent && onDeletePermanent(file.id);
                    }}
                    title="Delete permanently"
                    className="rounded-full p-1 text-red-500 hover:bg-red-50/50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTrash && onTrash(file.id);
                  }}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-200/50 hover:text-slate-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button className="rounded-full p-1 text-slate-400 hover:bg-slate-200/50 hover:text-slate-600">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FileGrid;
