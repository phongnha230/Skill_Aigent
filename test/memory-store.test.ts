import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { MemoryStore } from "../src/core/memory-store.js";
import { Memory } from "../src/core/memory.js";

const tempDir = ".tmp-test-memory";

test.afterEach(() => {
  fs.rmSync(path.resolve(process.cwd(), tempDir), { recursive: true, force: true });
});

test("Memory keeps system prompt out of persisted history", () => {
  const memory = new Memory("system prompt", [
    { role: "user", content: "hello" },
    { role: "system", content: "old system" },
  ]);

  assert.deepEqual(memory.getPersistableHistory(), [{ role: "user", content: "hello" }]);
});

test("MemoryStore saves, loads, and clears chat history", () => {
  const filePath = path.resolve(process.cwd(), tempDir, "history.json");
  const store = new MemoryStore(filePath);

  store.save([
    { role: "system", content: "system prompt" },
    { role: "user", content: "hello" },
    { role: "assistant", content: "hi" },
  ]);

  assert.deepEqual(store.load(), [
    { role: "user", content: "hello" },
    { role: "assistant", content: "hi" },
  ]);

  store.clear();
  assert.equal(fs.existsSync(filePath), false);
});
