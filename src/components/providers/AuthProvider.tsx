'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  session: { user: User } | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ user: User } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth');
        if (res.ok) {
          const data = await res.json();
          setSession(data.user ? { user: data.user } : null);
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'signin', email, password }),
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Ошибка входа');
    }
    
    const data = await res.json();
    if (data.user) {
      setSession({ user: data.user });
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'signup', name, email, password }),
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Ошибка регистрации');
    }
    
    const data = await res.json();
    if (data.user) {
      setSession({ user: data.user });
    }
  };

  const signOut = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user || null, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};