import React, { createContext, useContext, useState, useEffect } from "react";
import type { User } from "../types/auth";
import authService from "../services/authService";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = () => {
      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");
      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          setIsAuthenticated(true);
        } catch (e) {
          localStorage.clear();
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

// Trong file AuthContext.tsx
  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login({ email, password });

      // CẬP NHẬT TẠI ĐÂY: Thêm image_url vào object userData
      const userData: User = {
        id: response.id,
        username: response.username,
        email: response.email,
        roles: response.roles,
        image_url: response.image_url // <--- Dòng này cực kỳ quan trọng[cite: 10]
      };

      // Lưu trữ vào localStorage để khi F5 vẫn còn ảnh[cite: 10]
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(userData));

      setUser(userData);
      setIsAuthenticated(true);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || "Đăng nhập thất bại";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setIsAuthenticated(false);
  };

  const clearError = () => setError(null);

  return (
      <AuthContext.Provider value={{ user, isAuthenticated, isLoading, error, login, logout, clearError }}>
        {children}
      </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};