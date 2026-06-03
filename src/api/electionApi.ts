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

  create: (electionData: any, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
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
  
  update: (id: number, data: any) =>
      axiosClient.put(`/api/elections/${id}`, data),

  delete: (id: number) => axiosClient.delete(`/api/elections/${id}`),
  
  getById: (id: string | number) => axiosClient.get(`/api/elections/${id}`),
  
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
};

export default electionApi;