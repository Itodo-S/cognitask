import { db, schema } from "./client.js";

async function seed() {
  const now = new Date().toISOString();

  const sampleTodos = [
    {
      id: crypto.randomUUID(),
      title: "Set up CogniTask project",
      description: "Initialize the project, install deps, configure database",
      status: "completed",
      priority: "high",
      category: "work",
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    },
    {
      id: crypto.randomUUID(),
      title: "Read Claude Agent SDK docs",
      description: "Study the TypeScript SDK reference and examples",
      status: "in_progress",
      priority: "high",
      category: "learning",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      title: "Integrate Claude Agent SDK",
      description: "Add the SDK and connect AI service to real Claude queries",
      status: "pending",
      priority: "urgent",
      category: "work",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      title: "Build the frontend",
      description: "React/Next.js frontend with real-time WebSocket updates",
      status: "pending",
      priority: "high",
      category: "work",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      title: "Deploy to production",
      description: "Deploy backend to Railway/Vercel, frontend to Vercel",
      status: "pending",
      priority: "medium",
      category: "work",
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const todo of sampleTodos) {
    await db.insert(schema.todos).values(todo);
  }

  console.log(`Seeded ${sampleTodos.length} todos`);
}

seed().catch(console.error);
