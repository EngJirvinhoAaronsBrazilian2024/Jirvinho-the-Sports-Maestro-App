
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
}

export enum TipStatus {
  PENDING = 'PENDING',
  WON = 'WON',
  LOST = 'LOST',
  VOID = 'VOID'
}

export enum TipCategory {
  SINGLE = 'Single Bet',
  ODD_2_PLUS = 'Maestro Odd 2+',
  ODD_4_PLUS = 'Masavu tips (Odd 4+)'
}

export interface TipVotes {
  agree: number;
  disagree: number;
  userVoted?: 'agree' | 'disagree'; // Local state tracker
}

export interface TipLeg {
  teams: string;
  league: string;
  prediction: string;
}

export interface Tip {
  id: string;
  category: TipCategory;
  teams: string; // e.g., "Flamengo vs Palmeiras" (or Summary for Multi)
  league: string; // (or "Multiple" for Multi)
  kickoffTime: string; // ISO string
  sport: string;
  prediction: string; // (or "See Selections" for Multi)
  odds: number;
  confidence: 'Low' | 'Medium' | 'High';
  status: TipStatus;
  analysis?: string; // AI generated or manual text
  resultScore?: string; // e.g. "2-1"
  votes: TipVotes;
  bettingCode?: string; // Bookmaker code for the user to copy
  legs?: TipLeg[]; // Array of matches for accumulators
  createdAt: number;
}

export interface NewsPost {
  id: string;
  title: string;
  category: string;
  body: string;
  imageUrl?: string;
  videoUrl?: string;
  source?: string;
  matchDate?: string; // Optional date for the game mentioned
  createdAt: number;
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  reply?: string; // Admin reply
  createdAt: number;
  isRead: boolean;
}

export interface MaestroStats {
  winRate: number;
  totalTips: number;
  wonTips: number;
  streak: TipStatus[]; // Last 10
}

export interface Slide {
  id: string;
  image: string; // URL or Base64
  title: string;
  subtitle: string;
  createdAt: number;
}
