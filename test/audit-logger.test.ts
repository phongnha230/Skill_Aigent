import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { AuditLogger } from "../src/core/audit-logger.js";

const tempDir = ".tmp-test-audit";

test.afterEach(() => {
  fs.rmSync(path.resolve(process.cwd(), tempDir), { recursive: true, force: true });
});

test("AuditLogger writes run files with assistant messages and tool calls", () => {
  const runsDir = path.resolve(process.cwd(), tempDir, "runs");
  const logger = new AuditLogger(runsDir);

  const runId = logger.startRun("fix tests");
  logger.logAssistantMessage(runId, "I will inspect the project.");
  logger.logToolCall(runId, "search_code", JSON.stringify({ pattern: "TODO" }), JSON.stringify({ matches: [] }));
  logger.finishRun(runId);

  const files = fs.readdirSync(runsDir);
  assert.equal(files.length, 1);

  const content = JSON.parse(fs.readFileSync(path.join(runsDir, files[0] as string), "utf8"));
  assert.equal(content.runId, runId);
  assert.equal(content.status, "completed");
  assert.deepEqual(content.assistantMessages, ["I will inspect the project."]);
  assert.equal(content.toolCalls[0].name, "search_code");
  assert.deepEqual(content.toolCalls[0].arguments, { pattern: "TODO" });
  assert.deepEqual(content.toolCalls[0].result, { matches: [] });
});

test("AuditLogger marks failed runs", () => {
  const runsDir = path.resolve(process.cwd(), tempDir, "failed-runs");
  const logger = new AuditLogger(runsDir);

  const runId = logger.startRun("fail task");
  logger.failRun(runId, new Error("boom"));

  const files = fs.readdirSync(runsDir);
  const content = JSON.parse(fs.readFileSync(path.join(runsDir, files[0] as string), "utf8"));
  assert.equal(content.status, "failed");
  assert.equal(content.error, "boom");
});
