import { describe, expect, it } from "vitest";
import { CombatSheetType } from "../domain/combat/CombatSheetType";
import { BodyLocation, createCyberneticProperties } from "../domain/sheets/components";
import { isNpcSheet } from "../domain/sheets/CombatSheet";
import { remainingCyberneticSdp } from "../domain/damage/sheetEffects";
import { parseCombatTemplate } from "../infrastructure/parser/CombatSheetParser";
import { serializeCombatSheetAsTemplate } from "../infrastructure/parser/serializeCombatSheetTemplate";
import { CombatSheetFactory } from "../services/CombatSheetFactory";
import { DiceService } from "../services/DiceService";

function parseSerialized(markdown: string) {
  return parseCombatTemplate({
    markdown,
    vaultPath: "clipboard.md",
    fileName: "clipboard.md",
    displayName: "clipboard",
  });
}

describe("serializeCombatSheetAsTemplate", () => {
  const factory = new CombatSheetFactory(new DiceService());

  it("serializes an NPC sheet that round-trips through the parser", () => {
    const sheet = factory.createDraft(CombatSheetType.NPC, "Maelstrom Ganger", 7);
    if (!isNpcSheet(sheet)) {
      throw new Error("expected NPC");
    }
    sheet.damage.btm = -2;
    sheet.damage.baseStunSave = 8;
    sheet.ammo.maximumShots = 30;
    sheet.ammo.remainingShots = 30;
    sheet.ammo.remainingMagazines = 3;
    const head = sheet.body.find((part) => part.location === BodyLocation.HEAD)!;
    head.sp = 2;
    const arm = sheet.body.find((part) => part.location === BodyLocation.LEFT_ARM)!;
    arm.cybernetic = true;
    arm.cyberneticProperties = { ...createCyberneticProperties(), hydraulicRams: true };

    const markdown = serializeCombatSheetAsTemplate(sheet);
    expect(markdown).toContain("```combat-sheet");
    expect(markdown).toContain("type: npc");
    expect(markdown).toContain("body.head.sp: 2");
    expect(markdown).toContain("body.leftArm.cybernetic: true");
    expect(markdown).not.toContain("baseDeathSave");

    const parsed = parseSerialized(markdown);
    expect(parsed.success).toBe(true);
    expect(parsed.template?.name).toBe("Maelstrom Ganger");
    if (parsed.template?.sheetType !== CombatSheetType.NPC) {
      throw new Error("expected NPC template");
    }
    expect(parsed.template.btm).toBe(-2);
    expect(parsed.template.baseStunSave).toBe(8);
    expect(parsed.template.maximumShots).toBe(30);
    expect(parsed.template.remainingShots).toBe(30);
    expect(parsed.template.body[BodyLocation.HEAD].sp).toBe(2);
    expect(parsed.template.body[BodyLocation.LEFT_ARM].cybernetic).toBe(true);
    expect(parsed.template.body[BodyLocation.LEFT_ARM].hydraulicRams).toBe(true);

    const instantiated = factory.instantiateFromTemplate(parsed.template);
    if (!isNpcSheet(instantiated)) {
      throw new Error("expected NPC");
    }
    const instantiatedArm = instantiated.body.find((part) => part.location === BodyLocation.LEFT_ARM)!;
    expect(remainingCyberneticSdp(BodyLocation.LEFT_ARM, instantiatedArm.cyberneticProperties!)).toBe(40);
  });

  it("omits default cybernetic SDP", () => {
    const sheet = factory.createDraft(CombatSheetType.NPC, "Chrome", 0);
    if (!isNpcSheet(sheet)) {
      throw new Error("expected NPC");
    }
    sheet.damage.btm = 0;
    sheet.damage.baseStunSave = 8;
    const arm = sheet.body.find((part) => part.location === BodyLocation.LEFT_ARM)!;
    arm.cybernetic = true;
    arm.cyberneticProperties = createCyberneticProperties();
    expect(arm.cyberneticProperties.hydraulicRams).toBe(false);

    const markdown = serializeCombatSheetAsTemplate(sheet);
    expect(markdown).toContain("body.leftArm.cybernetic: true");
    expect(markdown).not.toContain("body.leftArm.sdp");

    const parsed = parseSerialized(markdown);
    expect(parsed.success).toBe(true);
    if (parsed.template?.sheetType !== CombatSheetType.NPC) {
      throw new Error("expected NPC template");
    }
    const instantiated = factory.instantiateFromTemplate(parsed.template);
    if (!isNpcSheet(instantiated)) {
      throw new Error("expected NPC");
    }
    const instantiatedArm = instantiated.body.find((part) => part.location === BodyLocation.LEFT_ARM)!;
    expect(remainingCyberneticSdp(BodyLocation.LEFT_ARM, instantiatedArm.cyberneticProperties!)).toBe(30);
  });
});
