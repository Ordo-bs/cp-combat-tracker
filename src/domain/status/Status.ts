import type { StatusType } from "./StatusType";

export interface Status {
  type: StatusType;
  active: boolean;
  source?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface StatusEntry {
  type: StatusType;
  status: Status;
}

/** Serializable status map stored as plain entries. */
export type StatusCollectionData = StatusEntry[];

export function createStatus(type: StatusType, active = false): Status {
  return { type, active };
}

export function hasStatus(collection: StatusCollectionData, type: StatusType): boolean {
  return collection.some((entry) => entry.type === type && entry.status.active);
}

export function setStatus(
  collection: StatusCollectionData,
  type: StatusType,
  active: boolean,
): StatusCollectionData {
  const existing = collection.find((entry) => entry.type === type);
  if (existing) {
    return collection.map((entry) =>
      entry.type === type ? { ...entry, status: { ...entry.status, active } } : entry,
    );
  }
  return [...collection, { type, status: createStatus(type, active) }];
}

export function createEmptyStatusCollection(): StatusCollectionData {
  return [];
}
