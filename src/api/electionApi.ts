import axiosClient from "./axiosClient";
// Định nghĩa lại cấu hình thời gian vòng động
export interface RoundTimeSetting {
  roundNumber: number;
  startTime: string;
  endTime: string;
  maxAdvanceCount: number;
}

// Định nghĩa cấu trúc ứng viên tự điền thủ công gửi kèm
export interface NewCandidateInput {
  name: string;
  party?: string;
  description?: string;
  base64Image?: string;
}

// SỬA LẠI ĐỊNH NGHĨA REQUEST CHUẨN
export interface CreateElectionRequest {
  title: string;
  description: string;
  totalRounds: number;
  roundsTimeSettings: RoundTimeSetting[]; // Thay thế 2 trường cũ thành mảng động này
  candidateIds: number[];
  newCandidates: NewCandidateInput[];
}
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
  createMultiRound: async (data: CreateElectionRequest) => {
    // Thay đổi endpoint URL tương ứng với Gateway hoặc Service của bạn
    const response = await axiosClient.post('/api/elections/create', data);
    return response.data;
  },

  // Hàm bổ sung phụ trợ lấy danh sách toàn bộ candidate để admin chọn gán vào Vòng 1
  getAllCandidates: async () => {
    const response = await axiosClient.get('/admin/candidates');
    return response.data;
  },

  getRoundResults: (electionId: number, roundId: number) => {
    return axiosClient.get(`/api/votes/results?electionId=${electionId}&roundId=${roundId}`);
  }

};

export default electionApi;