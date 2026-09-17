import { describe, expect, it, beforeEach } from "vitest";
import { createCombatEncounter } from "../domain/combat/CombatEncounter";
import { CombatSheetType } from "../domain/combat/CombatSheetType";
import { hasStatus } from "../domain/status/Status";
import { StatusType } from "../domain/status/StatusType";
import { EventDispatcher } from "../events/EventDispatcher";
import { EncounterRepository } from "../infrastructure/repository/EncounterRepository";
import { CombatLogService } from "../services/CombatLogService";
import { CombatService } from "../services/CombatService";
import { CombatSheetFactory } from "../services/CombatSheetFactory";
import { EncounterService } from "../services/EncounterService";
import { InitiativeService } from "../services/InitiativeService";
import { ScriptedDiceService } from "../services/DiceService";
import { ValidationService } from "../services/ValidationService.impl";
import { isNpcSheet, isPcSheet } from "../domain/sheets/CombatSheet";

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

describe("Sandevistan and Adrenal Booster", () => {
  let repository: MemoryRepository;
  let combatService: CombatService;
  let initiativeService: InitiativeService;
  let encounterService: EncounterService;
  let combatLog: CombatLogService;
  let factory: CombatSheetFactory;
  let dice: ScriptedDiceService;

  beforeEach(async () => {
    repository = new MemoryRepository();
    const dispatcher = new EventDispatcher();
    const validation = new ValidationService();
    dice = new ScriptedDiceService();
    factory = new CombatSheetFactory(dice);
    encounterService = new EncounterService(repository, dispatcher);
    initiativeService = new InitiativeService(repository, validation, dispatcher);
    combatLog = new CombatLogService(repository, dispatcher);
    combatService = new CombatService(
      repository,
      encounterService,
      initiativeService,
      validation,
      factory,
      dispatcher,
      undefined,
      dice,
    );
  });

  async function addSolo(sheetType: CombatSheetType, name: string, initiative = 10) {
    const encounter = createCombatEncounter("enc-1");
    const sheet = factory.createDraft(sheetType, name, initiative);
    encounter.participants.push(sheet);
    encounter.initiativeQueue.orderedIds = [sheet.id];
    encounter.activeCombatantId = sheet.id;
    await repository.replace(encounter);
    return sheet;
  }

  it("applies PC Sandevistan as pending init, tags Sandy, and expires after 5 wraps", async () => {
    const sheet = await addSolo(CombatSheetType.PC, "V", 10);
    const result = combatService.activateSandevistan(sheet.id);
    expect(result.success).toBe(true);
    combatLog.recordResult(sheet.id, result.summary);

    const afterActivate = repository.get()!;
    const pc = afterActivate.participants[0]!;
    expect(hasStatus(pc.statuses, StatusType.SANDEVISTAN)).toBe(true);
    expect(pc.initiative).toMatchObject({ current: 10, pending: 13, dirty: true });
    expect(afterActivate.combatLog[0]?.text).toBe("Sandevistan: +3 initiative for 5 rounds.");

    for (let i = 0; i < 4; i += 1) {
      initiativeService.nextTurn();
      expect(hasStatus(repository.get()!.participants[0]!.statuses, StatusType.SANDEVISTAN)).toBe(true);
    }
    initiativeService.nextTurn();
    const expired = repository.get()!;
    const expiredPc = expired.participants[0]!;
    expect(hasStatus(expiredPc.statuses, StatusType.SANDEVISTAN)).toBe(false);
    expect(expiredPc.initiative.current).toBe(10);
    expect(expiredPc.initiative.pending).toBe(10);
    expect(expired.combatLog[0]?.text).toBe("Sandevistan ended (−3 initiative).");
  });

  it("does not tick Sandevistan on Previous", async () => {
    const sheet = await addSolo(CombatSheetType.PC, "V", 10);
    combatService.activateSandevistan(sheet.id);
    initiativeService.previousTurn();
    const status = repository.get()!.participants[0]!.statuses.find((entry) => entry.type === StatusType.SANDEVISTAN);
    expect(status?.status.duration).toBe(5);
  });

  it("rejects NPC Sandevistan without the tracker flag and accepts with it", async () => {
    const sheet = await addSolo(CombatSheetType.NPC, "Ganger", 10);
    expect(combatService.activateSandevistan(sheet.id).success).toBe(false);

    const live = repository.get()!.participants[0]!;
    if (!isNpcSheet(live)) {
      throw new Error("expected npc");
    }
    live.trackers.hasSandevistan = true;
    await repository.replace(repository.get());
    expect(combatService.activateSandevistan(sheet.id).success).toBe(true);
  });

  it("rolls NPC adrenal booster duration as 1d6+2", async () => {
    const sheet = await addSolo(CombatSheetType.NPC, "Ganger", 10);
    const live = repository.get()!.participants[0]!;
    if (!isNpcSheet(live)) {
      throw new Error("expected npc");
    }
    live.trackers.hasAdrenalBooster = true;
    await repository.replace(repository.get());
    dice.push(4);

    const result = combatService.activateAdrenalBooster(sheet.id);
    expect(result.success).toBe(true);
    expect(result.summary).toBe("Adrenal booster: 1d6+2 = 6 → +1 initiative for 6 rounds.");
    const status = repository.get()!.participants[0]!.statuses.find((entry) => entry.type === StatusType.ADRENAL_BOOSTER);
    expect(status?.status.duration).toBe(6);
    expect(repository.get()!.participants[0]!.initiative.pending).toBe(11);
  });

  it("uses the entered round count for PC adrenal booster", async () => {
    const sheet = await addSolo(CombatSheetType.PC, "V", 10);
    const result = combatService.activateAdrenalBooster(sheet.id, 3);
    expect(result.success).toBe(true);
    expect(result.summary).toBe("Adrenal booster: +1 initiative for 3 rounds.");
    expect(repository.get()!.participants[0]!.initiative.pending).toBe(11);
  });

  it("allows Sandy and Boost together and rejects recast while active", async () => {
    const sheet = await addSolo(CombatSheetType.PC, "V", 10);
    expect(combatService.activateSandevistan(sheet.id).success).toBe(true);
    expect(combatService.activateAdrenalBooster(sheet.id, 2).success).toBe(true);
    const pc = repository.get()!.participants[0]!;
    expect(hasStatus(pc.statuses, StatusType.SANDEVISTAN)).toBe(true);
    expect(hasStatus(pc.statuses, StatusType.ADRENAL_BOOSTER)).toBe(true);
    expect(pc.initiative.pending).toBe(14);
    expect(combatService.activateSandevistan(sheet.id).success).toBe(false);
  });

  it("strips Sandy/Boost on remaining PCs when the encounter is cleared", async () => {
    const encounter = createCombatEncounter("enc-1");
    const pc = factory.createDraft(CombatSheetType.PC, "V", 10);
    const npc = factory.createDraft(CombatSheetType.NPC, "Ganger", 8);
    encounter.participants.push(pc, npc);
    encounter.initiativeQueue.orderedIds = [pc.id, npc.id];
    encounter.activeCombatantId = pc.id;
    await repository.replace(encounter);
    combatService.activateSandevistan(pc.id);
    encounterService.clearEncounter();
    const remaining = repository.get()!.participants[0]!;
    expect(isPcSheet(remaining)).toBe(true);
    expect(hasStatus(remaining.statuses, StatusType.SANDEVISTAN)).toBe(false);
    expect(remaining.initiative.current).toBe(0);
  });
});
