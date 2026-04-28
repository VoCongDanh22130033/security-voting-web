import axios, {type AxiosInstance } from 'axios';
import type {User} from '../types/auth';

class AuthService {
  private apiClient: AxiosInstance;
  private tokenKey = 'token';
  private userKey = 'user';

  constructor() {
    this.apiClient = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Thêm interceptor để gửi token trong header
    this.apiClient.interceptors.request.use((config) => {
      const token = this.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  /**
   * Đăng nhập người dùng
   */
  async login(credentials: { email: string; password: string }): Promise<{ user: User; token: string }> {
    try {
      const response = await this.apiClient.post('/auth/login', credentials);
      const { token } = response.data;

      localStorage.setItem(this.tokenKey, token);

      // Lấy phần tên từ email để hiển thị (Ví dụ: voter2@gmail.com -> voter2)
      const displayName = credentials.email.split('@')[0];

      const user: User = {
        id: "temp-id",
        username: displayName, // Gán tên để Header có cái hiển thị
        email: credentials.email
      };

      localStorage.setItem(this.userKey, JSON.stringify(user));
      // return { user, token };
      return response.data;
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Đăng nhập thất bại');
    }
  }
  /**
   * Đăng ký người dùng mới
   */
  async register(userData: {
    username: string;
    email: string;
    password: string;
    fullName: string;
  }): Promise<{ user: User; token: string }> {
    try {
      const response = await this.apiClient.post('/auth/register', userData);
      const { user, token } = response.data;

      localStorage.setItem(this.tokenKey, token);
      localStorage.setItem(this.userKey, JSON.stringify(user));

      return { user, token };
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Đăng ký thất bại';
      throw new Error(errorMessage);
    }
  }

  /**
   * Đăng xuất
   */
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  /**
   * Lấy token từ localStorage
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Lấy thông tin người dùng hiện tại
   */
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem(this.userKey);
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Kiểm tra người dùng đã đăng nhập chưa
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Yêu cầu đặt lại mật khẩu
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      await this.apiClient.post('/auth/forgot-password', { email });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Yêu cầu đặt lại mật khẩu thất bại';
      throw new Error(errorMessage);
    }
  }

  /**
   * Đặt lại mật khẩu
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await this.apiClient.post('/auth/reset-password', { token, newPassword });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Đặt lại mật khẩu thất bại';
      throw new Error(errorMessage);
    }
  }

  /**
   * Cập nhật thông tin người dùng
   */
  async updateProfile(userData: Partial<User>): Promise<User> {
    try {
      const response = await this.apiClient.put('/auth/profile', userData);
      const updatedUser = response.data;

      localStorage.setItem(this.userKey, JSON.stringify(updatedUser));
      return updatedUser;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Cập nhật thông tin thất bại';
      throw new Error(errorMessage);
    }
  }
  // src/services/authService.ts

  async getProfile(): Promise<any> {
    try {
      // Đảm bảo không dư thừa dấu gạch chéo hoặc tiền tố lạ
      const response = await this.apiClient.get('/voter/profile');
      return response.data;
    } catch (error: any) {
      console.error("Profile API Error:", error.response); // Thêm log này để debug nếu vẫn trống
      throw error;
    }
  }
}

export default new AuthService();

