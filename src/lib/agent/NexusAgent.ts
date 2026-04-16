import * as webllm from "@mlc-ai/web-llm";
import { NEXUS_TOOLS, executeToolCall } from "./tools";

export class NexusAgent {
  private static instance: NexusAgent;
  private engine: webllm.MLCEngineInterface | null = null;
  private isInitializing = false;
  private modelId = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

  static getInstance(): NexusAgent {
    if (!NexusAgent.instance) NexusAgent.instance = new NexusAgent();
    return NexusAgent.instance;
  }

  async init(progressCallback?: (report: webllm.InitProgressReport) => void): Promise<void> {
    if (this.engine || this.isInitializing) return;
    this.isInitializing = true;
    try {
      this.engine = await webllm.CreateWebWorkerMLCEngine(
        new Worker(new URL("./agent.worker.ts", import.meta.url), { type: "module" }),
        this.modelId,
        { initProgressCallback: progressCallback }
      );
    } catch (e) {
      console.error('[NexusAgent] Initialization failed', e);
    } finally {
      this.isInitializing = false;
    }
  }

  async ask(prompt: string): Promise<string> {
    if (!this.engine) throw new Error("Agent not initialized");
    const messages: webllm.ChatCompletionMessageParam[] = [
      { role: "system", content: "You are the MueveCancún Assistant. Use the provided tools to get real data." },
      { role: "user", content: prompt }
    ];
    const response = await this.engine.chat.completions.create({ messages, tools: NEXUS_TOOLS, tool_choice: "auto" });
    const choice = response.choices[0];
    if (!choice || !choice.message) return "No response from AI.";
    const message = choice.message;
    if (message.tool_calls) {
      const toolResults: webllm.ChatCompletionMessageParam[] = [];
      for (const toolCall of message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
        const result = await executeToolCall(toolCall.function.name, args);
        toolResults.push({
          role: "tool",
          content: JSON.stringify(result),
          tool_call_id: toolCall.id
        } as webllm.ChatCompletionToolMessageParam);
      }
      const finalResponse = await this.engine.chat.completions.create({ messages: [...messages, message, ...toolResults] });
      return finalResponse.choices[0]?.message?.content || "No response after tool execution.";
    }
    return message.content || "No response from AI.";
  }
}
