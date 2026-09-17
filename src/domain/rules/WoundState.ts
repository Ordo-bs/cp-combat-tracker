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

/** Compact card tag. `null` means no wound tag. Mortal uses death-save penalty (0 → M0, -1 → M1). */
export function woundStateCardLabel(
  wound: WoundState,
  deathPenalty?: number | null,
): string | null {
  switch (wound) {
    case WoundState.NONE:
      return null;
    case WoundState.LIGHT:
      return "LI";
    case WoundState.SERIOUS:
      return "SE";
    case WoundState.CRITICAL:
      return "CR";
    case WoundState.MORTAL:
      if (deathPenalty === null) {
        return "M+";
      }
      if (typeof deathPenalty === "number") {
        return `M${-deathPenalty}`;
      }
      return "M";
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
