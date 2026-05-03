import { agentConfig } from "../config/agent.js";
import { Orchestrator } from "../core/engine.js";

export class AutoHealingWorkflow {
  constructor(private readonly orchestrator: Orchestrator) {}

  async execute(task: string): Promise<void> {
    console.log("\n[AutoHeal]: Starting bounded auto-healing workflow...");

    for (let attempt = 1; attempt <= agentConfig.autoHealMaxAttempts; attempt++) {
      console.log(`\n--- Auto-heal attempt ${attempt}/${agentConfig.autoHealMaxAttempts} ---`);
      const prompt = [
        `Task: ${task}`,
        "",
        "You are in bounded auto-healing mode.",
        "1. Run the most relevant verification command for this project.",
        "2. If it fails, inspect the error output and read the affected files.",
        "3. Make the smallest safe fix using available tools.",
        "4. Re-run the verification command once.",
        "5. Stop when verification passes, or report the blocker clearly.",
      ].join("\n");

      await this.orchestrator.run(prompt);
    }

    console.log("\n[AutoHeal]: Workflow completed.");
  }
}
