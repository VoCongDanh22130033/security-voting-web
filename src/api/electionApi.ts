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

    // Đảm bảo gán đúng tên "election" khớp với @RequestPart bên Java
    const blob = new Blob([JSON.stringify(electionData)], { type: "application/json" });
    formData.append("election", blob);

    return axiosClient.post("/api/elections/create", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  uploadSingleFile: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return axiosClient.post("/api/elections/upload-single", formData);
  },
  createPureJson: (data: any) => axiosClient.post("/api/elections/create-json", data),
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