export enum WoundState {
  NONE = "NONE",
  LIGHT = "LIGHT",
  SERIOUS = "SERIOUS",
  CRITICAL = "CRITICAL",
  MORTAL = "MORTAL",
}

export const WOUND_STATE_LABELS: Record<WoundState, string> = {
  [WoundState.NONE]: "No wounds",
  [WoundState.LIGHT]: "Lightly wounded",
  [WoundState.SERIOUS]: "Seriously wounded",
  [WoundState.CRITICAL]: "Critically wounded",
  [WoundState.MORTAL]: "Mortally wounded",
};

/** Card wound status. Mortal uses death-save penalty (0 → Mortal 0, -1 → Mortal 1). */
export function woundStateCardLabel(
  wound: WoundState,
  deathPenalty?: number | null,
): string | null {
  switch (wound) {
    case WoundState.NONE:
      return "Unharmed";
    case WoundState.LIGHT:
      return "Light";
    case WoundState.SERIOUS:
      return "Serious";
    case WoundState.CRITICAL:
      return "Critical";
    case WoundState.MORTAL:
      if (deathPenalty === null) {
        return "Mortal +";
      }
      if (typeof deathPenalty === "number") {
        return `Mortal ${-deathPenalty}`;
      }
      return "Mortal";
    default:
      return null;
  }
}

/** Full wound name for the expanded card. `null` means no wound line. */
export function woundStateExpandedLabel(
  wound: WoundState,
  deathPenalty?: number | null,
): string | null {
  switch (wound) {
    case WoundState.NONE:
      return null;
    case WoundState.LIGHT:
    case WoundState.SERIOUS:
    case WoundState.CRITICAL:
      return WOUND_STATE_LABELS[wound];
    case WoundState.MORTAL:
      if (deathPenalty === null) {
        return "Mortal +";
      }
      if (typeof deathPenalty === "number") {
        return `Mortal ${-deathPenalty}`;
      }
      return WOUND_STATE_LABELS[WoundState.MORTAL];
    default:
      return null;
  }
}
