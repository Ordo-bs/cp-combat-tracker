import { StatusType } from "../../domain/status/StatusType";
import { setStatus } from "../../domain/status/Status";
import { isNpcSheet, isVehicleSheet, type CombatSheet } from "../../domain/sheets/CombatSheet";
import { getOngoingEffects } from "../../domain/damage/sheetEffects";

export function syncDerivedStatuses(sheet: CombatSheet): void {
  const effects = getOngoingEffects(sheet).filter((effect) => effect.applicationsRemaining > 0);
  const hasFire = effects.some((effect) => effect.type === "fire");
  const hasAcid = effects.some((effect) => effect.type === "acid");
  sheet.statuses = setStatus(sheet.statuses, StatusType.ON_FIRE, hasFire);
  sheet.statuses = setStatus(sheet.statuses, StatusType.ACID, hasAcid);

  if (isNpcSheet(sheet)) {
    sheet.statuses = setStatus(sheet.statuses, StatusType.DEAD, sheet.damage.isDead);
    for (const part of sheet.body) {
      part.acid = effects.some(
        (effect) => effect.type === "acid" && effect.location === part.location,
      );
    }
  }

  if (isVehicleSheet(sheet)) {
    sheet.statuses = setStatus(sheet.statuses, StatusType.DESTROYED, sheet.isDestroyed);
  }
}

export function terminateEffectsOnDeath(sheet: CombatSheet): void {
  if (isNpcSheet(sheet) && sheet.damage.isDead) {
    sheet.damage.ongoingEffects = [];
  }
}
