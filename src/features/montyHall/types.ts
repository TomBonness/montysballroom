export type DoorIndex = 0 | 1 | 2;
export type Strategy = 'switch' | 'stay';
export type GamePhase = 'idle' | 'picked' | 'revealed' | 'finished';

export interface StatsSnapshot {
  totalGames: number;
  switchRate: number;
  stayRate: number;
  switchGames: number;
  stayGames: number;
  createdAt: string;
}

export interface StatsResponse {
  totalGames: number;
  switchGames: number;
  switchWins: number;
  switchRate: number;
  stayGames: number;
  stayWins: number;
  stayRate: number;
  snapshots: StatsSnapshot[];
}

export interface StartGameResponse {
  gameId: string;
  initialDoor: DoorIndex;
  revealedDoor: DoorIndex;
}

export interface FinishGameResponse {
  prizeDoor: DoorIndex;
  finalDoor: DoorIndex;
  strategy: Strategy;
  won: boolean;
  stats: StatsResponse;
}
