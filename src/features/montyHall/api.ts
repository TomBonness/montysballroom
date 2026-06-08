import outputs from '../../../amplify_outputs.json';
import type { DoorIndex, StartGameResponse, FinishGameResponse, StatsResponse } from './types';

interface AmplifyOutputs {
  custom?: {
    montyHallApiBaseUrl?: string;
  };
}

const typedOutputs = outputs as AmplifyOutputs;

const baseUrl = typedOutputs.custom?.montyHallApiBaseUrl || import.meta.env.VITE_MONTY_HALL_API_BASE_URL || '';

export async function getStats(): Promise<StatsResponse> {
  const url = `${baseUrl}/stats`;
  const res = await fetch(url);
  if (!res.ok) {
    let errMsg = 'failed_to_fetch_stats';
    try {
      const data = (await res.json()) as { error?: string };
      errMsg = data.error || errMsg;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }
  return res.json() as Promise<StatsResponse>;
}

export async function startGame(initialDoor: DoorIndex): Promise<StartGameResponse> {
  const url = `${baseUrl}/game/start`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ initialDoor }),
  });
  if (!res.ok) {
    let errMsg = 'failed_to_start_game';
    try {
      const data = (await res.json()) as { error?: string };
      errMsg = data.error || errMsg;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }
  return res.json() as Promise<StartGameResponse>;
}

export async function finishGame(gameId: string, finalDoor: DoorIndex): Promise<FinishGameResponse> {
  const url = `${baseUrl}/game/finish`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ gameId, finalDoor }),
  });
  if (!res.ok) {
    let errMsg = 'failed_to_finish_game';
    try {
      const data = (await res.json()) as { error?: string };
      errMsg = data.error || errMsg;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }
  return res.json() as Promise<FinishGameResponse>;
}
