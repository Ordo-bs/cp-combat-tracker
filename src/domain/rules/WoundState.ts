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
