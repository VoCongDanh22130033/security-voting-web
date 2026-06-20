export interface Candidate {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  voteCount: number;
}

export interface Round {
  id: number;
  roundNumber: number;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: 'UPCOMING' | 'OPEN' | 'CLOSED' | 'CANCELLED';
  maxAdvanceCount: number;
  candidates: Candidate[];
}

export interface Election {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  status: 'UPCOMING' | 'OPEN' | 'CLOSED' | 'ENDED';
  totalRounds: number;
  startTime: string;
  endTime: string;
  winnerId?: number;
  rounds: Round[];
  candidates: Candidate[];
}
