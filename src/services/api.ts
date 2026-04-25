import axios from "axios";

// 1. Tạo instance chung
const api = axios.create({
  baseURL: "http://localhost:8080", // gateway URL
});

// 2. Interceptor tự động gắn token (Đã đúng)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getElections = () => api.get('/api/elections');

export const getCandidates = (electionId: number) =>
    api.get(`/api/elections/${electionId}/candidates`);

export default api;