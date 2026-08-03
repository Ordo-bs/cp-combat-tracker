import { parseDocument } from "yaml";
import type { TemplateParseError } from "../../domain/combat/CombatTemplate";

export function parseYamlDocument(
  yamlText: string,
  fileName: string,
  baseLine: number,
): { data?: Record<string, unknown>; errors: TemplateParseError[] } {
  try {
    const doc = parseDocument(yamlText.replace(/\t/g, "  "), { uniqueKeys: true, strict: true });
    if (doc.errors.length > 0) {
      return {
        errors: doc.errors.map((error) => ({
          file: fileName,
          line: baseLine + (error.linePos?.[0]?.line ?? 0),
          message: error.message,
        })),
      };
    }

    const data = doc.toJSON();
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      return {
        errors: [{ file: fileName, line: baseLine, message: "Template root must be a YAML mapping." }],
      };
    }

    return { data: data as Record<string, unknown>, errors: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid YAML.";
    return { errors: [{ file: fileName, line: baseLine, message }] };
  }
}
