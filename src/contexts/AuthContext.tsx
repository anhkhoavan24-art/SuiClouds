import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { 
  initiateGoogleLogin, 
  extractJWTFromUrl, 
  decodeJWT, 
  validateNonce, 
  clearZkLoginSession 
} from '../services/zkLoginService';

interface AuthContextType {
  currentUser: UserProfile | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  mockLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for stored zkLogin user and handle OAuth callback
  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('zklogin_user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
      setLoading(false);
      return;
    }

    // Handle OAuth callback after redirect from Google
    const jwt = extractJWTFromUrl();
    if (jwt) {
      const jwtPayload = decodeJWT(jwt);
      
      if (jwtPayload && validateNonce(jwtPayload)) {
        // Store JWT and user info
        sessionStorage.setItem('zklogin_jwt', jwt);
        
        const zkLoginUser: UserProfile = {
          uid: jwtPayload.sub, // Subject claim is unique identifier
          email: jwtPayload.email || null,
          displayName: jwtPayload.name || null,
          photoURL: jwtPayload.picture || null,
        };
        
        localStorage.setItem('zklogin_user', JSON.stringify(zkLoginUser));
        setCurrentUser(zkLoginUser);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        console.error('JWT validation failed or nonce mismatch');
        clearZkLoginSession();
      }
    }
    
    setLoading(false);
  }, []);

  const loginWithGoogle = async () => {
    try {
      await initiateGoogleLogin();
      // Note: Page will redirect to Google, so this function effectively pauses here
    } catch (error) {
      console.error("zkLogin Google Login Failed:", error);
      alert("zkLogin authentication failed. Using Demo Login.");
      mockLogin();
    }
  };

  const logout = async () => {
    try {
      clearZkLoginSession();
      localStorage.removeItem('zklogin_user');
      setCurrentUser(null);
    } catch (error) {
      console.error("Logout Failed", error);
    }
  };

  // Demo login fallback
  const mockLogin = () => {
    const demoUser: UserProfile = {
      uid: 'demo-123',
      email: 'demo@suicloud.io',
      displayName: 'Demo User',
      photoURL: 'https://picsum.photos/200',
    };
    localStorage.setItem('zklogin_user', JSON.stringify(demoUser));
    setCurrentUser(demoUser);
  };

  const value = {
    currentUser,
    loginWithGoogle,
    logout,
    loading,
    mockLogin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
