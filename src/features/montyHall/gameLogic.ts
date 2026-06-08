import type { DoorIndex } from './types';

export const DOORS: readonly DoorIndex[] = [0, 1, 2] as const;

export function getSwitchDoor(initialDoor: DoorIndex, revealedDoor: DoorIndex): DoorIndex {
  const sum = initialDoor + revealedDoor;
  const switchDoor = 3 - sum;
  return switchDoor as DoorIndex;
}

export function formatRate(rate: number): string {
  const percentage = rate * 100;
  const formatted = percentage.toFixed(1) + '%';
  return formatted;
}

export function buildTwentyDoorExplanation(selectedIndex: number): {
  index: number;
  state: 'chosen' | 'closed' | 'opened' | 'remaining';
}[] {
  const result: { index: number; state: 'chosen' | 'closed' | 'opened' | 'remaining' }[] = [];
  
  const remainingIndex = selectedIndex === 19 ? 0 : 19;
  
  for (let i = 0; i < 20; i++) {
    let state: 'chosen' | 'closed' | 'opened' | 'remaining';
    if (i === selectedIndex) {
      state = 'chosen';
    } else if (i === remainingIndex) {
      state = 'remaining';
    } else {
      state = 'opened';
    }
    result.push({ index: i, state });
  }
  
  return result;
}
