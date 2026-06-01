import axiosClient from "./axiosClient";

export const cryptoApi = {
  getBlindSignature: (data: { electionId: number; roundId: number; blindedMessage: string }) => {
    return axiosClient.post('/api/crypto/sign', data);
  },

  castVote: (voteData: {
    electionId: number;
    roundId: number;
    candidateId: number;
    messageToken: string; // Đã đổi tên khớp khít với DTO hệ thống
    signature: string;
  }) => {
    return axiosClient.post('/api/votes/submit-anonymous', voteData);
  },
};
export default cryptoApi;