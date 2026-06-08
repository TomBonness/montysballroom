import { useState, useEffect, useCallback } from 'react';
import type { DoorIndex, GamePhase, Strategy, StatsResponse } from './types';
import { getStats, startGame, finishGame } from './api';

export function useMontyHallGame() {
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [gameId, setGameId] = useState<string | null>(null);
  const [initialDoor, setInitialDoor] = useState<DoorIndex | null>(null);
  const [revealedDoor, setRevealedDoor] = useState<DoorIndex | null>(null);
  const [finalDoor, setFinalDoor] = useState<DoorIndex | null>(null);
  const [prizeDoor, setPrizeDoor] = useState<DoorIndex | null>(null);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [stats, setStats] = useState<StatsResponse>({
    totalGames: 0,
    switchGames: 0,
    switchWins: 0,
    switchRate: 0,
    stayGames: 0,
    stayWins: 0,
    stayRate: 0,
    snapshots: [],
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const currentStats = await getStats();
      setStats(currentStats);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'failed_to_fetch_stats');
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const pickInitialDoor = useCallback(async (door: DoorIndex) => {
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await startGame(door);
      setGameId(res.gameId);
      setInitialDoor(res.initialDoor);
      setRevealedDoor(res.revealedDoor);
      setPhase('revealed');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'failed_to_start_game');
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting]);

  const finishWithDoor = useCallback(async (door: DoorIndex) => {
    if (isSubmitting || !gameId) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await finishGame(gameId, door);
      setFinalDoor(res.finalDoor);
      setPrizeDoor(res.prizeDoor);
      setStrategy(res.strategy);
      setWon(res.won);
      setStats(res.stats);
      setPhase('finished');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'failed_to_finish_game');
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, gameId]);

  const resetRound = useCallback(() => {
    setGameId(null);
    setInitialDoor(null);
    setRevealedDoor(null);
    setFinalDoor(null);
    setPrizeDoor(null);
    setStrategy(null);
    setWon(null);
    setError(null);
    setPhase('idle');
  }, []);

  return {
    phase,
    gameId,
    initialDoor,
    revealedDoor,
    finalDoor,
    prizeDoor,
    strategy,
    won,
    stats,
    isSubmitting,
    error,
    pickInitialDoor,
    finishWithDoor,
    resetRound,
    refreshStats: fetchStats,
  };
}
