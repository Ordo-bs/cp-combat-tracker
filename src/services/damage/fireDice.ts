import { floorDamage } from "../../domain/damage/floorDamage";
import type { FireSource } from "../../domain/damage/FireSource";
import type { DiceRollResult, IDiceService } from "../DiceService";

export function rollFireDamage(
  source: FireSource,
  applicationIndex: number,
  dice: IDiceService,
): DiceRollResult {
  switch (source) {
    case "flamethrower":
      if (applicationIndex === 0) {
        return dice.rollMany(2, 10);
      }
      if (applicationIndex === 1) {
        return dice.roll(10);
      }
      return dice.roll(6);
    case "cyberFlamethrower":
      if (applicationIndex === 0) {
        return dice.rollMany(2, 6);
      }
      return halvedDie(dice.roll(6));
    case "incendiaryGrenade":
      return dice.rollMany(4, 6);
    case "kendachiDragon":
      return applicationIndex === 0 ? dice.rollMany(2, 6) : dice.roll(6);
    case "molotov":
      return dice.rollMany(2, 10);
    case "flare":
      return halvedDie(dice.roll(6));
    case "api":
      return applicationIndex === 0 ? dice.roll(6) : halvedDie(dice.roll(6));
  }
}

function halvedDie(result: DiceRollResult): DiceRollResult {
  return {
    notation: `${result.notation}/2`,
    rolls: result.rolls,
    total: floorDamage(result.total / 2),
  };
}
