/**
 * Utility to parse markdown strings and extract code blocks.
 */
export function extractCodeBlocks(markdown: string): { language: string, code: string }[] {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: { language: string, code: string }[] = [];
  let match;

  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    if (match && match[2]) {
      blocks.push({
        language: match[1] || "text",
        code: match[2].trim()
      });
    }
  }

  return blocks;
}
