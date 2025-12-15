import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo
const mockUsers: Record<UserRole, User> = {
  admin: {
    id: '1',
    name: 'John Kamau',
    email: 'admin@hdpk.co.ke',
    role: 'admin',
    deviceId: 'device-001',
  },
  manager: {
    id: '2',
    name: 'Mary Wanjiku',
    email: 'manager@hdpk.co.ke',
    role: 'manager',
    deviceId: 'device-002',
  },
  clerk: {
    id: '3',
    name: 'Peter Ochieng',
    email: 'clerk@hdpk.co.ke',
    role: 'clerk',
    deviceId: 'device-003',
  },
  sales_rep: {
    id: '4',
    name: 'Grace Akinyi',
    email: 'sales@hdpk.co.ke',
    role: 'sales_rep',
    deviceId: 'device-004',
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('hdpk_user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const login = async (email: string, password: string, role: UserRole): Promise<boolean> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockUser = mockUsers[role];
    if (mockUser) {
      setUser(mockUser);
      localStorage.setItem('hdpk_user', JSON.stringify(mockUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('hdpk_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
