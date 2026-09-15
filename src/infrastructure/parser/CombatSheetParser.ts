import { CombatSheetType } from "../../domain/combat/CombatSheetType";
import type {
  BodyPartTemplate,
  BodyTemplateMap,
  CombatTemplate,
  NpcCombatTemplate,
  PcCombatTemplate,
  TemplateMetadata,
  TemplateParseError,
  TemplateParseResult,
  VehicleCombatTemplate,
} from "../../domain/combat/CombatTemplate";
import { extractCombatSheetBlocks } from "./extractCombatSheetBlock";
import { findInvalidFlatBodyKeys, normalizeFlatBodyFields } from "./normalizeFlatBodyFields";
import { parseYamlDocument } from "./parseYaml";
import {
  allowedFieldsForType,
  BODY_PART_DERIVED_FIELDS,
  BODY_PART_FIELDS,
  BODY_YAML_KEYS,
  createDefaultBodyPartTemplate,
  createDefaultBodyTemplateMap,
  RUNTIME_FORBIDDEN_FIELDS,
  sheetTypeFromYaml,
} from "./templateSchema";

export interface ParseTemplateOptions {
  markdown: string;
  vaultPath: string;
  fileName: string;
  displayName?: string;
}

function pushError(
  errors: TemplateParseError[],
  fileName: string,
  message: string,
  line?: number,
  field?: string,
): void {
  errors.push({ file: fileName, line, field, message });
}

function parseBoolean(
  value: unknown,
  field: string,
  fileName: string,
  line: number | undefined,
  errors: TemplateParseError[],
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === true || value === false) {
    return value;
  }
  pushError(errors, fileName, `${field} must be true or false.`, line, field);
  return undefined;
}

function parseInteger(
  value: unknown,
  field: string,
  fileName: string,
  line: number | undefined,
  errors: TemplateParseError[],
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  pushError(errors, fileName, `${field} must be an integer.`, line, field);
  return undefined;
}

function parseRequiredString(
  value: unknown,
  field: string,
  fileName: string,
  line: number | undefined,
  errors: TemplateParseError[],
): string | undefined {
  if (typeof value !== "string" || !value.trim()) {
    pushError(errors, fileName, `${field} is required and must be a non-empty string.`, line, field);
    return undefined;
  }
  return value.trim();
}

function validateUnknownFields(
  data: Record<string, unknown>,
  allowed: Set<string>,
  fileName: string,
  baseLine: number,
  errors: TemplateParseError[],
): void {
  for (const key of Object.keys(data)) {
    if (RUNTIME_FORBIDDEN_FIELDS.has(key)) {
      pushError(errors, fileName, `"${key}" is runtime-only and cannot appear in templates.`, baseLine, key);
    } else if (!allowed.has(key)) {
      pushError(errors, fileName, `Unknown field "${key}".`, baseLine, key);
    }
  }
}

function parseBodyPart(
  raw: unknown,
  fieldPath: string,
  fileName: string,
  baseLine: number,
  errors: TemplateParseError[],
): BodyPartTemplate {
  const defaults = createDefaultBodyPartTemplate();
  if (raw === undefined || raw === null) {
    return defaults;
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    pushError(errors, fileName, `${fieldPath} must be a mapping.`, baseLine, fieldPath);
    return defaults;
  }

  const partData = raw as Record<string, unknown>;
  for (const key of Object.keys(partData)) {
    if (BODY_PART_DERIVED_FIELDS.has(key)) {
      pushError(
        errors,
        fileName,
        `"${key}" is derived from ongoing effects and cannot appear in templates.`,
        baseLine,
        `${fieldPath}.${key}`,
      );
    } else if (!BODY_PART_FIELDS.has(key)) {
      pushError(errors, fileName, `Unknown body field "${key}" in ${fieldPath}.`, baseLine, fieldPath);
    }
  }

  const cybernetic = parseBoolean(partData.cybernetic, `${fieldPath}.cybernetic`, fileName, baseLine, errors) ?? false;
  const sdp = parseInteger(partData.sdp, `${fieldPath}.sdp`, fileName, baseLine, errors);

  if (!cybernetic && sdp !== undefined && sdp !== 0) {
    pushError(errors, fileName, `${fieldPath}.sdp requires cybernetic: true.`, baseLine, fieldPath);
  }

  return {
    sp: parseInteger(partData.sp, `${fieldPath}.sp`, fileName, baseLine, errors) ?? defaults.sp,
    damage: parseInteger(partData.damage, `${fieldPath}.damage`, fileName, baseLine, errors) ?? defaults.damage,
    destroyed: parseBoolean(partData.destroyed, `${fieldPath}.destroyed`, fileName, baseLine, errors) ?? defaults.destroyed,
    isHardSp: parseBoolean(partData.isHardSp, `${fieldPath}.isHardSp`, fileName, baseLine, errors) ?? defaults.isHardSp,
    cybernetic,
    sdp: cybernetic ? (sdp ?? defaults.sdp) : 0,
    disabled: parseBoolean(partData.disabled, `${fieldPath}.disabled`, fileName, baseLine, errors) ?? defaults.disabled,
    hydraulicRams:
      parseBoolean(partData.hydraulicRams, `${fieldPath}.hydraulicRams`, fileName, baseLine, errors) ??
      defaults.hydraulicRams,
    reinforcedJoints:
      parseBoolean(partData.reinforcedJoints, `${fieldPath}.reinforcedJoints`, fileName, baseLine, errors) ??
      defaults.reinforcedJoints,
    thickenedMyomar:
      parseBoolean(partData.thickenedMyomar, `${fieldPath}.thickenedMyomar`, fileName, baseLine, errors) ??
      defaults.thickenedMyomar,
    empShielding:
      parseBoolean(partData.empShielding, `${fieldPath}.empShielding`, fileName, baseLine, errors) ??
      defaults.empShielding,
  };
}

function parseBody(
  raw: unknown,
  fileName: string,
  baseLine: number,
  errors: TemplateParseError[],
): BodyTemplateMap {
  const body = createDefaultBodyTemplateMap();
  if (raw === undefined) {
    return body;
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    pushError(errors, fileName, "body must be a mapping.", baseLine, "body");
    return body;
  }

  const bodyData = raw as Record<string, unknown>;
  for (const key of Object.keys(bodyData)) {
    if (!(key in BODY_YAML_KEYS)) {
      pushError(errors, fileName, `Unknown body location "${key}".`, baseLine, `body.${key}`);
    }
  }

  for (const [yamlKey, location] of Object.entries(BODY_YAML_KEYS)) {
    body[location] = parseBodyPart(bodyData[yamlKey], `body.${yamlKey}`, fileName, baseLine, errors);
  }

  return body;
}

function validateBusinessRules(template: CombatTemplate, fileName: string, errors: TemplateParseError[]): void {
  if (template.sheetType === CombatSheetType.NPC) {
    if (template.remainingShots > template.maximumShots) {
      pushError(
        errors,
        fileName,
        "remainingShots cannot exceed maximumShots.",
        template.metadata.blockStartLine,
        "remainingShots",
      );
    }
    if (template.remainingMagazines < 0) {
      pushError(errors, fileName, "remainingMagazines cannot be negative.", template.metadata.blockStartLine, "remainingMagazines");
    }
    const allowedBtm = [0, -1, -2, -3, -4, -5];
    if (!allowedBtm.includes(template.btm)) {
      pushError(errors, fileName, "btm must be between 0 and -5.", template.metadata.blockStartLine, "btm");
    }
    if (template.totalDamage < 0) {
      pushError(errors, fileName, "totalDamage must be >= 0.", template.metadata.blockStartLine, "totalDamage");
    }
  }

  if (template.sheetType === CombatSheetType.VEHICLE) {
    if (template.sp < 0 || template.sdp < 0) {
      pushError(errors, fileName, "SP and SDP must be non-negative.", template.metadata.blockStartLine, "sp");
    }
  }
}

function buildTemplate(
  data: Record<string, unknown>,
  metadata: TemplateMetadata,
  fileName: string,
  baseLine: number,
  errors: TemplateParseError[],
): CombatTemplate | undefined {
  for (const key of Object.keys(data)) {
    if (RUNTIME_FORBIDDEN_FIELDS.has(key)) {
      pushError(errors, fileName, `"${key}" is runtime-only and cannot appear in templates.`, baseLine, key);
    }
  }

  const typeRaw = data.type;
  if (typeof typeRaw !== "string") {
    pushError(errors, fileName, "type is required.", baseLine, "type");
    return undefined;
  }

  const sheetType = sheetTypeFromYaml(typeRaw);
  if (!sheetType) {
    pushError(errors, fileName, `Invalid type "${typeRaw}". Use pc, npc, or vehicle.`, baseLine, "type");
    return undefined;
  }

  validateUnknownFields(data, allowedFieldsForType(sheetType), fileName, baseLine, errors);

  const name = parseRequiredString(data.name, "name", fileName, baseLine, errors);
  if (!name) {
    return undefined;
  }

  const version = parseInteger(data.version, "version", fileName, baseLine, errors) ?? 1;
  if (version !== 1) {
    pushError(errors, fileName, `Unsupported template version ${version}.`, baseLine, "version");
  }

  const initiativeModifier =
    parseInteger(data.initiativeModifier, "initiativeModifier", fileName, baseLine, errors) ?? 0;

  const base = { version, sheetType, name, initiativeModifier, metadata };

  switch (sheetType) {
    case CombatSheetType.PC:
      return { ...base, sheetType: CombatSheetType.PC } satisfies PcCombatTemplate;
    case CombatSheetType.VEHICLE: {
      const sp = parseInteger(data.sp, "sp", fileName, baseLine, errors) ?? 0;
      const sdp = parseInteger(data.sdp, "sdp", fileName, baseLine, errors) ?? 0;
      return { ...base, sheetType: CombatSheetType.VEHICLE, sp, sdp } satisfies VehicleCombatTemplate;
    }
    case CombatSheetType.NPC: {
      const maximumShots = parseInteger(data.maximumShots, "maximumShots", fileName, baseLine, errors) ?? 30;
      const remainingShots =
        parseInteger(data.remainingShots, "remainingShots", fileName, baseLine, errors) ?? maximumShots;
      const remainingMagazines =
        parseInteger(data.remainingMagazines, "remainingMagazines", fileName, baseLine, errors) ?? 3;
      const template: NpcCombatTemplate = {
        ...base,
        sheetType: CombatSheetType.NPC,
        btm: parseInteger(data.btm, "btm", fileName, baseLine, errors) ?? 0,
        maximumShots,
        remainingShots,
        remainingMagazines,
        baseStunSave: parseInteger(data.baseStunSave, "baseStunSave", fileName, baseLine, errors) ?? 8,
        totalDamage: parseInteger(data.totalDamage, "totalDamage", fileName, baseLine, errors) ?? 0,
        hasSandevistan:
          parseBoolean(data.hasSandevistan, "hasSandevistan", fileName, baseLine, errors) ?? false,
        hasPainEditor: parseBoolean(data.hasPainEditor, "hasPainEditor", fileName, baseLine, errors) ?? false,
        hasAdrenalBooster:
          parseBoolean(data.hasAdrenalBooster, "hasAdrenalBooster", fileName, baseLine, errors) ?? false,
        body: parseBody(data.body, fileName, baseLine, errors),
      };
      return template;
    }
  }
}

export function parseCombatTemplate(options: ParseTemplateOptions): TemplateParseResult {
  const warnings: string[] = [];
  const fileName = options.fileName;
  const displayName = options.displayName ?? options.fileName;

  const extracted = extractCombatSheetBlocks(options.markdown);
  if (extracted.errors.length > 0) {
    return {
      success: false,
      errors: extracted.errors.map((message) => ({ file: fileName, message })),
      warnings,
    };
  }

  const block = extracted.block!;
  const yamlParsed = parseYamlDocument(block.yaml, fileName, block.blockContentStartLine);
  if (yamlParsed.errors.length > 0) {
    return { success: false, errors: yamlParsed.errors, warnings };
  }

  const metadata: TemplateMetadata = {
    vaultPath: options.vaultPath,
    fileName: options.fileName,
    displayName,
    blockStartLine: block.blockContentStartLine,
  };

  const errors: TemplateParseError[] = [];
  const invalidFlatKeys = findInvalidFlatBodyKeys(yamlParsed.data!);
  for (const key of invalidFlatKeys) {
    const field = key.split(".").pop();
    if (field && BODY_PART_DERIVED_FIELDS.has(field)) {
      pushError(
        errors,
        fileName,
        `"${field}" is derived from ongoing effects and cannot appear in templates.`,
        block.blockContentStartLine,
        key,
      );
    } else {
      pushError(errors, fileName, `Unknown body field in "${key}".`, block.blockContentStartLine, key);
    }
  }
  if (invalidFlatKeys.length > 0) {
    return { success: false, errors, warnings };
  }

  const normalizedData = normalizeFlatBodyFields(yamlParsed.data!);
  const template = buildTemplate(normalizedData, metadata, fileName, block.blockContentStartLine, errors);
  if (errors.length > 0 || !template) {
    return { success: false, errors, warnings };
  }

  validateBusinessRules(template, fileName, errors);
  if (errors.length > 0) {
    return { success: false, errors, warnings };
  }

  return { success: true, template, errors: [], warnings };
}

export function formatTemplateErrors(errors: TemplateParseError[]): string {
  return errors
    .map((error) => {
      const location = [error.file, error.line ? `line ${error.line}` : null, error.field]
        .filter(Boolean)
        .join(" · ");
      return location ? `${location}: ${error.message}` : error.message;
    })
    .join("\n");
}
