import * as fs from "fs";
import * as path from "path";
import { agentConfig } from "../config/agent.js";

interface PackageJson {
  name?: string;
  version?: string;
  type?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export class ProjectMapper {
  constructor(private readonly workspaceRoot: string = agentConfig.workspaceRoot) {}

  buildSummary(): string {
    const packageJson = this.readPackageJson();
    const files = this.collectFiles();
    const srcFiles = files.filter(file => file.startsWith("src/"));
    const skillFiles = files.filter(file => file.startsWith("skills/"));
    const testFiles = files.filter(file => file.startsWith("test/"));

    const sections = [
      "# Project Map",
      this.formatPackageSection(packageJson),
      this.formatFileSection("Source files", srcFiles),
      this.formatFileSection("Skill files", skillFiles),
      this.formatFileSection("Test files", testFiles),
      this.formatFileSection(
        "Other top-level files",
        files.filter(file => !file.startsWith("src/") && !file.startsWith("skills/") && !file.startsWith("test/"))
      ),
    ];

    return sections.filter(Boolean).join("\n\n");
  }

  private readPackageJson(): PackageJson | undefined {
    const packagePath = path.join(this.workspaceRoot, "package.json");
    if (!fs.existsSync(packagePath)) {
      return undefined;
    }

    return JSON.parse(fs.readFileSync(packagePath, "utf8")) as PackageJson;
  }

  private collectFiles(): string[] {
    const files: string[] = [];
    this.walk(this.workspaceRoot, files);
    return files.sort((a, b) => a.localeCompare(b));
  }

  private walk(currentDir: string, files: string[]): void {
    if (files.length >= agentConfig.projectMapMaxFiles) {
      return;
    }

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (files.length >= agentConfig.projectMapMaxFiles) {
        return;
      }

      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(this.workspaceRoot, fullPath).replace(/\\/g, "/");

      if (entry.isDirectory()) {
        if (!agentConfig.projectMapIgnoredDirs.has(entry.name)) {
          this.walk(fullPath, files);
        }
        continue;
      }

      if (entry.isFile() && entry.name !== "package-lock.json") {
        files.push(relativePath);
      }
    }
  }

  private formatPackageSection(packageJson: PackageJson | undefined): string {
    if (!packageJson) {
      return "## Package\nNo package.json found.";
    }

    const lines = ["## Package"];
    if (packageJson.name) lines.push(`- name: ${packageJson.name}`);
    if (packageJson.version) lines.push(`- version: ${packageJson.version}`);
    if (packageJson.type) lines.push(`- module type: ${packageJson.type}`);

    if (packageJson.scripts && Object.keys(packageJson.scripts).length > 0) {
      lines.push(`- scripts: ${Object.keys(packageJson.scripts).join(", ")}`);
    }

    const dependencies = Object.keys(packageJson.dependencies ?? {});
    if (dependencies.length > 0) {
      lines.push(`- dependencies: ${dependencies.join(", ")}`);
    }

    const devDependencies = Object.keys(packageJson.devDependencies ?? {});
    if (devDependencies.length > 0) {
      lines.push(`- devDependencies: ${devDependencies.join(", ")}`);
    }

    return lines.join("\n");
  }

  private formatFileSection(title: string, files: string[]): string {
    if (files.length === 0) {
      return "";
    }

    return [`## ${title}`, ...files.map(file => `- ${file}`)].join("\n");
  }
}
