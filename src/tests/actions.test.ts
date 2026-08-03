import { describe, expect, it, beforeEach, vi } from "vitest";
import { ActionType, createAction } from "../actions/ActionRegistry";
import { CombatActionExecutor } from "../actions/CombatActionExecutor";
import { createCombatEncounter } from "../domain/combat/CombatEncounter";
import { CombatSheetType } from "../domain/combat/CombatSheetType";
import { isNpcSheet } from "../domain/sheets/CombatSheet";
import { PlaceholderDeathResolver } from "../domain/rules/resolvers/DeathResolver";
import { PlaceholderStunResolver } from "../domain/rules/resolvers/StunResolver";
import { StatusType } from "../domain/status/StatusType";
import { hasStatus } from "../domain/status/Status";
import { EventDispatcher } from "../events/EventDispatcher";
import { EncounterRepository } from "../infrastructure/repository/EncounterRepository";
import { CombatService } from "../services/CombatService";
import { CombatSheetFactory } from "../services/CombatSheetFactory";
import { DamageThresholdService } from "../services/DamageThresholdService";
import { DiceService } from "../services/DiceService";
import { EncounterService } from "../services/EncounterService";
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

describe("CombatActionExecutor", () => {
  let repository: MemoryRepository;
  let combatService: CombatService;
  let executor: CombatActionExecutor;
  let diceService: DiceService;
  let combatantId: string;

  beforeEach(async () => {
    repository = new MemoryRepository();
    const dispatcher = new EventDispatcher();
    const validation = new ValidationService();
    diceService = new DiceService();
    const factory = new CombatSheetFactory(diceService);
    const encounterService = new EncounterService(repository, dispatcher);
    const initiativeService = new InitiativeService(repository, validation, dispatcher);
    combatService = new CombatService(
      repository,
      encounterService,
      initiativeService,
      validation,
      factory,
      dispatcher,
    );

    executor = new CombatActionExecutor({
      combatService,
      diceService,
      damageThresholdService: new DamageThresholdService(),
      stunResolver: new PlaceholderStunResolver(),
      deathResolver: new PlaceholderDeathResolver(),
      dispatcher,
    });

    const encounter = createCombatEncounter("enc-1");
    const npc = factory.createDraft(CombatSheetType.NPC, "Ganger", 10);
    if (!isNpcSheet(npc)) {
      throw new Error("Expected NPC sheet");
    }
    npc.ammo.remainingShots = 10;
    npc.ammo.maximumShots = 30;
    npc.ammo.remainingMagazines = 2;
    combatantId = npc.id;
    encounter.participants.push(npc);
    encounter.initiativeQueue.orderedIds = [combatantId];
    encounter.activeCombatantId = combatantId;
    await repository.replace(encounter);
  });

  it("consumes ammo through ConsumeAmmoAction", () => {
    const result = executor.execute(
      createAction({ type: ActionType.ConsumeAmmo, combatantId, amount: 3 }),
    );

    expect(result.success).toBe(true);
    const sheet = repository.get()?.participants[0];
    expect(sheet && "ammo" in sheet && sheet.ammo.remainingShots).toBe(7);
  });

  it("rejects ammo consumption when insufficient shots", () => {
    const result = executor.execute(
      createAction({ type: ActionType.ConsumeAmmo, combatantId, amount: 20 }),
    );

    expect(result.success).toBe(false);
  });

  it("reloads through ReloadWeaponAction", () => {
    executor.execute(createAction({ type: ActionType.ConsumeAmmo, combatantId, amount: 10 }));
    const result = executor.execute(
      createAction({ type: ActionType.ReloadWeapon, combatantId }),
    );

    expect(result.success).toBe(true);
    const sheet = repository.get()?.participants[0];
    expect(sheet && "ammo" in sheet && sheet.ammo.remainingShots).toBe(30);
    expect(sheet && "ammo" in sheet && sheet.ammo.remainingMagazines).toBe(1);
  });

  it("applies stunned status on failed stun save", () => {
    vi.spyOn(diceService, "d10").mockReturnValue(10);

    const result = executor.execute(
      createAction({ type: ActionType.PerformStunSave, combatantId }),
    );

    expect(result.success).toBe(true);
    expect((result.data as { succeeded: boolean } | undefined)?.succeeded).toBe(false);
    const sheet = repository.get()?.participants[0];
    expect(sheet && hasStatus(sheet.statuses, StatusType.STUNNED)).toBe(true);
  });

  it("applies dead status on failed death save", () => {
    vi.spyOn(diceService, "d10").mockReturnValue(10);

    const result = executor.execute(
      createAction({ type: ActionType.PerformDeathSave, combatantId }),
    );

    expect(result.success).toBe(true);
    expect((result.data as { succeeded: boolean } | undefined)?.succeeded).toBe(false);
    const sheet = repository.get()?.participants[0];
    expect(sheet && hasStatus(sheet.statuses, StatusType.DEAD)).toBe(true);
  });

  it("returns ui effect for OpenHitCalculatorAction", () => {
    const result = executor.execute(
      createAction({ type: ActionType.OpenHitCalculator, combatantId }),
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      combatantId,
      uiEffect: "open-hit-calculator",
    });
  });
});

describe("Placeholder resolvers", () => {
  it("treats roll <= threshold as success", () => {
    const stun = new PlaceholderStunResolver();
    expect(stun.resolve(5, 8).succeeded).toBe(true);
    expect(stun.resolve(9, 8).succeeded).toBe(false);

    const death = new PlaceholderDeathResolver();
    expect(death.resolve(3, 6).succeeded).toBe(true);
    expect(death.resolve(7, 6).succeeded).toBe(false);
  });
});
