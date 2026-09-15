import { BODY_PART_DERIVED_FIELDS, BODY_PART_FIELDS, BODY_YAML_KEYS } from "./templateSchema";

const FLAT_BODY_KEY =
  /^body\.(head|torso|leftArm|rightArm|leftLeg|rightLeg)\.([a-zA-Z]+)$/;

/**
 * Converts flat `body.head.sp: 2` keys into a nested `body` map so templates
 * can avoid YAML indentation inside the combat-sheet block.
 */
export function normalizeFlatBodyFields(data: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...data };
  const bodyFromFlat: Record<string, Record<string, unknown>> = {};

  for (const key of Object.keys(data)) {
    const match = key.match(FLAT_BODY_KEY);
    if (!match) {
      continue;
    }

    const [, locationKey, field] = match;
    if (!locationKey || !field || !BODY_PART_FIELDS.has(field)) {
      continue;
    }

    if (!(locationKey in BODY_YAML_KEYS)) {
      continue;
    }

    const partFields = bodyFromFlat[locationKey] ?? {};
    partFields[field] = data[key];
    bodyFromFlat[locationKey] = partFields;
    delete normalized[key];
  }

  if (Object.keys(bodyFromFlat).length === 0) {
    return normalized;
  }

  const existingBody =
    normalized.body && typeof normalized.body === "object" && !Array.isArray(normalized.body)
      ? (normalized.body as Record<string, unknown>)
      : {};

  const mergedBody: Record<string, unknown> = { ...existingBody };
  for (const [locationKey, fields] of Object.entries(bodyFromFlat)) {
    const existingPart =
      mergedBody[locationKey] && typeof mergedBody[locationKey] === "object" && !Array.isArray(mergedBody[locationKey])
        ? (mergedBody[locationKey] as Record<string, unknown>)
        : {};
    mergedBody[locationKey] = { ...existingPart, ...fields };
  }

  normalized.body = mergedBody;
  return normalized;
}

/**
 * Returns unknown flat body keys so validation can report them explicitly.
 */
export function findInvalidFlatBodyKeys(data: Record<string, unknown>): string[] {
  const invalid: string[] = [];

  for (const key of Object.keys(data)) {
    const match = key.match(FLAT_BODY_KEY);
    if (!match) {
      continue;
    }

    const [, locationKey, field] = match;
    if (!locationKey || !field) {
      invalid.push(key);
      continue;
    }

    if (!(locationKey in BODY_YAML_KEYS)) {
      invalid.push(key);
      continue;
    }

    if (BODY_PART_DERIVED_FIELDS.has(field) || !BODY_PART_FIELDS.has(field)) {
      invalid.push(key);
    }
  }

  return invalid;
}

export const FLAT_BODY_FIELD_PREFIX = "body.";
