import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { Cloud, Lock, Shield } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { loginWithGoogle, currentUser, mockLogin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (currentUser) {
      router.push('/');
    }
  }, [currentUser, router]);

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/40 bg-white/20 p-8 shadow-2xl backdrop-blur-xl transition-all hover:bg-white/30 hover:shadow-sui-300/20">
        
        {/* Decorative Circles */}
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-sui-400/30 blur-2xl"></div>
        <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-purple-400/30 blur-2xl"></div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-sui-400 to-sui-600 shadow-lg">
            <Cloud className="h-10 w-10 text-white" />
          </div>

          <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-800">
            SuiCloud
          </h1>
          <p className="mb-8 text-sm font-medium text-slate-600/80">
            Decentralized storage on the Walrus Protocol.
            <br />
            Secure. Permanent. Yours.
          </p>

          <div className="flex w-full flex-col gap-4">
            <button
              onClick={() => loginWithGoogle()}
              className="group flex w-full items-center justify-center gap-3 rounded-xl bg-white/60 px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:shadow-md active:scale-95"
            >
              <img 
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                alt="Google" 
                className="h-5 w-5" 
              />
              Continue with Google
            </button>

            <button
              onClick={() => mockLogin()} // Fallback for demo
              className="group flex w-full items-center justify-center gap-3 rounded-xl bg-sui-600/90 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sui-500/30 backdrop-blur-md transition-all hover:bg-sui-500 hover:shadow-sui-500/50 active:scale-95"
            >
              <Lock className="h-4 w-4" />
              Demo Access (No Keys)
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Shield className="h-3 w-3" />
            <span>Secured by Firebase & Walrus Protocol</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;