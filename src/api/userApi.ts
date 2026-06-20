import axiosClient from './axiosClient';
import type {User, LoginResponse} from '../types/auth';

export const userApi = {
  // Đăng nhập
  login: async (credentials: { email: string; password: string }): Promise<LoginResponse> => {
    const response = await axiosClient.post('/auth/login', credentials);
    return response.data;
  },
  // đăng ký

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

  // Đặt lại mật khẩu
  resetPassword: (data: never) =>
      axiosClient.post('/voter/reset-password', data),
  // Xác thực email
  verifyEmail: (token: string) =>
      axiosClient.post('/auth/verify-email', { token }),

  // Gửi lại mã
  resendToken: (email: string) =>
      axiosClient.post('/auth/resend-token', { email }),
  // Lấy danh sách tất cả người dùng
  getAll: async (): Promise<never[]> => {
    const response = await axiosClient.get('/api/elections/voter/all');
    return response.data;
  },
  // Gửi email xin OTP
  forgotPassword: (email: string) =>
      axiosClient.post('/voter/forgot-password', { email }),

  // Xác thực OTP (chưa đổi pass)
  verifyOtp: (email: string, otpCode: string) =>
      axiosClient.post('/voter/verify-otp', { email, otpCode }),

  // Gửi OTP + pass mới để cập nhật
  resetPasswordWithOtp: (data: { email: string; otpCode: string; newPassword: string }) =>
      axiosClient.post('/voter/reset-password-otp', data),
  getById: async (id: number): Promise<any> => {
    const response = await axiosClient.get(`/voter/${id}`);
    return response.data;
  },

  // Khóa tài khoản cử tri (Admin)
  lockAccount: async (id: number): Promise<any> => {
    const response = await axiosClient.post(`/voter/${id}/lock`);
    return response.data;
  },
  // [SUPER_ADMIN] Khóa tài khoản
  lockVoter: async (id: number): Promise<any> => {
    const response = await axiosClient.post(`/voter/${id}/lock`);
    return response.data;
  },

  // [SUPER_ADMIN] Mở khóa tài khoản
  unlockVoter: async (id: number): Promise<any> => {
    const response = await axiosClient.post(`/voter/${id}/unlock`);
    return response.data;
  },
  createModerator: async (data: { fullName: string; email: string; password: string; phone: string }): Promise<any> => {
    const token = localStorage.getItem("token");
    const response = await axiosClient.post('/auth/admin/create-moderator', data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
  deleteUser: async (id: number): Promise<any> => {
    const response = await axiosClient.delete(`/voter/${id}`);
    return response.data;
  },

  getAdminHosts: async (): Promise<any[]> => {
    const response = await axiosClient.get('/voter/admin/hosts');
    return response.data;
  },

  getAdminVoters: async (): Promise<any[]> => {
    const response = await axiosClient.get('/voter/admin/voters');
    return response.data;
  },
};


export default userApi;
