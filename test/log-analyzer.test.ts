import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { analyzeLogContent } from "../src/utils/log-analyzer.js";
import { analyzeLogTool } from "../src/tools/log-analysis.tool.js";

const tempDir = ".tmp-test-log-analysis";

test.afterEach(() => {
  fs.rmSync(path.resolve(process.cwd(), tempDir), { recursive: true, force: true });
});

test("analyzeLogContent extracts error lines and file locations", () => {
  const analysis = analyzeLogContent([
    "FAIL test/user.test.ts",
    "src/services/user.service.ts:42:13 - error TS2345: Argument type mismatch",
    "    at Object.<anonymous> (src/index.ts:10:5)",
  ].join("\n"));

  assert.equal(analysis.errorLines.length, 2);
  assert.deepEqual(analysis.probableFiles, ["src/services/user.service.ts", "src/index.ts"]);
  assert.deepEqual(analysis.locations[0], {
    filePath: "src/services/user.service.ts",
    lineNumber: 42,
    columnNumber: 13,
    raw: "src/services/user.service.ts:42:13 - error TS2345: Argument type mismatch",
  });
});

test("analyze_log tool reads workspace log files", async () => {
  const logDir = path.resolve(process.cwd(), tempDir);
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(path.join(logDir, "error.log"), "src/app.ts:3:1 - error TS1005\n", "utf8");

  const result = await analyzeLogTool.execute({
    filePath: `${tempDir}/error.log`,
  });

  assert.deepEqual(result.probableFiles, ["src/app.ts"]);
});

test("analyze_log tool rejects paths outside the workspace", async () => {
  await assert.rejects(
    () => analyzeLogTool.execute({ filePath: "../error.log" }),
    /Path escapes workspace root/
  );
});
