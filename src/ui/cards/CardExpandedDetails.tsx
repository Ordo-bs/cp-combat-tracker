import type { UiElement } from "../types";
import { isNpcSheet, type CombatSheet } from "../../domain/sheets/CombatSheet";
import type { IDamageThresholdService } from "../../services/DamageThresholdService";
import {
  buildExpandedStatusItems,
  expandedBodyPartLines,
  formatDerivedSave,
} from "./expandedCardModel";

interface CardExpandedDetailsProps {
  sheet: CombatSheet;
  damageThresholdService: IDamageThresholdService;
}

export function CardExpandedDetails({
  sheet,
  damageThresholdService,
}: CardExpandedDetailsProps): UiElement {
  const statuses = buildExpandedStatusItems(sheet, damageThresholdService);
  const derived = isNpcSheet(sheet)
    ? damageThresholdService.derive(
        sheet.damage.totalDamage,
        sheet.damage.baseStunSave,
        sheet.damage.baseDeathSave,
      )
    : null;
  const bodyLines = isNpcSheet(sheet) ? expandedBodyPartLines(sheet.body) : [];

  return (
    <div className="cp-card-details">
      <section className="cp-card-details__section" aria-label="Statuses">
        {statuses.length === 0 ? (
          <p className="cp-card-details__empty">No statuses</p>
        ) : (
          <div className="cp-card__status-bar">
            {statuses.map((item) => (
              <span key={item.key} className="cp-card__status-badge">
                {item.label}
              </span>
            ))}
          </div>
        )}
      </section>

      {derived && isNpcSheet(sheet) && (
        <section className="cp-card-details__section" aria-label="Combat sheet">
          <dl className="cp-card-details__stats">
            <div>
              <dt>Total damage</dt>
              <dd>{sheet.damage.totalDamage}</dd>
            </div>
            <div>
              <dt>Modified Stun Save</dt>
              <dd>{formatDerivedSave(derived.modifiedStunSave)}</dd>
            </div>
            <div>
              <dt>Modified Death Save</dt>
              <dd>{formatDerivedSave(derived.modifiedDeathSave)}</dd>
            </div>
          </dl>
          {bodyLines.length > 0 && (
            <ul className="cp-card-details__parts">
              {bodyLines.map((line) => (
                <li key={line.key}>{line.text}</li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
