import axiosClient from "./axiosClient";

export interface RoundTimeSetting {
  roundNumber: number;
  startTime: string;
  endTime: string;
  maxAdvanceCount: number;
}

export interface NewCandidateInput {
  name: string;
  party?: string;
  description?: string;
  base64Image?: string;
  imageUrl?: string;
}

export interface CreateElectionRequest {
  title: string;
  description: string;
  totalRounds: number;
  roundsTimeSettings: RoundTimeSetting[];
  candidateIds: number[];
  newCandidates: NewCandidateInput[];
}

export const electionApi = {
  getAll: () => axiosClient.get('/api/elections'),
  
  getCandidates: (electionId: number) =>
      axiosClient.get(`/api/elections/${electionId}/candidates`),

  getResults: (electionId: string | number) => 
      axiosClient.get(`/api/elections/${electionId}/results`),

  getCandidatesByRound: (roundId: number) =>
      axiosClient.get(`/api/elections/rounds/${roundId}/candidates`),

  getElectionRounds: (electionId: number) =>
      axiosClient.get(`/api/elections/${electionId}/rounds`),

  getAdminStats: (electionId: number) =>
      axiosClient.get(`/api/elections/${electionId}/admin-stats`),

  getRoundDetails: (electionId: string | number) =>
      axiosClient.get(`/api/elections/${electionId}/rounds-details`),

  createWithParticipants: (electionData: any, file: File) => {
    const formData = new FormData();
    const blob = new Blob([JSON.stringify(electionData)], { type: "application/json" });
    formData.append("election", blob, "election.json");
    formData.append("file", file);
    return axiosClient.post("/api/elections/create-with-participants", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  create: (electionData: any, file: File) => {
    return electionApi.createWithParticipants(electionData, file);
  },

  uploadSingleFile: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return axiosClient.post("/api/elections/upload-single", formData);
  },

  createPureJson: (data: any) => axiosClient.post("/api/elections/create-json", data),
  
  update: (id: number, data: any) =>
      axiosClient.put(`/api/elections/${id}`, data),

  importCandidates: (electionId: string | number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return axiosClient.post(`/api/elections/${electionId}/candidates/import`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  importParticipants: (electionId: string | number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return axiosClient.post(`/api/elections/${electionId}/participants/import`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  delete: (id: number) => axiosClient.delete(`/api/elections/${id}`),
  
  getById: (id: string | number) => axiosClient.get(`/api/elections/${id}`),

  getParticipantDashboard: (electionId: string | number) =>
      axiosClient.get(`/api/elections/${electionId}/participants/dashboard`),

  getParticipantInvites: (electionId: string | number) =>
      axiosClient.get(`/api/elections/${electionId}/participants/invites`),

  resendParticipantInvite: (electionId: string | number, inviteId: string | number) =>
      axiosClient.post(`/api/elections/${electionId}/participants/${inviteId}/resend`),

  resendAllNotVoted: (electionId: string | number) =>
      axiosClient.post(`/api/elections/${electionId}/participants/resend-all-not-voted`),

  getMyElections: (citizenId: string) =>
    axiosClient.get(`/api/elections/my-elections`, { params: { citizenId } }),

  exportReportExcel: (electionId: string | number) =>
      axiosClient.get(`/api/elections/${electionId}/reports/excel`, { responseType: "blob" }),

  exportReportPdf: (electionId: string | number) =>
      axiosClient.get(`/api/elections/${electionId}/reports/pdf`, { responseType: "blob" }),

  verifyInvite: (data: { token: string; citizenId: string }) =>
      axiosClient.post('/api/elections/invites/verify', data),
  
  getBlindSignature: (data: { electionId: number; blindedMessage: string }) =>
      axiosClient.post('/api/crypto/sign', data),
  
  castVote: (voteData: any) => axiosClient.post('/api/votes/cast', voteData),
  
  createMultiRound: async (data: CreateElectionRequest) => {
    const response = await axiosClient.post('/api/elections/create', data);
    return response.data;
  },

  getAllCandidates: async () => {
    const response = await axiosClient.get('/api/elections/candidates/all');
    return response.data;
  },

  getRoundResults: (electionId: number, roundId: number) => {
    return axiosClient.get(`/api/votes/results?electionId=${electionId}&roundId=${roundId}`);
  },

  processRoundResult: async (electionId: number, roundNumber: number): Promise<any> => {
    const response = await axiosClient.post(`/api/elections/${electionId}/rounds/${roundNumber}/process`);
    return response.data;
  },

  determineWinner: (electionId: number) => {
    return axiosClient.post(`/api/elections/${electionId}/determine-winner`);
  },

  startRound: (roundId: number) =>
    axiosClient.post(`/api/rounds/${roundId}/start`),

  closeRound: (roundId: number) =>
    axiosClient.post(`/api/rounds/${roundId}/close`),

  advanceRound: (roundId: number) =>
    axiosClient.post(`/api/rounds/${roundId}/advance`),

  synchronizeVotes: (electionId: number) =>
    axiosClient.post(`/api/elections/${electionId}/synchronize-votes`),

  countVotesByRound: (electionId: number, roundId: number) =>
    axiosClient.get(`/api/v1/votes/count`, { params: { electionId, roundId } }),
};

export default electionApi;
