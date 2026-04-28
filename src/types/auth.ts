// Định nghĩa kiểu dữ liệu cho Authentication

export interface LoginRequest {
  username: string;
  password: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  roles: string[];
}

export interface LoginResponse {
  token: string;
  id: number;
  username: string;
  email: string;
  roles: string[];
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName?: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user: User;
}

