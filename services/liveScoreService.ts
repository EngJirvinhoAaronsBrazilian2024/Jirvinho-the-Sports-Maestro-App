import { LiveMatch, MatchStatus } from "../types";

// NOTE: In a production app, you would replace these mock data generators 
// with a fetch call to a real API like API-Football (https://www.api-football.com/).
// Example: const response = await fetch('https://v3.football.api-sports.io/fixtures?live=all', { headers: { 'x-rapidapi-key': 'YOUR_KEY' } });

class LiveScoreService {
  
  // Simulated database of matches
  private matches: LiveMatch[] = [
    {
      id: 'm1',
      league: 'Premier League',
      homeTeam: 'Liverpool',
      awayTeam: 'Man City',
      homeScore: 1,
      awayScore: 1,
      status: 'LIVE',
      minute: 67,
      kickoffTime: new Date(Date.now() - 4000000).toISOString(),
      events: [
        { minute: 12, type: 'goal', player: 'Haaland', team: 'away' },
        { minute: 45, type: 'goal', player: 'Salah', team: 'home', detail: 'Penalty' }
      ]
    },
    {
      id: 'm2',
      league: 'La Liga',
      homeTeam: 'Real Madrid',
      awayTeam: 'Getafe',
      homeScore: 2,
      awayScore: 0,
      status: 'FINISHED',
      kickoffTime: new Date(Date.now() - 10000000).toISOString(),
      events: [
        { minute: 34, type: 'goal', player: 'Vinicius Jr', team: 'home' },
        { minute: 88, type: 'goal', player: 'Bellingham', team: 'home' }
      ]
    },
    {
      id: 'm3',
      league: 'Brasileirão Serie A',
      homeTeam: 'Flamengo',
      awayTeam: 'Vasco da Gama',
      homeScore: 0,
      awayScore: 0,
      status: 'UPCOMING',
      kickoffTime: new Date(Date.now() + 3600000).toISOString(),
      events: []
    },
    {
      id: 'm4',
      league: 'Serie A',
      homeTeam: 'Juventus',
      awayTeam: 'AC Milan',
      homeScore: 0,
      awayScore: 1,
      status: 'LIVE',
      minute: 23,
      kickoffTime: new Date(Date.now() - 1500000).toISOString(),
      events: [
        { minute: 10, type: 'goal', player: 'Leão', team: 'away' },
        { minute: 15, type: 'card', player: 'Danilo', team: 'home', detail: 'Yellow' }
      ]
    },
    {
      id: 'm5',
      league: 'Bundesliga',
      homeTeam: 'Bayern Munich',
      awayTeam: 'Dortmund',
      homeScore: 3,
      awayScore: 2,
      status: 'LIVE',
      minute: 89,
      kickoffTime: new Date(Date.now() - 5400000).toISOString(),
      events: [
         { minute: 5, type: 'goal', player: 'Kane', team: 'home' },
         { minute: 22, type: 'goal', player: 'Reus', team: 'away' },
         { minute: 55, type: 'goal', player: 'Sane', team: 'home' },
         { minute: 70, type: 'goal', player: 'Brandt', team: 'away' },
         { minute: 88, type: 'goal', player: 'Musiala', team: 'home' }
      ]
    }
  ];

  async getLiveMatches(): Promise<LiveMatch[]> {
    // No simulated delay for instant feel
    // await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate "Live" updates to make the app feel dynamic
    this.matches = this.matches.map(match => {
      if (match.status === 'LIVE') {
         // Increment minute occasionally
         const newMinute = (match.minute || 0) + (Math.random() > 0.7 ? 1 : 0);
         
         // Very rare random goal simulation
         if (Math.random() > 0.98) {
             const team = Math.random() > 0.5 ? 'home' : 'away';
             if (team === 'home') match.homeScore++; else match.awayScore++;
             match.events.push({
                 minute: newMinute,
                 type: 'goal',
                 player: 'Simulated Player',
                 team: team
             });
         }
         
         return {
             ...match,
             minute: newMinute > 90 ? 90 : newMinute,
             status: newMinute >= 90 ? 'FINISHED' : 'LIVE'
         };
      }
      return match;
    });

    return [...this.matches];
  }

  async getMatchesByLeague(league: string): Promise<LiveMatch[]> {
      const all = await this.getLiveMatches();
      return all.filter(m => m.league === league);
  }
}

export const liveScoreService = new LiveScoreService();