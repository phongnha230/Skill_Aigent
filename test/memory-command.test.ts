import test from "node:test";
import assert from "node:assert/strict";
import { formatMemoryMessages } from "../src/cli/memory-command.js";

test("formatMemoryMessages reports empty memory clearly", () => {
  assert.equal(formatMemoryMessages([]), "No memory found.");
});

test("formatMemoryMessages renders numbered role/content lines", () => {
  assert.equal(
    formatMemoryMessages([
      { role: "user", content: "hello\nthere" },
      { role: "assistant", content: "hi" },
    ]),
    "1. [user] hello there\n2. [assistant] hi"
  );
});
