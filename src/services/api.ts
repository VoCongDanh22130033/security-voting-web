import axios from "axios";

// 1. Tạo instance chung
const api = axios.create({
  baseURL: "http://localhost:8080", // gateway URL
});

// 2. Interceptor tự động gắn token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Định nghĩa các hàm gọi API
export const getElections = () => api.get('/api/elections');

export const getCandidates = (electionId: number) =>
    api.get(`/api/elections/${electionId}/candidates`);

// Hàm bỏ phiếu sử dụng instance api đã cấu hình
export const castVote = (voteData: { electionId: number; candidateId: number }) =>
    api.post('/api/votes/cast', voteData);

export default api;