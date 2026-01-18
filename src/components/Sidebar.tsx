import React from "react";
import {
  Cloud,
  HardDrive,
  Clock,
  Star,
  Trash2,
  Settings,
  LogOut,
  Plus,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const navItems = [
  { icon: HardDrive, key: "mydrive", label: "My Drive" },
  { icon: Clock, key: "recent", label: "Recent" },
  { icon: Star, key: "starred", label: "Starred" },
  { icon: Trash2, key: "trash", label: "Trash" },
];

const Sidebar: React.FC<{
  onUploadClick: () => void;
  currentView: string;
  onNavigate: (view: string) => void;
}> = ({ onUploadClick, currentView, onNavigate }) => {
  const { logout } = useAuth();
  return (
    <div className="hidden h-full w-48 flex-col justify-between border-r border-gray-100 bg-white/10 md:flex">
      <div className="p-6">
        <div className="mb-6 flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sui-600 text-white">
            <Cloud className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-slate-800 hidden md:block">
            SuiCloud
          </span>
        </div>

        <button
          onClick={onUploadClick}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-md bg-white/90 py-2 text-sm font-medium text-sui-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden md:inline">Upload</span>
        </button>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = currentView === item.key;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sui-100/50 text-sui-800"
                    : "text-slate-600 hover:bg-white/30 hover:text-slate-900"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${active ? "text-sui-600" : "text-slate-500"}`}
                />
                <span className="hidden md:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-6">
        <div className="mb-4 p-2 text-sm text-slate-600">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Storage</span>
            <span>75%</span>
          </div>
        </div>

        <div className="space-y-1 border-t border-gray-100 pt-4">
          <button className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white/30 hover:text-slate-900">
            <Settings className="h-4 w-4 text-slate-500" />
            Settings
          </button>
          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50/50"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
