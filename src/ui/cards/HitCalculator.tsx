import { Notice } from "obsidian";
import { useMemo, useState } from "react";
import { ActionType, createAction } from "../../actions/ActionRegistry";
import type { ResolutionResult } from "../../domain/damage/DamageResult";
import { DAMAGE_TYPES, DAMAGE_TYPE_LABELS, type DamageType } from "../../domain/damage/DamageTypes";
import { PLAYER_FIRE_SOURCES, FIRE_SOURCE_LABELS, type FireSource } from "../../domain/damage/FireSource";
import { HIT_LOCATION_RANGES } from "../../domain/damage/HitLocation";
import { BodyLocation } from "../../domain/sheets/components";
import { isNpcSheet, isVehicleSheet, type CombatSheet } from "../../domain/sheets/CombatSheet";
import { getVisibleHitFields } from "../../services/damage/hitFields";
import { usePluginContext } from "../context/EncounterContext";
import type { UiElement } from "../types";

interface HitCalculatorProps {
  sheet: CombatSheet;
  onApplied?: () => void;
}

export function HitCalculator({ sheet, onApplied }: HitCalculatorProps): UiElement | null {
  const { actionExecutor, damageTypeRegistry } = usePluginContext();
  const isVehicle = isVehicleSheet(sheet);
  const [damageType, setDamageType] = useState<DamageType>("regular");
  const [rawDamage, setRawDamage] = useState("");
  const [location, setLocation] = useState<BodyLocation>(BodyLocation.TORSO);
  const [locationB, setLocationB] = useState<BodyLocation>(BodyLocation.HEAD);
  const [damageReduction, setDamageReduction] = useState("0");
  const [additionalPenalty, setAdditionalPenalty] = useState("0");
  const [fireSource, setFireSource] = useState<FireSource>("flamethrower");

  const definition = useMemo(
    () => damageTypeRegistry.get(damageType).definition,
    [damageType, damageTypeRegistry],
  );
  const fields = getVisibleHitFields(definition, { isVehicle, fireSource });

  const availableTypes = DAMAGE_TYPES.filter((type) => {
    const def = damageTypeRegistry.get(type).definition;
    return def.supportedTargets.includes(isVehicle ? "Vehicle" : "NPC");
  });

  const apply = (): void => {
    const request = {
      targetId: sheet.id,
      damageType,
      rawDamage: fields.hitDamage ? parseOptionalInteger(rawDamage) : undefined,
      hitLocation: fields.hitLocation || fields.fireLocationCount === 1 ? location : undefined,
      damageReduction: fields.damageReduction ? Number.parseInt(damageReduction, 10) : undefined,
      additionalPenalty: fields.additionalPenalty ? Number.parseInt(additionalPenalty, 10) : undefined,
      fireSource: fields.fireSource ? fireSource : undefined,
      fireLocations:
        fields.fireLocationCount === 2
          ? [location, locationB]
          : fields.fireLocationCount === 1
            ? [location]
            : undefined,
    };
    const result = actionExecutor.execute(
      createAction({ type: ActionType.ResolveHit, request }),
    );
    if (!result.success) {
      new Notice(result.errors[0] ?? "Hit failed.");
      return;
    }
    const data = result.data as ResolutionResult;
    const message = [data.summary, ...data.reminders].filter(Boolean).join("\n");
    if (message) {
      new Notice(message);
    }
    onApplied?.();
  };

  if (!isNpcSheet(sheet) && !isVehicle) {
    return null;
  }

  return (
    <div className="cp-hit-calculator">
      <label className="cp-hit-calculator__field">
        <span>Damage Type</span>
        <select value={damageType} onChange={(event) => setDamageType(event.target.value as DamageType)}>
          {availableTypes.map((type) => (
            <option key={type} value={type}>
              {DAMAGE_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>

      {fields.fireSource && (
        <label className="cp-hit-calculator__field">
          <span>Fire Source</span>
          <select value={fireSource} onChange={(event) => setFireSource(event.target.value as FireSource)}>
            {PLAYER_FIRE_SOURCES.map((source) => (
              <option key={source} value={source}>
                {FIRE_SOURCE_LABELS[source]}
              </option>
            ))}
          </select>
        </label>
      )}

      {(fields.hitLocation || fields.fireLocationCount >= 1) && (
        <label className="cp-hit-calculator__field">
          <span>{fields.fireLocationCount === 2 ? "First body part" : "Hit Location"}</span>
          <select value={location} onChange={(event) => setLocation(event.target.value as BodyLocation)}>
            {HIT_LOCATION_RANGES.map((row) => (
              <option key={row.location} value={row.location}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {fields.fireLocationCount === 2 && (
        <label className="cp-hit-calculator__field">
          <span>Second body part</span>
          <select value={locationB} onChange={(event) => setLocationB(event.target.value as BodyLocation)}>
            {HIT_LOCATION_RANGES.map((row) => (
              <option key={row.location} value={row.location}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {fields.hitDamage && (
        <label className="cp-hit-calculator__field">
          <span>Hit Damage</span>
          <input type="number" min={0} value={rawDamage} onChange={(event) => setRawDamage(event.target.value)} />
        </label>
      )}

      {fields.damageReduction && (
        <label className="cp-hit-calculator__field">
          <span>Damage Reduction</span>
          <input
            type="number"
            min={0}
            value={damageReduction}
            onChange={(event) => setDamageReduction(event.target.value)}
          />
        </label>
      )}

      {fields.additionalPenalty && (
        <label className="cp-hit-calculator__field">
          <span>Additional Stun Penalty</span>
          <input
            type="number"
            value={additionalPenalty}
            onChange={(event) => setAdditionalPenalty(event.target.value)}
          />
        </label>
      )}

      <button type="button" className="mod-cta" onClick={apply}>
        Apply
      </button>
    </div>
  );
}

function parseOptionalInteger(value: string): number | undefined {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : undefined;
}
