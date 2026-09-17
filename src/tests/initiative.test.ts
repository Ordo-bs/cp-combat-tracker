import { describe, expect, it, beforeEach } from "vitest";
import { createCombatEncounter } from "../domain/combat/CombatEncounter";
import { CombatSheetType } from "../domain/combat/CombatSheetType";
import { EventDispatcher } from "../events/EventDispatcher";
import { EncounterRepository } from "../infrastructure/repository/EncounterRepository";
import { CombatSheetFactory } from "../services/CombatSheetFactory";
import { DiceService } from "../services/DiceService";
import { InitiativeService } from "../services/InitiativeService";
import { ValidationService } from "../services/ValidationService.impl";

class MemoryRepository extends EncounterRepository {
  private data: ReturnType<EncounterRepository["get"]> = null;

  constructor() {
    super({ loadData: async () => null, saveData: async () => undefined } as never);
  }

  override async load(): Promise<void> {}

  override async save(): Promise<void> {}

  override get() {
    return this.data;
  }

  override async replace(encounter: ReturnType<EncounterRepository["get"]>): Promise<void> {
    this.data = encounter ? structuredClone(encounter) : null;
  }
}

describe("InitiativeService", () => {
  let repository: MemoryRepository;
  let initiativeService: InitiativeService;
  let factory: CombatSheetFactory;

  beforeEach(() => {
    repository = new MemoryRepository();
    const dispatcher = new EventDispatcher();
    const validation = new ValidationService();
    initiativeService = new InitiativeService(repository, validation, dispatcher);
    factory = new CombatSheetFactory(new DiceService());
  });

  it("keeps queue order mid-round when initiative is edited", async () => {
    const encounter = createCombatEncounter("enc-1");
    const alpha = factory.createDraft(CombatSheetType.NPC, "Alpha", 22);
    const bravo = factory.createDraft(CombatSheetType.NPC, "Bravo", 18);
    encounter.participants.push(alpha, bravo);
    encounter.initiativeQueue.orderedIds = [alpha.id, bravo.id];
    encounter.activeCombatantId = alpha.id;
    await repository.replace(encounter);

    initiativeService.updatePending(alpha.id, 5);
    expect(repository.get()?.initiativeQueue.orderedIds).toEqual([alpha.id, bravo.id]);

    initiativeService.nextTurn();
    expect(repository.get()?.initiativeQueue.orderedIds).toEqual([alpha.id, bravo.id]);
    expect(repository.get()?.activeCombatantId).toBe(bravo.id);
  });

  it("reorders at round wrap before highlighting the first combatant", async () => {
    const encounter = createCombatEncounter("enc-1");
    const alpha = factory.createDraft(CombatSheetType.NPC, "Alpha", 22);
    const bravo = factory.createDraft(CombatSheetType.NPC, "Bravo", 18);
    encounter.participants.push(alpha, bravo);
    encounter.initiativeQueue.orderedIds = [alpha.id, bravo.id];
    encounter.activeCombatantId = alpha.id;
    await repository.replace(encounter);

    initiativeService.updatePending(alpha.id, 5);
    initiativeService.nextTurn();
    initiativeService.nextTurn();

    expect(repository.get()?.initiativeQueue.orderedIds).toEqual([bravo.id, alpha.id]);
    expect(repository.get()?.initiativeQueue.dirty).toBe(false);
    expect(repository.get()?.activeCombatantId).toBe(bravo.id);
  });

  it("does not advance while the active combatant has unresolved effects", async () => {
    const encounter = createCombatEncounter("enc-1");
    const alpha = factory.createDraft(CombatSheetType.NPC, "Alpha", 22);
    const bravo = factory.createDraft(CombatSheetType.NPC, "Bravo", 18);
    if (alpha.sheetType !== "NPC") {
      throw new Error("expected NPC");
    }
    alpha.damage.ongoingEffects.push({
      id: "acid-1",
      type: "acid",
      targetId: alpha.id,
      createdAtActivation: 0,
      nextApplicationActivation: 0,
      applicationsRemaining: 2,
      totalApplications: 3,
    });
    alpha.runtimeMetadata.activationSequence = 0;
    encounter.participants.push(alpha, bravo);
    encounter.initiativeQueue.orderedIds = [alpha.id, bravo.id];
    encounter.activeCombatantId = alpha.id;
    await repository.replace(encounter);

    const advanced = initiativeService.nextTurn();
    expect(advanced).toBe(false);
    expect(repository.get()?.activeCombatantId).toBe(alpha.id);
  });

  it("increments activation sequence when a combatant becomes active", async () => {
    const encounter = createCombatEncounter("enc-1");
    const alpha = factory.createDraft(CombatSheetType.NPC, "Alpha", 22);
    const bravo = factory.createDraft(CombatSheetType.NPC, "Bravo", 18);
    encounter.participants.push(alpha, bravo);
    encounter.initiativeQueue.orderedIds = [alpha.id, bravo.id];
    encounter.activeCombatantId = alpha.id;
    await repository.replace(encounter);

    initiativeService.nextTurn();
    const after = repository.get();
    expect(after?.activeCombatantId).toBe(bravo.id);
    expect(after?.participants.find((sheet) => sheet.id === bravo.id)?.runtimeMetadata.activationSequence).toBe(1);
  });
});

describe("RuleTables", () => {
  it("maps damage to wound state", async () => {
    const { lookupDamageRule } = await import("../domain/rules/RuleTables");
    const { WoundState } = await import("../domain/rules/WoundState");

    expect(lookupDamageRule(0).wound).toBe(WoundState.NONE);
    expect(lookupDamageRule(4).wound).toBe(WoundState.LIGHT);
    expect(lookupDamageRule(9).wound).toBe(WoundState.CRITICAL);
    expect(lookupDamageRule(13).wound).toBe(WoundState.MORTAL);
  });

  it("formats card wound tags from death save penalty", async () => {
    const { lookupDamageRule } = await import("../domain/rules/RuleTables");
    const { WoundState, woundStateCardLabel } = await import("../domain/rules/WoundState");

    expect(woundStateCardLabel(WoundState.NONE)).toBeNull();
    expect(woundStateCardLabel(WoundState.LIGHT)).toBe("LI");
    expect(woundStateCardLabel(WoundState.MORTAL)).toBe("M");
    expect(woundStateCardLabel(WoundState.MORTAL, lookupDamageRule(13).deathPenalty)).toBe("M0");
    expect(woundStateCardLabel(WoundState.MORTAL, lookupDamageRule(17).deathPenalty)).toBe("M1");
    expect(woundStateCardLabel(WoundState.MORTAL, lookupDamageRule(21).deathPenalty)).toBe("M2");
    expect(woundStateCardLabel(WoundState.MORTAL, lookupDamageRule(57).deathPenalty)).toBe("M+");
  });
});
