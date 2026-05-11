

export interface User {
  roleId: number;
  id: number;
  fullName: string;
  email: string;
  roles: string[];
  image_url?: string;
}

export interface LoginResponse {
  fullName: string;
  token: string;
  id: number;
  email: string;
  roles: string[];
  image_url?: string;
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
  email: string;
  password: string;
  fullName?: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user: User;
}

