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
    blindedContent: string;
    signature: string;
  }) => {
    return axiosClient.post('/api/votes/cast', voteData);
  },
};
export default cryptoApi;