import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User, 
  GoogleAuthProvider,
  FacebookAuthProvider
} from 'firebase/auth';
import { auth, googleProvider, facebookProvider } from '../services/firebaseConfig';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: UserProfile | null;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  mockLogin: () => void; // For demo purposes only
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

  // Monitor Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        });
      } else {
        // Only set to null if we haven't manually mocked a login (for demo resilience)
        if (!localStorage.getItem('sui_demo_user')) {
            setCurrentUser(null);
        }
      }
      setLoading(false);
    });

    // Check for mock user (Development Fallback if Firebase keys are missing/invalid)
    const mockUser = localStorage.getItem('sui_demo_user');
    if (mockUser) {
        setCurrentUser(JSON.parse(mockUser));
        setLoading(false);
    }

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google Login Failed:", error);
      alert("Firebase Config Missing or Invalid. Using Demo Login.");
      mockLogin();
    }
  };

  const loginWithFacebook = async () => {
    try {
      await signInWithPopup(auth, facebookProvider);
    } catch (error) {
        console.error("Facebook Login Failed:", error);
        mockLogin();
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('sui_demo_user');
      setCurrentUser(null);
    } catch (error) {
      console.error("Logout Failed", error);
    }
  };

  // Vibe Coding: Allow instant access if keys aren't set up
  const mockLogin = () => {
      const demoUser: UserProfile = {
          uid: 'demo-123',
          email: 'demo@suicloud.io',
          displayName: 'Demo User',
          photoURL: 'https://picsum.photos/200'
      };
      localStorage.setItem('sui_demo_user', JSON.stringify(demoUser));
      setCurrentUser(demoUser);
  };

  const value = {
    currentUser,
    loginWithGoogle,
    loginWithFacebook,
    logout,
    loading,
    mockLogin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
