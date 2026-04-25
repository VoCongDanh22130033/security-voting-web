import axios, {type AxiosInstance } from 'axios';
import type {User} from '../types/auth';

class AuthService {
  private apiClient: AxiosInstance;
  private tokenKey = 'token';
  private userKey = 'user';

  constructor() {
    this.apiClient = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
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

  async login(credentials: { username: string; password: string }): Promise<{ user: User; token: string }> {
    try {
      const response = await this.apiClient.post('/auth/login', credentials);

      // AuthController chỉ trả về { token: "..." }
      const { token } = response.data;

      // Tạo object user tạm thời từ thông tin đăng nhập
      const user: User = {
        email: "", fullName: "", id: "", role: "",
        username: credentials.username
        // roles: [] // Bạn có thể parse JWT để lấy role nếu cần
      };

      // Lưu vào storage
      localStorage.setItem(this.tokenKey, token);
      localStorage.setItem(this.userKey, JSON.stringify(user));

      return { user, token };
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Đăng nhập thất bại';
      throw new Error(errorMessage);
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
      // Đường dẫn qua Gateway: http://localhost:8080/voter/profile
      const response = await this.apiClient.get('/voter/profile');
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Không thể tải thông tin profile';
      throw new Error(errorMessage);
    }
  }
}

export default new AuthService();

