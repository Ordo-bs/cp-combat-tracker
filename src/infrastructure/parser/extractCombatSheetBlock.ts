import { FENCE_NAME } from "./templateSchema";

export interface ExtractedCombatSheetBlock {
  yaml: string;
  blockStartLine: number;
  blockContentStartLine: number;
}

export interface ExtractBlockResult {
  block?: ExtractedCombatSheetBlock;
  errors: string[];
}

/**
 * Locates ```combat-sheet fenced blocks by scanning lines (not regex over full markdown).
 */
export function extractCombatSheetBlocks(markdown: string): ExtractBlockResult {
  const lines = markdown.split(/\r?\n/);
  const blocks: ExtractedCombatSheetBlock[] = [];
  let inBlock = false;
  let contentStartIndex = 0;
  let contentStartLine = 0;

  for (let index = 0; index < lines.length; index++) {
    const trimmed = lines[index]?.trim() ?? "";

    if (!inBlock && trimmed === `\`\`\`${FENCE_NAME}`) {
      inBlock = true;
      contentStartIndex = index + 1;
      contentStartLine = index + 2;
      continue;
    }

    if (inBlock && trimmed.startsWith("```")) {
      blocks.push({
        yaml: lines.slice(contentStartIndex, index).join("\n"),
        blockStartLine: contentStartLine,
        blockContentStartLine: contentStartLine,
      });
      inBlock = false;
      continue;
    }
  }

  if (inBlock) {
    return { errors: ["Unclosed combat-sheet code block."] };
  }

  if (blocks.length === 0) {
    return { errors: ["No combat-sheet code block found."] };
  }

  if (blocks.length > 1) {
    return { errors: ["Multiple combat-sheet blocks found. Only one is allowed per note."] };
  }

  return { block: blocks[0], errors: [] };
}
