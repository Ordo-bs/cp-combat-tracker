import { floorDamage } from "../../../domain/damage/floorDamage";
import {
  definition,
  passthroughRule,
  type ArmourContext,
  type DamageThroughArmorContext,
  type DamageTypeRule,
} from "../DamageTypeRule";

export const explosiveRule: DamageTypeRule = passthroughRule(
  definition("explosive", {
    requiresHitLocation: false,
    requiresDamageReduction: true,
    supportedTargets: ["NPC", "Vehicle"],
  }),
);

export const stunRule: DamageTypeRule = passthroughRule(
  definition("stun", {
    supportedTargets: ["NPC"],
  }),
);

export const halfAndHalfRule: DamageTypeRule = passthroughRule(definition("halfAndHalf"));

export const safetyRule: DamageTypeRule = {
  ...passthroughRule(definition("safety")),
  modifyArmour(context: ArmourContext): ArmourContext {
    if ((context.isHardSp && context.sp >= 10) || (context.sdp !== undefined && context.sdp >= 30)) {
      return { ...context, ineffective: true, effectiveSp: context.sp };
    }
    return { ...context, effectiveSp: context.sp * 2 };
  },
  modifyDamageThroughArmor(context: DamageThroughArmorContext): DamageThroughArmorContext {
    if (!context.penetrated) {
      return context;
    }
    return { ...context, damageThroughArmor: context.damageThroughArmor * 3 };
  },
};

export const concussionRule: DamageTypeRule = {
  ...passthroughRule(definition("shotgunConcussion")),
  modifyDamageThroughArmor(context: DamageThroughArmorContext): DamageThroughArmorContext {
    if (context.isHardSp) {
      return { ...context, damageThroughArmor: 0, penetrated: false };
    }
    const minimum = floorDamage(context.rawDamage / 2);
    const through = Math.max(minimum, context.rawDamage - context.originalSp);
    return {
      ...context,
      damageThroughArmor: through,
      penetrated: through > 0,
    };
  },
};

export const acidRule: DamageTypeRule = passthroughRule(
  definition("acid", {
    requiresDamage: false,
    requiresHitLocation: true,
  }),
);

export const fireRule: DamageTypeRule = passthroughRule(
  definition("fire", {
    requiresDamage: false,
    requiresHitLocation: false,
    requiresFireSource: true,
  }),
);

export const taserStunNRule: DamageTypeRule = passthroughRule(
  definition("taserStunN", {
    requiresDamage: false,
    requiresAdditionalPenalty: true,
    supportedTargets: ["NPC"],
  }),
);
