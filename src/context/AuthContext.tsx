import React, { createContext, useContext, useState, useEffect } from "react";
import type { AuthContextType, User } from "../types/auth";
import authService from "../services/authService";

// Tạo Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider Component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Kiểm tra authentication khi component mount
  useEffect(() => {
    const checkAuth = () => {
      const token = authService.getToken();
      const currentUser = authService.getCurrentUser();
      
      if (token && currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Hàm login
  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login({ email, password });
      
      setUser(response.user);
      setIsAuthenticated(true);
      setError(null);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || "Đăng nhập thất bại";
      setError(errorMessage);
      setIsAuthenticated(false);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Hàm logout
  const logout = (): void => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  };

  // Hàm xóa lỗi
  const clearError = (): void => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom Hook để sử dụng Auth Context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;

