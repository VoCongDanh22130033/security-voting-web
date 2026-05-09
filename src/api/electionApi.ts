import axiosClient from "./axiosClient";

export const electionApi = {
  // Lấy danh sách cuộc bầu cử
  getAll: () => axiosClient.get('/api/elections'),
  // Lấy danh sách ứng viên
  getCandidates: (electionId: number) =>
      axiosClient.get(`/api/elections/${electionId}/candidates`),
  // Tạo mới
  create: (electionData: any, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("election", new Blob([JSON.stringify(electionData)], { type: "application/json" }));
    return axiosClient.post("/api/elections", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  // Cập nhật
  update: (id: number, data: any) =>
      axiosClient.put(`/api/elections/${id}`, data),

  // xóa cuộc bầu cử
  delete: (id: number) => axiosClient.delete(`/api/elections/${id}`),
  //Lấy id
  getById: (id: string | number) => axiosClient.get(`/api/elections/${id}`),
  // Chữ ký mù
  getBlindSignature: (data: { electionId: number; blindedMessage: string }) =>
      axiosClient.post('/api/crypto/sign', data),
  // Bỏ phiếu
  castVote: (voteData: any) => axiosClient.post('/api/votes/cast', voteData),
};

export default electionApi;