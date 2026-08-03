import type { App } from "obsidian";
import type { TemplateParseResult } from "../domain/combat/CombatTemplate";
import type { CombatSheet } from "../domain/sheets/CombatSheet";
import {
  formatTemplateErrors,
  parseCombatTemplate,
} from "../infrastructure/parser/CombatSheetParser";
import type { CombatSheetFactory } from "./CombatSheetFactory";
import type { TFile } from "obsidian";

export interface ITemplateService {
  parseMarkdown(content: string, file: TFile): TemplateParseResult;
  parseBlockSource(yamlSource: string, file: TFile): TemplateParseResult;
  parseActiveNoteAsync(app: App): Promise<TemplateParseResult>;
  instantiateFromBlock(yamlSource: string, file: TFile): { sheet?: CombatSheet; errors: string[] };
  instantiateFromActiveNote(app: App): Promise<{ sheet?: CombatSheet; errors: string[] }>;
}

export class TemplateService implements ITemplateService {
  constructor(private readonly factory: CombatSheetFactory) {}

  parseMarkdown(content: string, file: TFile): TemplateParseResult {
    return parseCombatTemplate({
      markdown: content,
      vaultPath: file.path,
      fileName: file.name,
      displayName: file.basename,
    });
  }

  parseBlockSource(yamlSource: string, file: TFile): TemplateParseResult {
    return this.parseMarkdown(`\`\`\`combat-sheet\n${yamlSource}\n\`\`\``, file);
  }

  instantiateFromBlock(yamlSource: string, file: TFile): { sheet?: CombatSheet; errors: string[] } {
    const result = this.parseBlockSource(yamlSource, file);
    if (!result.success || !result.template) {
      return {
        errors: result.errors.length > 0 ? [formatTemplateErrors(result.errors)] : ["Parse failed."],
      };
    }

    return { sheet: this.factory.instantiateFromTemplate(result.template), errors: [] };
  }

  async parseActiveNoteAsync(app: App): Promise<TemplateParseResult> {
    const file = app.workspace.getActiveFile();
    if (!file || file.extension !== "md") {
      return {
        success: false,
        errors: [{ message: "Open a markdown note containing a combat-sheet block." }],
        warnings: [],
      };
    }

    const markdown = await app.vault.cachedRead(file);
    return this.parseMarkdown(markdown, file);
  }

  async instantiateFromActiveNote(app: App): Promise<{ sheet?: CombatSheet; errors: string[] }> {
    const result = await this.parseActiveNoteAsync(app);
    if (!result.success || !result.template) {
      return {
        errors: result.errors.length > 0 ? [formatTemplateErrors(result.errors)] : ["Parse failed."],
      };
    }

    return { sheet: this.factory.instantiateFromTemplate(result.template), errors: [] };
  }
}
