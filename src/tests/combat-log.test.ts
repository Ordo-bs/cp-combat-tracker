import { describe, expect, it, beforeEach } from "vitest";
import { createCombatEncounter } from "../domain/combat/CombatEncounter";
import {
  COMBAT_LOG_CAP,
  createCombatLogEntry,
  prependCombatLogEntry,
} from "../domain/combat/CombatLog";
import { CombatSheetType } from "../domain/combat/CombatSheetType";
import { EventDispatcher } from "../events/EventDispatcher";
import { EncounterRepository } from "../infrastructure/repository/EncounterRepository";
import { CombatLogService } from "../services/CombatLogService";
import { CombatSheetFactory } from "../services/CombatSheetFactory";
import { DiceService } from "../services/DiceService";
import { EncounterService } from "../services/EncounterService";

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

describe("combat log", () => {
  it("prepends entries so newest is first and drops the oldest at the cap", () => {
    const encounter = createCombatEncounter("enc-1");
    for (let index = 0; index < COMBAT_LOG_CAP + 3; index += 1) {
      prependCombatLogEntry(
        encounter,
        createCombatLogEntry({ kind: "round", text: `Round ${index} begins` }),
      );
    }
    expect(encounter.combatLog).toHaveLength(COMBAT_LOG_CAP);
    expect(encounter.combatLog[0]?.text).toBe(`Round ${COMBAT_LOG_CAP + 2} begins`);
    expect(encounter.combatLog[COMBAT_LOG_CAP - 1]?.text).toBe("Round 3 begins");
  });

  it("records a combat result with the combatant name snapshot", async () => {
    const repository = new MemoryRepository();
    const dispatcher = new EventDispatcher();
    const factory = new CombatSheetFactory(new DiceService());
    const log = new CombatLogService(repository, dispatcher);
    const encounter = createCombatEncounter("enc-1");
    const npc = factory.createDraft(CombatSheetType.NPC, "Ganger", 10);
    encounter.participants.push(npc);
    await repository.replace(encounter);

    log.recordResult(npc.id, "HIT — Torso\n\n4 after BTM.");
    const stored = repository.get()?.combatLog[0];
    expect(stored?.kind).toBe("result");
    expect(stored?.combatantName).toBe("Ganger");
    expect(stored?.text).toContain("4 after BTM.");
  });

  it("clears the log and resets the round when the encounter is cleared", async () => {
    const repository = new MemoryRepository();
    const dispatcher = new EventDispatcher();
    const factory = new CombatSheetFactory(new DiceService());
    const encounterService = new EncounterService(repository, dispatcher);
    const encounter = createCombatEncounter("enc-1");
    const npc = factory.createDraft(CombatSheetType.NPC, "Ganger", 10);
    const pc = factory.createDraft(CombatSheetType.PC, "V", 12);
    encounter.participants.push(npc, pc);
    encounter.roundNumber = 4;
    prependCombatLogEntry(
      encounter,
      createCombatLogEntry({ kind: "round", text: "Round 4 begins" }),
    );
    await repository.replace(encounter);

    encounterService.clearEncounter();
    const cleared = repository.get();
    expect(cleared?.combatLog).toEqual([]);
    expect(cleared?.roundNumber).toBe(1);
    expect(cleared?.participants).toHaveLength(1);
    expect(cleared?.participants[0]?.name).toBe("V");
  });
});
