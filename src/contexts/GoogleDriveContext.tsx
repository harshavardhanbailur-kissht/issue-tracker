import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  initializeGoogleAPI,
  authenticateGoogleDrive,
  signOutGoogleDrive,
  isAuthenticated,
  isGoogleDriveConfigured,
} from '@/lib/googleDrive';

interface GoogleDriveContextType {
  isConfigured: boolean;
  isInitialized: boolean;
  isSignedIn: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
}

const GoogleDriveContext = createContext<GoogleDriveContextType | null>(null);

export function GoogleDriveProvider({ children }: { children: ReactNode }) {
  const [isConfigured] = useState(isGoogleDriveConfigured());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Google API on mount
  useEffect(() => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    const init = async () => {
      try {
        await initializeGoogleAPI();
        setIsInitialized(true);
        setIsSignedIn(isAuthenticated());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize Google API');
      } finally {
        setIsLoading(false);
      }
    };

    // Wait for scripts to load
    const checkAndInit = () => {
      if (typeof gapi !== 'undefined' && typeof google !== 'undefined') {
        init();
      } else {
        setTimeout(checkAndInit, 100);
      }
    };

    checkAndInit();
  }, [isConfigured]);

  const signIn = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authenticateGoogleDrive();
      setIsSignedIn(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    signOutGoogleDrive();
    setIsSignedIn(false);
  }, []);

  return (
    <GoogleDriveContext.Provider
      value={{
        isConfigured,
        isInitialized,
        isSignedIn,
        isLoading,
        error,
        signIn,
        signOut,
      }}
    >
      {children}
    </GoogleDriveContext.Provider>
  );
}

export function useGoogleDrive() {
  const context = useContext(GoogleDriveContext);
  if (!context) {
    throw new Error('useGoogleDrive must be used within GoogleDriveProvider');
  }
  return context;
}
