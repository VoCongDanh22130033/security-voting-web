import axios from "axios";

// Khởi tạo instance axios trỏ về Gateway
const api = axios.create({
  baseURL: "http://localhost:8080", // Đây là port của API Gateway
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const userEmail = localStorage.getItem("userEmail"); // Email lấy từ lúc đăng nhập[cite: 15]

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Gửi Email để Backend lấy được userId[cite: 15]
  if (userEmail) {
    config.headers["X-User-Email"] = userEmail;
  }

  return config;
});

// --- ELECTION SERVICE ---
export const getElections = () => api.get('/api/elections');
export const getCandidates = (electionId: number) => api.get(`/api/elections/${electionId}/candidates`);
export const updateElection = (id: number, data: any) => api.put(`/api/elections/${id}`, data);
export const deleteElection = (id: number) => api.delete(`/api/elections/${id}`);

export const castVote = (voteData: {
  electionId: number;
  candidateId: number;
  encryptedVote: string;
  signature: string;
}) => api.post('/api/votes/cast', voteData);
export const getBlindSignature = (data: { electionId: number; blindedMessage: string }) => {
  return api.post('/api/crypto/sign', data);
};
export default api;