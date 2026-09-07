import { floorDamage } from "../../../domain/damage/floorDamage";
import {
  definition,
  halve,
  passthroughRule,
  type ArmourContext,
  type DamageThroughArmorContext,
  type DamageTypeRule,
} from "../DamageTypeRule";

export const regularRule: DamageTypeRule = passthroughRule(definition("regular"));

export const edgedRule: DamageTypeRule = {
  ...passthroughRule(definition("edged")),
  modifyArmour(context: ArmourContext): ArmourContext {
    return {
      ...context,
      effectiveSp: context.isHardSp ? context.sp : floorDamage(context.sp / 2),
    };
  },
};

export const monoRule: DamageTypeRule = {
  ...passthroughRule(definition("mono")),
  modifyArmour(context: ArmourContext): ArmourContext {
    return {
      ...context,
      effectiveSp: context.isHardSp ? floorDamage((context.sp * 2) / 3) : floorDamage(context.sp / 3),
    };
  },
};

export const apRule: DamageTypeRule = {
  ...passthroughRule(definition("ap")),
  modifyArmour(context: ArmourContext): ArmourContext {
    return { ...context, effectiveSp: halve(context.sp) };
  },
  modifyDamageThroughArmor(context: DamageThroughArmorContext): DamageThroughArmorContext {
    if (!context.penetrated) {
      return context;
    }
    return { ...context, damageThroughArmor: halve(context.damageThroughArmor) };
  },
};

export const slugRule: DamageTypeRule = {
  ...passthroughRule(definition("shotgunSlug")),
  modifyArmour(context: ArmourContext): ArmourContext {
    return { ...context, effectiveSp: halve(context.sp) };
  },
  modifyDamageThroughArmor(context: DamageThroughArmorContext): DamageThroughArmorContext {
    if (!context.penetrated || context.isHardSp) {
      return context;
    }
    return { ...context, damageThroughArmor: halve(context.damageThroughArmor) };
  },
};

export const flechetteRule: DamageTypeRule = {
  ...passthroughRule(definition("shotgunFlechette")),
  modifyArmour(context: ArmourContext): ArmourContext {
    return { ...context, effectiveSp: floorDamage(context.sp / 4) };
  },
  modifyDamageThroughArmor(context: DamageThroughArmorContext): DamageThroughArmorContext {
    if (!context.penetrated) {
      return context;
    }
    return { ...context, damageThroughArmor: floorDamage(context.damageThroughArmor / 4) };
  },
};

export const hollowPointRule: DamageTypeRule = {
  ...passthroughRule(definition("hollowPoint")),
  modifyArmour(context: ArmourContext): ArmourContext {
    return { ...context, effectiveSp: context.sp * 2 };
  },
  modifyDamageThroughArmor(context: DamageThroughArmorContext): DamageThroughArmorContext {
    if (!context.penetrated) {
      return context;
    }
    return { ...context, damageThroughArmor: floorDamage(context.damageThroughArmor * 1.5) };
  },
};

export const dualPurposeRule: DamageTypeRule = {
  ...passthroughRule(definition("dualPurpose")),
  modifyArmour(context: ArmourContext): ArmourContext {
    if (context.sp > 0) {
      return { ...context, effectiveSp: halve(context.sp) };
    }
    return context;
  },
  modifyDamageThroughArmor(context: DamageThroughArmorContext): DamageThroughArmorContext {
    if (!context.penetrated) {
      return context;
    }
    if (context.originalSp === 0) {
      return { ...context, damageThroughArmor: floorDamage(context.damageThroughArmor * 1.5) };
    }
    return { ...context, damageThroughArmor: halve(context.damageThroughArmor) };
  },
};

export const broadheadRule: DamageTypeRule = {
  ...passthroughRule(definition("arrowBroadhead")),
  modifyArmour(context: ArmourContext): ArmourContext {
    return {
      ...context,
      effectiveSp: context.isHardSp ? context.sp : halve(context.sp),
    };
  },
  modifyDamageThroughArmor(context: DamageThroughArmorContext): DamageThroughArmorContext {
    if (!context.penetrated || context.isHardSp) {
      return context;
    }
    return { ...context, damageThroughArmor: context.damageThroughArmor * 2 };
  },
};

export const spinnerRule: DamageTypeRule = {
  ...passthroughRule(definition("arrowSpinner")),
  modifyArmour(context: ArmourContext): ArmourContext {
    return {
      ...context,
      effectiveSp: context.isHardSp ? context.sp : halve(context.sp),
    };
  },
  modifyDamageThroughArmor(context: DamageThroughArmorContext): DamageThroughArmorContext {
    if (!context.penetrated || context.isHardSp) {
      return context;
    }
    return { ...context, damageThroughArmor: context.damageThroughArmor * 3 };
  },
};

export const bypassRule: DamageTypeRule = {
  ...passthroughRule(definition("bypass")),
  modifyArmour(context: ArmourContext): ArmourContext {
    return { ...context, effectiveSp: 0 };
  },
};

export const apiRule: DamageTypeRule = {
  ...apRule,
  definition: definition("api"),
};
