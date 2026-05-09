import axiosClient from "./axiosClient";

export const cryptoApi = {
  // Lấy chữ ký mù từ Crypto Service
  getBlindSignature: (data: { electionId: number; blindedMessage: string }) => {
    return axiosClient.post('/api/crypto/sign', data);
  },

  // Gửi phiếu bầu đã giải mù (Unblinded)
  castVote: (voteData: {
    electionId: number;
    candidateId: number;
    blindedContent: string; // Thực tế là unblinded content sau khi xử lý
    signature: string;
  }) => {
    return axiosClient.post('/api/votes/cast', voteData);
  },
};
export default cryptoApi;