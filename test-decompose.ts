import { ClaudeOrchestrator } from "./src/agents/claude-orchestrator.js";
import { createAIService } from "./src/services/claude-ai.service.js";

async function main() {
  const service = createAIService();
  const orchestrator = new ClaudeOrchestrator(service);
  console.log("Decomposing...");
  try {
    const result = await orchestrator.decomposeGoal({ goal: "Learn Rust in 2026", maxTasks: 2 });
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}
main();
