import { describe, test, expect } from 'vitest';
import { getSwitchDoor, formatRate } from './gameLogic';
import type { DoorIndex } from './types';

describe('gameLogic helpers', () => {
  test('getSwitchDoor returns the correct remaining door', () => {
    expect(getSwitchDoor(0, 1)).toBe(2);
    expect(getSwitchDoor(0, 2)).toBe(1);
    expect(getSwitchDoor(1, 0)).toBe(2);
    expect(getSwitchDoor(1, 2)).toBe(0);
    expect(getSwitchDoor(2, 0)).toBe(1);
    expect(getSwitchDoor(2, 1)).toBe(0);
  });

  test('formatRate formats percentage correctly', () => {
    expect(formatRate(2 / 3)).toBe('66.7%');
    expect(formatRate(1 / 3)).toBe('33.3%');
    expect(formatRate(0)).toBe('0.0%');
    expect(formatRate(1)).toBe('100.0%');
  });

  test('switching vs staying outcome math holds true', () => {
    const doors: DoorIndex[] = [0, 1, 2];
    for (const initialDoor of doors) {
      for (const prizeDoor of doors) {
        const possibleRevealed = doors.filter(
          (d) => d !== initialDoor && d !== prizeDoor
        );
        const revealedDoor = possibleRevealed[0];
        
        const stayWon = initialDoor === prizeDoor;
        const switchDoor = getSwitchDoor(initialDoor, revealedDoor);
        const switchWon = switchDoor === prizeDoor;

        expect(stayWon).toBe(initialDoor === prizeDoor);
        expect(switchWon).toBe(initialDoor !== prizeDoor);
      }
    }
  });
});
