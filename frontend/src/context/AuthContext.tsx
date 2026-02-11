// src/context/AuthContext.tsx
import { jwtDecode } from 'jwt-decode'
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
  exp?: number;
  ['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']?: string;
}

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const decodedToken = jwtDecode<JwtPayload>(token);
      const role = decodedToken.role ?? decodedToken['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

      if (!decodedToken.exp || decodedToken.exp * 1000 < Date.now() || !role) {
        logout();
        return;
      }

      setUser({ id: decodedToken.sub, email: decodedToken.email, role });
    } catch (error) {
      console.error('Invalid token:', error);
      logout();
    }
  }, [token]);

  const login = (newToken: string) => {
    localStorage.setItem('accessToken', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
