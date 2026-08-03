export interface InitiativeQueue {
  orderedIds: string[];
  dirty: boolean;
}

export function createInitiativeQueue(): InitiativeQueue {
  return { orderedIds: [], dirty: false };
}

export function markQueueDirty(queue: InitiativeQueue): InitiativeQueue {
  return { ...queue, dirty: true };
}
