import { Orchestrator } from "../core/engine.js";

export class SoftwareDevelopmentWorkflow {
  private orchestrator: Orchestrator;

  constructor(orchestrator: Orchestrator) {
    this.orchestrator = orchestrator;
  }

  async execute(task: string) {
    console.log("\n[Workflow]: Starting software development process...");

    console.log("\n--- Step 1: Analyze and plan ---");
    const planPrompt = `Task: ${task}\nAnalyze this request and create a detailed implementation plan. Do not write code yet.`;
    await this.orchestrator.run(planPrompt);

    console.log("\n--- Step 2: Write code ---");
    const codePrompt =
      "Based on the plan above, write all required code. Use the write_file tool to create or update files.";
    await this.orchestrator.run(codePrompt);

    console.log("\n--- Step 3: Verify ---");
    const testPrompt =
      "If needed, use the run_terminal_command tool to install dependencies, run tests, or execute the generated code. Confirm whether it works without errors.";
    await this.orchestrator.run(testPrompt);

    console.log("\n[Workflow]: Process completed.");
  }
}
