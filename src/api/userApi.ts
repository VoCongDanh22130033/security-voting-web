import axiosClient from './axiosClient';
import type {User, LoginResponse} from '../types/auth';

export const userApi = {
  // Đăng nhập
  login: async (credentials: { email: string; password: string }): Promise<LoginResponse> => {
    const response = await axiosClient.post('/voter/login', credentials);
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
};
export default userApi;