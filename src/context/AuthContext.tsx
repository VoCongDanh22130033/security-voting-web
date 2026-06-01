import React, { createContext, useContext, useState, useEffect } from "react";
import type {User} from "../types/auth";
import { userApi } from "../api/userApi";

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

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await userApi.login({ email, password });

      const userData: User = {
        roleId: 0,
        id: response.id,
        fullName: response.fullName,
        email: response.email,
        roles: response.roles,
        image_url: response.image_url
      };

      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("userEmail", response.email);

      setUser(userData);
      setIsAuthenticated(true);
    } catch (err: any) {
      // SỬA TẠI ĐÂY: Đọc thêm trường hợp dữ liệu trả về trực tiếp dạng string từ Backend
      const errorMessage =
          err?.response?.data?.message ||
          (typeof err?.response?.data === "string" ? err.response.data : "") ||
          err?.message ||
          "Đăng nhập thất bại";

      setError(errorMessage);
      throw new Error(errorMessage); // Ném lỗi ra ngoài để Login.tsx bắt được
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};