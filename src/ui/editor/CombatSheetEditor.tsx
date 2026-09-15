import { Notice } from "obsidian";
import { useCallback, useEffect, useMemo, useState } from "react";
import { findCombatSheet } from "../../domain/combat/CombatEncounter";
import { CombatSheetType } from "../../domain/combat/CombatSheetType";
import { commitInitiative, createInitiative } from "../../domain/combat/Initiative";
import { WOUND_STATE_LABELS } from "../../domain/rules/WoundState";
import { hasStatus, setStatus } from "../../domain/status/Status";
import { StatusType } from "../../domain/status/StatusType";
import {
  isNpcSheet,
  isPcSheet,
  isVehicleSheet,
  type CombatSheet,
} from "../../domain/sheets/CombatSheet";
import {
  BodyLocation,
  createCyberneticProperties,
  type BodyPart,
} from "../../domain/sheets/components";
import type { CombatSheetEditorViewState } from "./editorTypes";
import {
  BODY_LOCATION_LABELS,
  BTM_OPTIONS,
  SHEET_TYPE_LABELS,
  statusesForSheetType,
  WOUND_STATE_OPTIONS,
} from "./editorLabels";
import {
  CheckboxField,
  Field,
  NumberInput,
  ReadOnlyField,
  Section,
  TextInput,
} from "./EditorFields";
import type { UiElement } from "../types";
import { useEncounter, usePluginContext } from "../context/EncounterContext";

const DEV_MODE = false;

interface CombatSheetEditorProps {
  viewState: CombatSheetEditorViewState;
  onClose: () => void;
}

export function CombatSheetEditor({ viewState, onClose }: CombatSheetEditorProps): UiElement {
  const encounter = useEncounter();
  const { factory, combatService, initiativeService, damageThresholdService, validationService } =
    usePluginContext();

  const isDraft = viewState.mode === "draft";
  const existingSheet = !isDraft && encounter
    ? findCombatSheet(encounter, viewState.combatantId ?? "")
    : undefined;

  const [draftSheet, setDraftSheet] = useState<CombatSheet>(() =>
    viewState.draftSheet
      ? structuredClone(viewState.draftSheet)
      : factory.createDraft(viewState.sheetType ?? CombatSheetType.NPC, "New Combatant", 0),
  );

  const sheet = isDraft ? draftSheet : existingSheet;

  const validation = useMemo(
    () => (sheet ? validationService.validateCombatSheet(sheet) : validationService.validateName("")),
    [sheet, validationService],
  );

  const persistSheet = useCallback(
    (next: CombatSheet) => {
      if (isDraft) {
        setDraftSheet(next);
        return;
      }
      if (!viewState.combatantId) {
        return;
      }
      const result = combatService.updateCombatSheet(viewState.combatantId, next);
      if (!result.valid) {
        new Notice(result.errors.join(" "));
      }
    },
    [combatService, isDraft, viewState.combatantId],
  );

  const updateName = (name: string): void => {
    if (!sheet) return;
    persistSheet({ ...sheet, name });
  };

  const updateInitiative = (value: number): void => {
    if (!sheet) return;
    if (isDraft) {
      persistSheet({ ...sheet, initiative: createInitiative(value) });
      return;
    }
    if (!viewState.combatantId) return;
    const ok = initiativeService.updatePending(viewState.combatantId, value);
    if (!ok) {
      new Notice("Invalid initiative.");
    }
  };

  const toggleStatus = (type: StatusType, active: boolean): void => {
    if (!sheet) return;
    persistSheet({ ...sheet, statuses: setStatus(sheet.statuses, type, active) });
  };

  const handleConfirm = (): void => {
    if (!sheet || !isDraft) return;
    const finalized = {
      ...structuredClone(sheet),
      name: sheet.name.trim(),
      initiative: commitInitiative(sheet.initiative),
    };
    const result = combatService.confirmDraft(finalized);
    if (!result.valid) {
      new Notice(result.errors.join(" "));
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (!isDraft && viewState.combatantId && !existingSheet) {
      new Notice("Combatant no longer exists.");
      onClose();
    }
  }, [existingSheet, isDraft, onClose, viewState.combatantId]);

  if (!sheet) {
    return <div className="cp-editor">Combat sheet not found.</div>;
  }

  const derived = isNpcSheet(sheet)
    ? damageThresholdService.derive(
        sheet.damage.totalDamage,
        sheet.damage.baseStunSave,
        sheet.damage.baseDeathSave,
      )
    : null;

  return (
    <div className="cp-editor">
      <header className="cp-editor__header">
        <div className="cp-editor__header-main">
          <h2 className="cp-editor__title">
            {isDraft ? "New Combat Sheet" : "Edit Combat Sheet"}
          </h2>
          <span className="cp-editor__type-badge">{SHEET_TYPE_LABELS[sheet.sheetType]}</span>
        </div>
        {isDraft ? (
          <div className="cp-editor__header-actions">
            <Field label="Type">
              <select
                className="cp-editor__input"
                value={sheet.sheetType}
                onChange={(event) => {
                  const sheetType = event.target.value as CombatSheetType;
                  setDraftSheet(
                    factory.createDraft(sheetType, draftSheet.name, draftSheet.initiative.pending),
                  );
                }}
              >
                {Object.values(CombatSheetType).map((type) => (
                  <option key={type} value={type}>
                    {SHEET_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </Field>
            <button type="button" className="mod-cta" onClick={handleConfirm} disabled={!validation.valid}>
              Confirm
            </button>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" onClick={onClose}>
            Close
          </button>
        )}
      </header>

      {DEV_MODE && (
        <div className="cp-editor__debug">
          <span>ID: {sheet.id}</span>
          {sheet.runtimeMetadata.templateName && (
            <span>Template: {sheet.runtimeMetadata.templateName}</span>
          )}
        </div>
      )}

      {isDraft && !validation.valid && (
        <div className="cp-editor__validation-banner">
          {validation.errors.map((error: string) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}

      <Section title="General">
        <Field label="Name">
          <TextInput value={sheet.name} onChange={updateName} autoFocus={isDraft} />
        </Field>
        <Field
          label="Initiative"
          hint="Pending initiative; queue reorders at round wrap."
        >
          <NumberInput value={sheet.initiative.pending} onChange={updateInitiative} min={0} />
        </Field>
      </Section>

      <Section title="Statuses">
        <div className="cp-editor__checkbox-grid">
          {statusesForSheetType(sheet.sheetType).map((type) => (
            <CheckboxField
              key={type}
              label={type.replace(/_/g, " ")}
              checked={hasStatus(sheet.statuses, type)}
              onChange={(active) => toggleStatus(type, active)}
            />
          ))}
        </div>
      </Section>

      {isPcSheet(sheet) && (
        <Section title="Wound State">
          <Field label="Wound State">
            <select
              className="cp-editor__input"
              value={sheet.woundState}
              onChange={(event) =>
                persistSheet({ ...sheet, woundState: event.target.value as typeof sheet.woundState })
              }
            >
              {WOUND_STATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </Section>
      )}

      {isNpcSheet(sheet) && derived && (
        <>
          <Section title="Core Statistics">
            <Field label="BTM">
              <select
                className="cp-editor__input"
                value={sheet.damage.btm}
                onChange={(event) =>
                  persistSheet({
                    ...sheet,
                    damage: { ...sheet.damage, btm: Number.parseInt(event.target.value, 10) },
                  })
                }
              >
                {BTM_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Total Damage">
              <NumberInput
                value={sheet.damage.totalDamage}
                onChange={(totalDamage) =>
                  persistSheet({ ...sheet, damage: { ...sheet.damage, totalDamage } })
                }
                min={0}
              />
            </Field>
            <Field label="Base Stun Save">
              <NumberInput
                value={sheet.damage.baseStunSave}
                onChange={(baseStunSave) =>
                  persistSheet({ ...sheet, damage: { ...sheet.damage, baseStunSave } })
                }
              />
            </Field>
            <ReadOnlyField label="Modified Stun Save" value={derived.modifiedStunSave === null ? "—" : String(derived.modifiedStunSave)} />
            <Field label="Base Death Save">
              <NumberInput
                value={sheet.damage.baseDeathSave}
                onChange={(baseDeathSave) =>
                  persistSheet({ ...sheet, damage: { ...sheet.damage, baseDeathSave } })
                }
              />
            </Field>
            <ReadOnlyField label="Modified Death Save" value={derived.modifiedDeathSave === null ? "—" : String(derived.modifiedDeathSave)} />
            <ReadOnlyField label="Wound State" value={WOUND_STATE_LABELS[derived.woundState]} />
            <CheckboxField
              label="Dead"
              checked={sheet.damage.isDead}
              onChange={(isDead) =>
                persistSheet({ ...sheet, damage: { ...sheet.damage, isDead } })
              }
            />
          </Section>

          <Section title="Ammo">
            <Field label="Maximum Shots">
              <NumberInput
                value={sheet.ammo.maximumShots}
                onChange={(maximumShots) =>
                  persistSheet({ ...sheet, ammo: { ...sheet.ammo, maximumShots } })
                }
                min={0}
              />
            </Field>
            <Field label="Remaining Shots">
              <NumberInput
                value={sheet.ammo.remainingShots}
                onChange={(remainingShots) =>
                  persistSheet({ ...sheet, ammo: { ...sheet.ammo, remainingShots } })
                }
                min={0}
              />
            </Field>
            <Field label="Remaining Magazines">
              <NumberInput
                value={sheet.ammo.remainingMagazines}
                onChange={(remainingMagazines) =>
                  persistSheet({ ...sheet, ammo: { ...sheet.ammo, remainingMagazines } })
                }
                min={0}
              />
            </Field>
          </Section>

          <Section title="Cyberware Trackers">
            <CheckboxField
              label="Sandevistan"
              checked={sheet.trackers.hasSandevistan}
              onChange={(hasSandevistan) =>
                persistSheet({ ...sheet, trackers: { ...sheet.trackers, hasSandevistan } })
              }
            />
            <CheckboxField
              label="Pain Editor"
              checked={sheet.trackers.hasPainEditor}
              onChange={(hasPainEditor) =>
                persistSheet({ ...sheet, trackers: { ...sheet.trackers, hasPainEditor } })
              }
            />
            <CheckboxField
              label="Adrenal Booster"
              checked={sheet.trackers.hasAdrenalBooster}
              onChange={(hasAdrenalBooster) =>
                persistSheet({ ...sheet, trackers: { ...sheet.trackers, hasAdrenalBooster } })
              }
            />
          </Section>

          <Section title="Body">
            {sheet.body.map((part, index) => (
              <BodyPartEditor
                key={part.location}
                part={part}
                onChange={(updated) => {
                  const body = [...sheet.body];
                  body[index] = updated;
                  persistSheet({ ...sheet, body });
                }}
              />
            ))}
          </Section>
        </>
      )}

      {isVehicleSheet(sheet) && (
        <>
          <Section title="Vehicle Stats">
            <Field label="SP">
              <NumberInput value={sheet.sp} onChange={(sp) => persistSheet({ ...sheet, sp })} min={0} />
            </Field>
            <Field label="SDP">
              <NumberInput value={sheet.sdp} onChange={(sdp) => persistSheet({ ...sheet, sdp })} min={0} />
            </Field>
            <CheckboxField
              label="Destroyed"
              checked={sheet.isDestroyed}
              onChange={(isDestroyed) => persistSheet({ ...sheet, isDestroyed })}
            />
          </Section>
        </>
      )}
    </div>
  );
}

function BodyPartEditor({
  part,
  onChange,
}: {
  part: BodyPart;
  onChange: (part: BodyPart) => void;
}): UiElement {
  const label = BODY_LOCATION_LABELS[part.location as BodyLocation] ?? part.location;

  return (
    <div className="cp-editor__body-part">
      <h4 className="cp-editor__body-part-title">{label}</h4>
      <Field label="SP">
        <NumberInput value={part.sp} onChange={(sp) => onChange({ ...part, sp })} min={0} />
      </Field>
      <Field label="Damage">
        <NumberInput value={part.damage} onChange={(damage) => onChange({ ...part, damage })} min={0} />
      </Field>
      <CheckboxField
        label="Hard SP"
        checked={part.isHardSp}
        onChange={(isHardSp) => onChange({ ...part, isHardSp })}
      />
      <CheckboxField
        label="Destroyed"
        checked={part.destroyed}
        onChange={(destroyed) => onChange({ ...part, destroyed })}
      />
      <CheckboxField
        label="Cybernetic"
        checked={part.cybernetic}
        onChange={(cybernetic) => {
          onChange({
            ...part,
            cybernetic,
            cyberneticProperties: cybernetic
              ? (part.cyberneticProperties ?? createCyberneticProperties())
              : undefined,
          });
        }}
      />
      {part.cybernetic && part.cyberneticProperties && (
        <div className="cp-editor__cybernetic">
          <Field label="SDP">
            <NumberInput
              value={part.cyberneticProperties.sdp}
              onChange={(sdp) =>
                onChange({
                  ...part,
                  cyberneticProperties: { ...part.cyberneticProperties!, sdp },
                })
              }
              min={0}
            />
          </Field>
          <Field label="SDP damage taken">
            <NumberInput
              value={part.cyberneticProperties.sdpDamageTaken}
              onChange={(sdpDamageTaken) =>
                onChange({
                  ...part,
                  cyberneticProperties: { ...part.cyberneticProperties!, sdpDamageTaken },
                })
              }
              min={0}
            />
          </Field>
          <CheckboxField
            label="Disabled"
            checked={part.cyberneticProperties.disabled}
            onChange={(disabled) =>
              onChange({
                ...part,
                cyberneticProperties: { ...part.cyberneticProperties!, disabled },
              })
            }
          />
          <CheckboxField
            label="Hydraulic Rams"
            checked={part.cyberneticProperties.hydraulicRams}
            onChange={(hydraulicRams) =>
              onChange({
                ...part,
                cyberneticProperties: { ...part.cyberneticProperties!, hydraulicRams },
              })
            }
          />
          <CheckboxField
            label="Reinforced Joints"
            checked={part.cyberneticProperties.reinforcedJoints}
            onChange={(reinforcedJoints) =>
              onChange({
                ...part,
                cyberneticProperties: { ...part.cyberneticProperties!, reinforcedJoints },
              })
            }
          />
          <CheckboxField
            label="Thickened Myomar"
            checked={part.cyberneticProperties.thickenedMyomar}
            onChange={(thickenedMyomar) =>
              onChange({
                ...part,
                cyberneticProperties: { ...part.cyberneticProperties!, thickenedMyomar },
              })
            }
          />
          <CheckboxField
            label="EMP Shielding"
            checked={part.cyberneticProperties.empShielding}
            onChange={(empShielding) =>
              onChange({
                ...part,
                cyberneticProperties: { ...part.cyberneticProperties!, empShielding },
              })
            }
          />
        </div>
      )}
    </div>
  );
}
