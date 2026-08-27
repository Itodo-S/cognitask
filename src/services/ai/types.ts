/** Shared, provider-neutral shapes for the AI clients. */

export interface JsonSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

export interface MessageOptions {
  system?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  /** Prior turns, for multi-turn chat. */
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface StructuredOptions<T> extends MessageOptions {
  /** Name of the synthetic tool the model must call. */
  toolName: string;
  toolDescription: string;
  schema: JsonSchema;
  /** Last-resort value if the model and every retry fail. */
  fallback: T;
}

/** The surface every AI client must expose, so they are interchangeable. */
export interface AIClient {
  message(prompt: string, options?: MessageOptions): Promise<string>;
  structured<T>(prompt: string, options: StructuredOptions<T>): Promise<T>;
  aiConfigured(): boolean;
  modelName(): string;
}
