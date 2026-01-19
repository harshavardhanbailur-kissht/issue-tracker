import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { UserRole } from '@/types';

interface SimpleAuthContextType {
  role: UserRole | null;
  isAuthenticated: boolean;
  login: (role: UserRole, password: string) => Promise<boolean>;
  logout: () => void;
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

const STORAGE_KEY = 'issue_tracker_auth';
const HARDCODED_PASSWORD = '1111';

export function SimpleAuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { role: storedRole } = JSON.parse(stored);
        if (storedRole === 'sales_manager' || storedRole === 'product_support') {
          setRole(storedRole);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Failed to parse stored auth:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = async (selectedRole: UserRole, password: string): Promise<boolean> => {
    if (password === HARDCODED_PASSWORD) {
      setRole(selectedRole);
      setIsAuthenticated(true);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ role: selectedRole }));
      return true;
    }
    return false;
  };

  const logout = () => {
    setRole(null);
    setIsAuthenticated(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value: SimpleAuthContextType = {
    role,
    isAuthenticated,
    login,
    logout,
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SimpleAuthContext.Provider value={value}>
      {children}
    </SimpleAuthContext.Provider>
  );
}

export function useSimpleAuth() {
  const context = useContext(SimpleAuthContext);
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
  }
  return context;
}
