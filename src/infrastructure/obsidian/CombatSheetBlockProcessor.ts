import { Notice, TFile, type Plugin } from "obsidian";
import type { CombatTemplate } from "../../domain/combat/CombatTemplate";
import { isNpcTemplate, isVehicleTemplate } from "../../domain/combat/CombatTemplate";
import { CombatSheetType } from "../../domain/combat/CombatSheetType";
import type { PluginContext } from "../../plugin/PluginContext";
import { openDraftCombatSheetEditor } from "./openCombatSheetEditor";

function formatTypeLabel(sheetType: CombatSheetType): string {
  switch (sheetType) {
    case CombatSheetType.PC:
      return "PC";
    case CombatSheetType.NPC:
      return "NPC";
    case CombatSheetType.VEHICLE:
      return "Vehicle";
    default:
      return "Unknown";
  }
}

function buildSummaryLines(template: CombatTemplate): string[] {
  const lines = [`Initiative mod: ${template.initiativeModifier >= 0 ? "+" : ""}${template.initiativeModifier}`];

  if (isNpcTemplate(template)) {
    lines.push(`BTM: ${template.btm}`, `Stun/Death save: ${template.baseStunSave}`);
    lines.push(`Ammo: ${template.remainingShots}/${template.maximumShots} (${template.remainingMagazines} mags)`);
    if (template.hasSandevistan) lines.push("Sandevistan");
    if (template.hasPainEditor) lines.push("Pain Editor");
    if (template.hasAdrenalBooster) lines.push("Adrenal Booster");
  }

  if (isVehicleTemplate(template)) {
    lines.push(`SP: ${template.sp}`, `SDP: ${template.sdp}`);
  }

  return lines;
}

function renderError(el: HTMLElement, message: string, source: string): void {
  el.empty();
  el.addClass("cp-template-block");
  el.addClass("cp-template-block--error");

  const title = el.createDiv({ cls: "cp-template-block__title", text: "Combat template error" });
  title.setAttr("aria-label", "Invalid combat template");

  el.createDiv({ cls: "cp-template-block__error", text: message });

  const details = el.createEl("details", { cls: "cp-template-block__source" });
  details.createEl("summary", { text: "Show template source" });
  details.createEl("pre", { text: source });
}

function renderTemplateCard(
  el: HTMLElement,
  template: CombatTemplate,
  actions: { onAdd: () => void; onEdit: () => void },
): void {
  el.empty();
  el.addClass("cp-template-block");

  const header = el.createDiv({ cls: "cp-template-block__header" });
  header.createSpan({ cls: "cp-template-block__type", text: formatTypeLabel(template.sheetType) });
  header.createEl("h4", { cls: "cp-template-block__name", text: template.name });

  const summary = el.createDiv({ cls: "cp-template-block__summary" });
  for (const line of buildSummaryLines(template)) {
    summary.createDiv({ cls: "cp-template-block__summary-line", text: line });
  }

  const actionRow = el.createDiv({ cls: "cp-template-block__actions" });
  const addButton = actionRow.createEl("button", {
    cls: "mod-cta cp-template-block__button",
    text: "Add to Combat",
  });
  addButton.type = "button";
  addButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    actions.onAdd();
  });

  const editButton = actionRow.createEl("button", {
    cls: "cp-template-block__button",
    text: "Edit and add to combat",
  });
  editButton.type = "button";
  editButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    actions.onEdit();
  });
}

export function registerCombatSheetBlockProcessor(plugin: Plugin, pluginContext: PluginContext): void {
  plugin.registerMarkdownCodeBlockProcessor("combat-sheet", (source, el, ctx) => {
    const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
    if (!(file instanceof TFile)) {
      renderError(el, "Template must be in a markdown note.", source);
      return;
    }

    const fencedMarkdown = `\`\`\`combat-sheet\n${source}\n\`\`\``;
    const parsed = pluginContext.templateService.parseMarkdown(fencedMarkdown, file);

    if (!parsed.success || !parsed.template) {
      const message =
        parsed.errors.length > 0
          ? parsed.errors.map((error) => error.message).join(" ")
          : "Failed to parse combat template.";
      renderError(el, message, source);
      return;
    }

    const createSheet = () => {
      const { sheet, errors } = pluginContext.templateService.instantiateFromBlock(source, file);
      if (errors.length > 0 || !sheet) {
        new Notice(errors[0] ?? "Failed to create combatant from template.");
        return undefined;
      }
      return sheet;
    };

    renderTemplateCard(el, parsed.template, {
      onAdd: () => {
        const sheet = createSheet();
        if (!sheet) {
          return;
        }
        const result = pluginContext.combatService.confirmDraft(sheet);
        if (!result.valid) {
          new Notice(result.errors.join(" "));
          return;
        }
        new Notice(`Added ${sheet.name} to combat.`);
      },
      onEdit: () => {
        void (async () => {
          const sheet = createSheet();
          if (!sheet) {
            return;
          }
          await openDraftCombatSheetEditor(plugin.app, sheet);
        })();
      },
    });
  });
}
