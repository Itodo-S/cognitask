import type {
  DecomposeRequest,
  DecomposeResult,
  CategorizeRequest,
  CategorizeResult,
  PrioritizeRequest,
  PrioritizeResult,
  SuggestRequest,
  SuggestionResult,
  EstimateRequest,
  EstimateResult,
  AgentEvent,
} from "../types/ai.js";

export interface AIService {
  decompose(request: DecomposeRequest): AsyncGenerator<AgentEvent, DecomposeResult>;
  categorize(request: CategorizeRequest): Promise<CategorizeResult>;
  prioritize(request: PrioritizeRequest): Promise<PrioritizeResult>;
  suggest(request: SuggestRequest): Promise<SuggestionResult[]>;
  estimate(request: EstimateRequest): Promise<EstimateResult>;
}

export class MockAIService implements AIService {
  async *decompose(request: DecomposeRequest): AsyncGenerator<AgentEvent, DecomposeResult> {
    yield { type: "thinking", data: { message: "Analyzing goal..." } };

    const todos = this.generateDecomposedTasks(request.goal, request.maxTasks ?? 5);

    yield { type: "task_generated", data: { count: todos.length } };

    const result: DecomposeResult = {
      sessionId: crypto.randomUUID(),
      todos,
      summary: `Decomposed "${request.goal}" into ${todos.length} actionable tasks.`,
    };

    yield { type: "complete", data: result };
    return result;
  }

  async categorize(request: CategorizeRequest): Promise<CategorizeResult> {
    const text = `${request.title} ${request.description ?? ""}`.toLowerCase();

    if (/meeting|call|email|report|project|sprint|deploy/.test(text)) {
      return { category: "work", confidence: 0.85, reasoning: "Contains work-related keywords." };
    }
    if (/exercise|gym|run|walk|sleep|diet|health/.test(text)) {
      return { category: "health", confidence: 0.9, reasoning: "Contains health-related keywords." };
    }
    if (/budget|save|invest|pay|bill|tax/.test(text)) {
      return { category: "finance", confidence: 0.88, reasoning: "Contains finance-related keywords." };
    }
    if (/learn|read|course|study|tutorial|practice/.test(text)) {
      return { category: "learning", confidence: 0.87, reasoning: "Contains learning-related keywords." };
    }
    if (/draw|paint|music|write|design|create/.test(text)) {
      return { category: "creative", confidence: 0.82, reasoning: "Contains creative-related keywords." };
    }
    if (/buy|pick|drop|fix|clean|repair|errand/.test(text)) {
      return { category: "errands", confidence: 0.8, reasoning: "Contains errand-related keywords." };
    }
    if (/friend|party|dinner|visit|call|hangout/.test(text)) {
      return { category: "social", confidence: 0.83, reasoning: "Contains social-related keywords." };
    }
    if (/cook|laundry|clean|organize|move|pack/.test(text)) {
      return { category: "personal", confidence: 0.8, reasoning: "Contains personal task keywords." };
    }

    return { category: "other", confidence: 0.5, reasoning: "Could not confidently categorize." };
  }

  async prioritize(request: PrioritizeRequest): Promise<PrioritizeResult> {
    const text = `${request.title} ${request.description ?? ""}`.toLowerCase();

    if (/urgent|asap|critical|deadline|overdue/.test(text)) {
      return { priority: "urgent", reasoning: "Contains urgency indicators." };
    }
    if (/important|deadline|due|meeting|presentation/.test(text)) {
      return { priority: "high", reasoning: "Contains importance indicators." };
    }
    if (/should|need|plan|prepare|schedule/.test(text)) {
      return { priority: "medium", reasoning: "Standard priority task." };
    }

    return { priority: "low", reasoning: "No urgency indicators found." };
  }

  async suggest(request: SuggestRequest): Promise<SuggestionResult[]> {
    const pending = request.currentTodos?.filter((t) => t.status === "pending") ?? [];
    const suggestions: SuggestionResult[] = [];

    if (pending.length === 0) {
      suggestions.push({
        title: "Start a daily planning session",
        description: "Create a task list for today.",
        priority: "medium",
        category: "personal",
        reason: "No pending tasks — great time to plan ahead.",
      });
    }

    const urgentMissing = pending.every((t) => t.priority !== "urgent");
    if (urgentMissing && pending.length > 3) {
      suggestions.push({
        title: "Review and reprioritize tasks",
        description: "Ensure your most important tasks are flagged correctly.",
        priority: "high",
        category: "work",
        reason: "Many pending tasks without urgent priority.",
      });
    }

    suggestions.push({
      title: "Take a 5-minute break",
      description: "Step away and recharge.",
      priority: "low",
      category: "health",
      reason: "Regular breaks improve productivity.",
    });

    return suggestions;
  }

  async estimate(request: EstimateRequest): Promise<EstimateResult> {
    const text = `${request.title} ${request.description ?? ""}`.toLowerCase();

    if (/quick|simple|minor|trivial|email|text|call/.test(text)) {
      return {
        estimatedMinutes: 15,
        complexity: "simple",
        reasoning: "Appears to be a quick, straightforward task.",
      };
    }
    if (/complex|large|major|project|build|implement|design|architect/.test(text)) {
      return {
        estimatedMinutes: 240,
        complexity: "complex",
        reasoning: "Appears to be a large or multi-step task.",
      };
    }

    return {
      estimatedMinutes: 60,
      complexity: "moderate",
      reasoning: "Standard task complexity.",
    };
  }

  private generateDecomposedTasks(goal: string, maxTasks: number) {
    const templates = [
      { title: "Research and understand requirements", category: "learning", priority: "high" as const },
      { title: "Create initial plan and timeline", category: "work", priority: "high" as const },
      { title: "Set up necessary tools and resources", category: "work", priority: "medium" as const },
      { title: "Execute core work", category: "work", priority: "high" as const },
      { title: "Review and validate results", category: "work", priority: "medium" as const },
      { title: "Document outcomes", category: "work", priority: "low" as const },
      { title: "Share progress with stakeholders", category: "social", priority: "medium" as const },
      { title: "Follow up on action items", category: "work", priority: "medium" as const },
    ];

    return templates.slice(0, maxTasks).map((t) => ({
      title: `${t.title} for: ${goal}`,
      description: `Step in achieving: ${goal}`,
      priority: t.priority,
      category: t.category,
      estimatedMinutes: t.priority === "high" ? 120 : t.priority === "medium" ? 60 : 30,
    }));
  }
}

export const aiService: AIService = new MockAIService();
