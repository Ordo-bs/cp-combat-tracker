import type { ResolutionResult } from "../../domain/damage/DamageResult";
import type { UiElement } from "../types";

interface ResolutionMessageProps {
  result: ResolutionResult;
}

export function ResolutionMessage({ result }: ResolutionMessageProps): UiElement {
  return (
    <div className="cp-resolution-message">
      <pre>{result.summary}</pre>
      {result.reminders.map((reminder) => (
        <p key={reminder} className="cp-resolution-message__reminder">
          {reminder}
        </p>
      ))}
      {result.errors.length > 0 && (
        <p className="cp-editor__error">{result.errors.join(" ")}</p>
      )}
    </div>
  );
}
