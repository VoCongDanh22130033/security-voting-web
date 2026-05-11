import axiosClient from './axiosClient';
import type {User, LoginResponse} from '../types/auth';

export const userApi = {
  // Đăng nhập
  login: async (credentials: { email: string; password: string }): Promise<LoginResponse> => {
    const response = await axiosClient.post('/auth/login', credentials);
    return response.data;
  },
  // đăng ký
  register: async (credentials: { email: string; password: string }): Promise<LoginResponse> => {
    const response = await axiosClient.post('/auth/register', credentials);
    return response.data;
  },

  // Lấy thông tin cá nhân
  getProfile: async (): Promise<User> => {
    const response = await axiosClient.get('/voter/profile');
    return response.data;
  },

  // Cập nhật thông tin
  updateProfile: async (userData: Partial<User>): Promise<User> => {
    const response = await axiosClient.put('/voter/profile', userData);
    return response.data;
  },

  // Quên mật khẩu
  forgotPassword: (email: string) =>
      axiosClient.post('/voter/forgot-password', { email }),

  // Đặt lại mật khẩu
  resetPassword: (data: never) =>
      axiosClient.post('/voter/reset-password', data),
  // Xác thực email
  verifyEmail: (token: string) =>
      axiosClient.post('/auth/verify-email', { token }),

  // Gửi lại mã
  resendToken: (email: string) =>
      axiosClient.post('/auth/resend-token', { email }),
};
export default userApi;