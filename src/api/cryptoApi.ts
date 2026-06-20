import axiosClient from "./axiosClient";

export const cryptoApi = {
  getBlindSignature: (data: { electionId: number; roundId: number; blindedMessage: string; inviteToken: string | null }) => {
    return axiosClient.post('/api/crypto/sign', data);
  },

  castVote: (voteData: {
    electionId: number;
    roundId: number;
    candidateId: number | null;
    messageToken: string;
    signature: string;
    encryptedVote?: string;
  }) => {
    return axiosClient.post('/api/v1/votes/submit-anonymous', voteData);
  },
};
export default cryptoApi;
