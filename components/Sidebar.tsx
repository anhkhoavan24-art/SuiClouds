import React from 'react';
import { 
  Cloud, 
  HardDrive, 
  Clock, 
  Star, 
  Trash2, 
  Settings, 
  LogOut,
  Plus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Sidebar: React.FC<{ onUploadClick: () => void }> = ({ onUploadClick }) => {
  const { logout } = useAuth();
  
  const navItems = [
    { icon: HardDrive, label: 'My Drive', active: true },
    { icon: Clock, label: 'Recent', active: false },
    { icon: Star, label: 'Starred', active: false },
    { icon: Trash2, label: 'Trash', active: false },
  ];

  return (
    <div className="hidden h-full w-64 flex-col justify-between border-r border-white/20 bg-white/20 backdrop-blur-xl md:flex">
      <div className="p-6">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sui-500 to-sui-700 text-white shadow-md">
            <Cloud className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">SuiCloud</span>
        </div>

        <button 
          onClick={onUploadClick}
          className="mb-8 flex w-full items-center justify-center gap-2 rounded-xl bg-white/60 py-3 text-sm font-semibold text-sui-700 shadow-sm transition-all hover:bg-white hover:shadow-md active:scale-95"
        >
          <Plus className="h-5 w-5" />
          <span>New Upload</span>
        </button>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                item.active 
                  ? 'bg-sui-100/50 text-sui-800' 
                  : 'text-slate-600 hover:bg-white/30 hover:text-slate-900'
              }`}
            >
              <item.icon className={`h-4 w-4 ${item.active ? 'text-sui-600' : 'text-slate-500'}`} />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        <div className="mb-4 rounded-xl bg-sui-50/50 p-4">
          <div className="mb-2 flex justify-between text-xs font-medium text-slate-500">
            <span>Storage</span>
            <span>75% used</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-sui-200">
            <div className="h-1.5 w-3/4 rounded-full bg-sui-500"></div>
          </div>
          <div className="mt-2 text-xs text-slate-400">15 GB of 20 GB used</div>
        </div>

        <div className="space-y-1 border-t border-white/20 pt-4">
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