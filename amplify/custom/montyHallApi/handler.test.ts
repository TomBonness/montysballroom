import { describe, test, expect } from 'vitest';
import {
  parseStartRequest,
  parseFinishRequest,
  validateFinalDoor,
  deriveOutcome,
} from './handler';

describe('Lambda handler pure helpers', () => {
  describe('parseStartRequest', () => {
    test('accepts valid initialDoor', () => {
      expect(parseStartRequest(JSON.stringify({ initialDoor: 0 }))).toEqual({ initialDoor: 0 });
      expect(parseStartRequest(JSON.stringify({ initialDoor: 1 }))).toEqual({ initialDoor: 1 });
      expect(parseStartRequest(JSON.stringify({ initialDoor: 2 }))).toEqual({ initialDoor: 2 });
    });

    test('rejects missing or invalid values', () => {
      expect(() => parseStartRequest(null)).toThrow('invalid_initial_door');
      expect(() => parseStartRequest('')).toThrow('invalid_initial_door');
      expect(() => parseStartRequest('invalid json')).toThrow('invalid_initial_door');
      expect(() => parseStartRequest(JSON.stringify({ initialDoor: 3 }))).toThrow('invalid_initial_door');
      expect(() => parseStartRequest(JSON.stringify({ initialDoor: -1 }))).toThrow('invalid_initial_door');
      expect(() => parseStartRequest(JSON.stringify({ initialDoor: 1.5 }))).toThrow('invalid_initial_door');
      expect(() => parseStartRequest(JSON.stringify({ initialDoor: '0' }))).toThrow('invalid_initial_door');
    });
  });

  describe('parseFinishRequest', () => {
    test('accepts valid gameId and finalDoor', () => {
      expect(parseFinishRequest(JSON.stringify({ gameId: 'some-id', finalDoor: 1 }))).toEqual({
        gameId: 'some-id',
        finalDoor: 1,
      });
    });

    test('rejects invalid inputs', () => {
      expect(() => parseFinishRequest(null)).toThrow('invalid_finish_request');
      expect(() => parseFinishRequest(JSON.stringify({ finalDoor: 1 }))).toThrow('invalid_finish_request');
      expect(() => parseFinishRequest(JSON.stringify({ gameId: '', finalDoor: 1 }))).toThrow('invalid_finish_request');
      expect(() => parseFinishRequest(JSON.stringify({ gameId: 'id', finalDoor: 3 }))).toThrow('invalid_finish_request');
    });
  });

  describe('validateFinalDoor', () => {
    test('accepts valid stay or switch door choices', () => {
      expect(() => validateFinalDoor(0, 2, 0)).not.toThrow();
      expect(() => validateFinalDoor(0, 2, 1)).not.toThrow();
    });

    test('rejects choosing the revealed door', () => {
      expect(() => validateFinalDoor(0, 2, 2)).toThrow('revealed_door_cannot_be_final');
    });

    test('rejects invalid door values', () => {
      expect(() => validateFinalDoor(0, 2, 3)).toThrow('invalid_final_door');
    });
  });

  describe('deriveOutcome', () => {
    test('returns correct strategy and won boolean', () => {
      expect(
        deriveOutcome({ initialDoor: 0, revealedDoor: 2, prizeDoor: 0, finalDoor: 0 })
      ).toEqual({ strategy: 'stay', won: true });

      expect(
        deriveOutcome({ initialDoor: 0, revealedDoor: 2, prizeDoor: 1, finalDoor: 0 })
      ).toEqual({ strategy: 'stay', won: false });

      expect(
        deriveOutcome({ initialDoor: 0, revealedDoor: 2, prizeDoor: 1, finalDoor: 1 })
      ).toEqual({ strategy: 'switch', won: true });

      expect(
        deriveOutcome({ initialDoor: 0, revealedDoor: 2, prizeDoor: 0, finalDoor: 1 })
      ).toEqual({ strategy: 'switch', won: false });
    });
  });
});
