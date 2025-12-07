import { Tip } from '../types';

export interface LiveMatch {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: 'LIVE' | 'HT' | 'FT' | 'NS';
  minute: number;
  startTime: number; // Timestamp
}

// Initial Mock Data for Live Scores
const INITIAL_MATCHES: LiveMatch[] = [
  { id: 'm1', league: 'Premier League', homeTeam: 'Arsenal', awayTeam: 'Liverpool', homeScore: 1, awayScore: 1, status: 'LIVE', minute: 34, startTime: Date.now() - 34 * 60000 },
  { id: 'm2', league: 'La Liga', homeTeam: 'Real Madrid', awayTeam: 'Getafe', homeScore: 2, awayScore: 0, status: 'LIVE', minute: 67, startTime: Date.now() - 67 * 60000 },
  { id: 'm3', league: 'Serie A', homeTeam: 'Juventus', awayTeam: 'AC Milan', homeScore: 0, awayScore: 0, status: 'LIVE', minute: 12, startTime: Date.now() - 12 * 60000 },
  { id: 'm4', league: 'Brasileirão', homeTeam: 'Flamengo', awayTeam: 'Vasco', homeScore: 1, awayScore: 2, status: 'FT', minute: 90, startTime: Date.now() - 120 * 60000 },
  { id: 'm5', league: 'Bundesliga', homeTeam: 'Bayern Munich', awayTeam: 'Dortmund', homeScore: 0, awayScore: 0, status: 'NS', minute: 0, startTime: Date.now() + 60 * 60000 },
];

class LiveScoreService {
  private matches: LiveMatch[] = [...INITIAL_MATCHES];

  // Simulates fetching live data
  async getLiveMatches(): Promise<LiveMatch[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Randomly update match data to simulate live action
    this.updateMockMatches();
    
    return [...this.matches];
  }

  private updateMockMatches() {
    this.matches = this.matches.map(match => {
      if (match.status === 'FT' || match.status === 'NS') return match;

      // Increment minute
      let newMinute = match.minute + 1;
      let newStatus: LiveMatch['status'] = match.status;

      if (newMinute > 45 && newMinute < 46) newStatus = 'HT';
      if (newMinute > 90) newStatus = 'FT';
      
      // Random goal chance (low probability)
      let newHomeScore = match.homeScore;
      let newAwayScore = match.awayScore;
      
      if (Math.random() > 0.95) { // 5% chance of goal update per poll
        if (Math.random() > 0.5) newHomeScore++;
        else newAwayScore++;
      }

      return {
        ...match,
        minute: newMinute > 90 ? 90 : newMinute,
        status: newStatus,
        homeScore: newHomeScore,
        awayScore: newAwayScore
      };
    });
  }
}

export const liveScoreService = new LiveScoreService();