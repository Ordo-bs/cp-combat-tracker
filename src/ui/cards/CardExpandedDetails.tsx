import type { UiElement } from "../types";
import { isNpcSheet, type CombatSheet } from "../../domain/sheets/CombatSheet";
import type { IDamageThresholdService } from "../../services/DamageThresholdService";
import { ObsidianIcon } from "../editor/EditorFields";
import {
  buildExpandedStatusItems,
  expandedBodyPartCells,
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
  const bodyCells = isNpcSheet(sheet) ? expandedBodyPartCells(sheet.body) : [];

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
            <dt>Total damage</dt>
            <dd>{sheet.damage.totalDamage}</dd>
            <dt>Modified stun save</dt>
            <dd>{formatDerivedSave(derived.modifiedStunSave)}</dd>
            <dt>Modified death save</dt>
            <dd>{formatDerivedSave(derived.modifiedDeathSave)}</dd>
          </dl>
          <ul className="cp-card-details__parts">
            {bodyCells.map((cell) => (
              <li key={cell.key} className="cp-card-details__part" title={cell.label}>
                <span>
                  {cell.code} {cell.sp}/{cell.damage}
                </span>
                {cell.cybernetic && (
                  <span className="cp-card-details__part-icon" aria-label="Cybernetic">
                    <ObsidianIcon icon="cpu" />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
