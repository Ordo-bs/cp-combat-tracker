import { describe, expect, it } from "vitest";
import { CombatSheetType } from "../domain/combat/CombatSheetType";
import { migrateEncounter } from "../infrastructure/repository/migrateEncounter";

describe("migrateEncounter", () => {
  it("fills Damage Engine defaults for a version-1 NPC payload", () => {
    const migrated = migrateEncounter({
      version: 1,
      encounter: {
        id: "enc-1",
        createdAt: 1,
        activeCombatantId: "npc-1",
        initiativeQueue: { orderedIds: ["npc-1"], dirty: false },
        participants: [
          {
            id: "npc-1",
            name: "Ganger",
            sheetType: CombatSheetType.NPC,
            initiative: { current: 10, pending: 10, dirty: false },
            statuses: [],
            runtimeMetadata: { instanceId: "npc-1", createdAt: 1 },
            ammo: { maximumShots: 30, remainingShots: 30, remainingMagazines: 3 },
            body: [
              { location: "HEAD", sp: 2, damage: 0, destroyed: false, acid: false, cybernetic: false },
              { location: "TORSO", sp: 4, damage: 0, destroyed: false, acid: false, cybernetic: false },
              { location: "RIGHT_ARM", sp: 0, damage: 0, destroyed: false, acid: false, cybernetic: false },
              { location: "LEFT_ARM", sp: 0, damage: 0, destroyed: false, acid: false, cybernetic: false },
              { location: "RIGHT_LEG", sp: 0, damage: 0, destroyed: false, acid: false, cybernetic: false },
              { location: "LEFT_LEG", sp: 0, damage: 0, destroyed: false, acid: false, cybernetic: false },
            ],
            damage: {
              totalDamage: 0,
              btm: -1,
              baseStunSave: 8,
              baseDeathSave: 8,
              acidTracker: { active: false, remainingRounds: 0, pendingDamage: 0 },
              fireTracker: { active: false, remainingRounds: 0, pendingDamage: 0 },
            },
            trackers: { hasSandevistan: false, hasPainEditor: false, hasAdrenalBooster: false },
          },
        ],
      },
    });

    expect(migrated).not.toBeNull();
    const npc = migrated!.participants[0];
    expect(npc?.sheetType).toBe(CombatSheetType.NPC);
    if (npc?.sheetType !== CombatSheetType.NPC) {
      return;
    }
    expect(npc.damage.isDead).toBe(false);
    expect(npc.damage.ongoingEffects).toEqual([]);
    expect(npc.body[0]?.isHardSp).toBe(false);
    expect(npc.runtimeMetadata.activationSequence).toBe(0);
    expect(npc.runtimeMetadata.taserHitActivations).toEqual([]);
  });
});
