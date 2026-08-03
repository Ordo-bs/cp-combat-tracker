import type { IDeathResolver } from "../domain/rules/resolvers/DeathResolver";
import type { IStunResolver } from "../domain/rules/resolvers/StunResolver";
import type { EventDispatcher } from "../events/EventDispatcher";
import type { CombatService } from "../services/CombatService";
import type { DamageThresholdService } from "../services/DamageThresholdService";
import type { DiceService } from "../services/DiceService";

export interface CombatActionContext {
  combatService: CombatService;
  diceService: DiceService;
  damageThresholdService: DamageThresholdService;
  stunResolver: IStunResolver;
  deathResolver: IDeathResolver;
  dispatcher: EventDispatcher;
}
