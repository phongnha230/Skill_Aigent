import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { readFileTool, writeFileTool } from "../src/tools/file-system.tool.js";
import { configureTerminalTool, terminalTool } from "../src/tools/terminal.tool.js";

const tempDir = ".tmp-test";

test.afterEach(() => {
  configureTerminalTool({ allowUnsafeTerminal: false });
  fs.rmSync(path.resolve(process.cwd(), tempDir), { recursive: true, force: true });
});

test("file tools can write and read files inside the workspace", async () => {
  const filePath = `${tempDir}/sample.txt`;

  const writeResult = await writeFileTool.execute({ filePath, content: "hello" });
  assert.deepEqual(writeResult, { success: true, path: filePath });

  const readResult = await readFileTool.execute({ filePath });
  assert.deepEqual(readResult, { content: "hello" });
});

test("file tools reject paths outside the workspace", async () => {
  await assert.rejects(
    () => writeFileTool.execute({ filePath: "../outside.txt", content: "blocked" }),
    /Path escapes workspace root/
  );

  await assert.rejects(
    () => readFileTool.execute({ filePath: "../outside.txt" }),
    /Path escapes workspace root/
  );
});

test("terminal tool runs commands from inside the workspace", async t => {
  fs.mkdirSync(path.resolve(process.cwd(), tempDir), { recursive: true });

  const result = await terminalTool.execute({
    command: "node -v",
    cwd: tempDir,
  });

  if (!result.success && result.error === "spawn EPERM") {
    t.skip("Nested child processes are blocked in this sandbox.");
    return;
  }

  assert.equal(result.success, true);
  assert.match(result.stdout, /^v\d+\./);
});

test("terminal tool rejects cwd outside the workspace", async () => {
  const result = await terminalTool.execute({
    command: "node -v",
    cwd: "..",
  });

  assert.equal(result.success, false);
  assert.match(result.error, /cwd escapes workspace root/);
});

test("terminal tool rejects obviously destructive commands", async () => {
  const result = await terminalTool.execute({
    command: "git reset --hard",
  });

  assert.equal(result.success, false);
  assert.match(result.error, /Command rejected by safety policy/);
});

test("terminal tool rejects commands outside the safe allowlist", async () => {
  const result = await terminalTool.execute({
    command: "whoami",
  });

  assert.equal(result.success, false);
  assert.match(result.error, /not in the safe terminal allowlist/);
});

test("terminal tool rejects shell control operators in safe mode", async () => {
  const result = await terminalTool.execute({
    command: "npm test && npm run typecheck",
  });

  assert.equal(result.success, false);
  assert.match(result.error, /shell control operators/);
});

test("unsafe terminal mode bypasses allowlist but still blocks destructive commands", async () => {
  configureTerminalTool({ allowUnsafeTerminal: true });

  const blocked = await terminalTool.execute({
    command: "git reset --hard",
  });

  assert.equal(blocked.success, false);
  assert.match(blocked.error, /Command rejected by safety policy/);
});
