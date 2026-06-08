// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { type Mock, beforeEach, afterEach, describe, expect, test, vi } from 'vitest';
import MontyHallPage from './MontyHallPage';
import type { DoorIndex, GamePhase, StatsResponse, Strategy } from './types';

const { mockUseMontyHallGame } = vi.hoisted(() => ({
  mockUseMontyHallGame: vi.fn(),
}));

vi.mock('./useMontyHallGame', () => ({
  useMontyHallGame: mockUseMontyHallGame,
}));

type MockGameState = {
  phase: GamePhase;
  initialDoor: DoorIndex | null;
  revealedDoor: DoorIndex | null;
  finalDoor: DoorIndex | null;
  prizeDoor: DoorIndex | null;
  strategy: Strategy | null;
  won: boolean | null;
  stats: StatsResponse;
  isSubmitting: boolean;
  error: string | null;
  pickInitialDoor: Mock<(door: DoorIndex) => Promise<void>>;
  finishWithDoor: Mock<(door: DoorIndex) => Promise<void>>;
  resetRound: Mock<() => void>;
};

const baseStats: StatsResponse = {
  totalGames: 0,
  switchGames: 0,
  switchWins: 0,
  switchRate: 0,
  stayGames: 0,
  stayWins: 0,
  stayRate: 0,
  snapshots: [],
};

function makeGameState(overrides: Partial<MockGameState> = {}): MockGameState {
  return {
    phase: 'idle',
    initialDoor: null,
    revealedDoor: null,
    finalDoor: null,
    prizeDoor: null,
    strategy: null,
    won: null,
    stats: baseStats,
    isSubmitting: false,
    error: null,
    pickInitialDoor: vi.fn(),
    finishWithDoor: vi.fn(),
    resetRound: vi.fn(),
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});
beforeEach(() => {
  mockUseMontyHallGame.mockReturnValue(makeGameState());
});

describe('MontyHallPage UI states', () => {
  test('renders winning result with green result class', () => {
    mockUseMontyHallGame.mockReturnValue(
      makeGameState({
        phase: 'finished',
        initialDoor: 0,
        revealedDoor: 1,
        finalDoor: 2,
        prizeDoor: 2,
        strategy: 'switch',
        won: true,
      })
    );

    render(<MontyHallPage />);

    const heading = screen.getByText('You won!');
    expect(heading.className.includes('result-win')).toBe(true);
    expect(screen.queryByText('You lost.')).toBeNull();
  });

  test('renders losing result with red result class', () => {
    mockUseMontyHallGame.mockReturnValue(
      makeGameState({
        phase: 'finished',
        initialDoor: 0,
        revealedDoor: 1,
        finalDoor: 2,
        prizeDoor: 0,
        strategy: 'switch',
        won: false,
      })
    );

    render(<MontyHallPage />);

    const heading = screen.getByText('You lost.');
    expect(heading.className.includes('result-loss')).toBe(true);
    expect(screen.queryByText('You won!')).toBeNull();
  });

  test('renders the updated page title and always-visible explanation', () => {
    render(<MontyHallPage />);

    expect(screen.getByText('EXPERIMENT NO. 2')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'The Monty Hall Problem', level: 1 })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Explanation', level: 2 })).toBeDefined();
    expect(screen.queryByRole('button', { name: /explain this to me/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /hide explanation/i })).toBeNull();
    expect(screen.getByText('01 // THE SETUP')).toBeDefined();
    expect(screen.getByText('02 // THE ELIMINATION')).toBeDefined();
    expect(screen.getByText('03 // THE VISUAL')).toBeDefined();
    expect(screen.getByText('999/1000')).toBeDefined();
    expect(
      screen.getByText(/EXPERIMENT NOTE \/\/ SWITCHING WINS BY COLLECTING EVERY DOOR MONTY PROVED EMPTY/)
    ).toBeDefined();
  });

  test('renders the redesigned door stage markup', () => {
    mockUseMontyHallGame.mockReturnValue(makeGameState({ phase: 'idle' }));
    const { container } = render(<MontyHallPage />);

    expect(screen.getByText('CHOOSE // REVEAL // DECIDE')).toBeDefined();
    expect(screen.getByText(/Pick a door, let Monty clear a goat/)).toBeDefined();
    expect(container.querySelectorAll('.door-knob').length).toBe(3);
    expect(screen.getByRole('button', { name: 'Choose door 1' }).className.includes('door-idle')).toBe(true);
  });
});
