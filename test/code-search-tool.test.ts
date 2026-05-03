import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { listFilesTool, searchCodeTool } from "../src/tools/code-search.tool.js";

const tempDir = ".tmp-test-code-search";

test.beforeEach(() => {
  const root = path.resolve(process.cwd(), tempDir);
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "node_modules", "ignored"), { recursive: true });
  fs.writeFileSync(path.join(root, "src", "alpha.ts"), "export const marker = 'Needle';\n", "utf8");
  fs.writeFileSync(path.join(root, "src", "beta.md"), "# Notes\nneedle appears here\n", "utf8");
  fs.writeFileSync(path.join(root, "node_modules", "ignored", "skip.ts"), "Needle\n", "utf8");
});

test.afterEach(() => {
  fs.rmSync(path.resolve(process.cwd(), tempDir), { recursive: true, force: true });
});

test("list_files returns workspace-relative files and ignores dependency directories", async () => {
  const result = await listFilesTool.execute({
    directory: tempDir,
    extensions: [".ts"],
  });

  assert.deepEqual(result.files, [
    {
      path: `${tempDir}/src/alpha.ts`,
      size: "export const marker = 'Needle';\n".length,
    },
  ]);
});

test("search_code finds case-insensitive text matches with line numbers", async () => {
  const result = await searchCodeTool.execute({
    pattern: "needle",
    directory: tempDir,
    extensions: [".ts", ".md"],
  });

  assert.deepEqual(result.matches, [
    {
      filePath: `${tempDir}/src/alpha.ts`,
      lineNumber: 1,
      line: "export const marker = 'Needle';",
    },
    {
      filePath: `${tempDir}/src/beta.md`,
      lineNumber: 2,
      line: "needle appears here",
    },
  ]);
});

test("search_code supports regex mode", async () => {
  const result = await searchCodeTool.execute({
    pattern: "marker\\s*=",
    directory: tempDir,
    extensions: [".ts"],
    regex: true,
  });

  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0]?.filePath, `${tempDir}/src/alpha.ts`);
});

test("code search tools reject paths outside the workspace", async () => {
  await assert.rejects(
    () => listFilesTool.execute({ directory: ".." }),
    /Path escapes workspace root/
  );

  await assert.rejects(
    () => searchCodeTool.execute({ pattern: "needle", directory: ".." }),
    /Path escapes workspace root/
  );
});
