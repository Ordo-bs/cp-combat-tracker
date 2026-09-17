import { describe, expect, it } from "vitest";
import { CombatSheetType } from "../domain/combat/CombatSheetType";
import { isNpcSheet } from "../domain/sheets/CombatSheet";
import { CombatSheetFactory } from "../services/CombatSheetFactory";
import { DiceService } from "../services/DiceService";
import { ValidationService } from "../services/ValidationService.impl";

describe("Combat sheet editor validation", () => {
  const factory = new CombatSheetFactory(new DiceService());
  const validation = new ValidationService();

  it("accepts a valid NPC draft", () => {
    const sheet = factory.createDraft(CombatSheetType.NPC, "Ganger", 15);
    expect(validation.validateCombatSheet(sheet).valid).toBe(true);
  });

  it("rejects remaining shots above maximum", () => {
    const sheet = factory.createDraft(CombatSheetType.NPC, "Ganger", 15);
    if (!isNpcSheet(sheet)) throw new Error("expected NPC");
    sheet.ammo.remainingShots = 100;
    const result = validation.validateCombatSheet(sheet);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("maximum"))).toBe(true);
  });

  it("rejects invalid BTM", () => {
    const sheet = factory.createDraft(CombatSheetType.NPC, "Ganger", 15);
    if (!isNpcSheet(sheet)) throw new Error("expected NPC");
    sheet.damage.btm = -7;
    expect(validation.validateCombatSheet(sheet).valid).toBe(false);
  });

  it("keeps + Add NPC drafts invalid until mandatory fields are filled", () => {
    const sheet = factory.createEmptyDraft(CombatSheetType.NPC);
    expect(validation.validateCombatSheet(sheet).valid).toBe(false);
    if (!isNpcSheet(sheet)) throw new Error("expected NPC");
    expect(sheet.name).toBe("");
    expect(Number.isInteger(sheet.initiative.pending)).toBe(false);
    expect(Number.isInteger(sheet.damage.btm)).toBe(false);
    expect(Number.isInteger(sheet.damage.baseStunSave)).toBe(false);
    expect(Number.isInteger(sheet.damage.baseDeathSave)).toBe(false);
  });
});
