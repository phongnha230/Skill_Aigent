import * as fs from "fs";
import * as path from "path";
import { AuditLogger } from "../core/audit-logger.js";

function listAuditFiles(runsDir: string): string[] {
  if (!fs.existsSync(runsDir)) {
    return [];
  }

  return fs.readdirSync(runsDir).filter(file => file.endsWith(".json")).sort().reverse();
}

export async function handleAuditCommand(args: string[], logger: AuditLogger = new AuditLogger()): Promise<void> {
  const subcommand = args[0] ?? "list";

  if (subcommand === "path") {
    console.log(logger.runsDir);
    return;
  }

  if (subcommand === "list") {
    const files = listAuditFiles(logger.runsDir);
    console.log(files.length > 0 ? files.join("\n") : "No audit logs found.");
    return;
  }

  if (subcommand === "show") {
    const requestedFile = args[1];
    const files = listAuditFiles(logger.runsDir);
    const fileName = requestedFile && requestedFile !== "latest" ? requestedFile : files[0];
    if (!fileName) {
      console.log("No audit logs found.");
      return;
    }

    const filePath = path.join(logger.runsDir, fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`Audit log not found: ${fileName}`);
      return;
    }

    console.log(fs.readFileSync(filePath, "utf8").trim());
    return;
  }

  console.log(`Unknown audit command: ${subcommand}`);
  console.log("Available audit commands: list, path, show");
}
