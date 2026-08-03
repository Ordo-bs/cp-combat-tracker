export interface Initiative {
  current: number;
  pending: number;
  dirty: boolean;
}

export function createInitiative(value = 0): Initiative {
  return { current: value, pending: value, dirty: false };
}

export function markInitiativePending(initiative: Initiative, pending: number): Initiative {
  return {
    current: initiative.current,
    pending,
    dirty: pending !== initiative.current,
  };
}

export function commitInitiative(initiative: Initiative): Initiative {
  return { current: initiative.pending, pending: initiative.pending, dirty: false };
}
