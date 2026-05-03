import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { ProjectMapper } from "../src/core/project-mapper.js";

const tempDir = ".tmp-test-project-map";

test.afterEach(() => {
  fs.rmSync(path.resolve(process.cwd(), tempDir), { recursive: true, force: true });
});

test("ProjectMapper summarizes package metadata and relevant files", () => {
  const root = path.resolve(process.cwd(), tempDir);
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "node_modules", "ignored"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "sample",
      version: "1.0.0",
      type: "module",
      scripts: { test: "node --test" },
      dependencies: { zod: "^4.0.0" },
    }),
    "utf8"
  );
  fs.writeFileSync(path.join(root, "src", "index.ts"), "export {};\n", "utf8");
  fs.writeFileSync(path.join(root, "node_modules", "ignored", "file.js"), "", "utf8");

  const summary = new ProjectMapper(root).buildSummary();

  assert.match(summary, /# Project Map/);
  assert.match(summary, /- name: sample/);
  assert.match(summary, /- scripts: test/);
  assert.match(summary, /- dependencies: zod/);
  assert.match(summary, /- src\/index.ts/);
  assert.doesNotMatch(summary, /node_modules/);
});
