import * as webllm from "@mlc-ai/web-llm";
import { NEXUS_TOOLS, executeToolCall } from "./tools";

export class NexusAgent {
  private static instance: NexusAgent;
  private engine: webllm.MLCEngineInterface | null = null;
  private isInitializing = false;
  private modelId = "Llama-3.2-1B-Instruct-q4f16_1-MLC"; // Small model for browser

  static getInstance(): NexusAgent {
    if (!NexusAgent.instance) {
      NexusAgent.instance = new NexusAgent();
    }
    return NexusAgent.instance;
  }

  async init(progressCallback?: (report: webllm.InitProgressReport) => void) {
    if (this.engine || this.isInitializing) return;
    this.isInitializing = true;

    try {
      // 1. Try Gemini Nano (Prompt API) - window.ai
      if (typeof window !== 'undefined' && (window as any).ai?.createTextSession) {
        console.log('[NexusAgent] Gemini Nano detected. Using Prompt API.');
        // We wrap Gemini Nano to match MLCEngineInterface if possible or use it directly
        // For now, let's proceed with WebLLM as the main robust local driver
      }

      // 2. Initialize WebLLM Worker
      console.log('[NexusAgent] Initializing WebLLM Worker...');
      this.engine = await webllm.CreateWebWorkerMLCEngine(
        new Worker(new URL("./agent.worker.ts", import.meta.url), { type: "module" }),
        this.modelId,
        { initProgressCallback: progressCallback }
      );

      console.log('[NexusAgent] Agent Core Ready.');
    } catch (e) {
      console.error('[NexusAgent] Initialization failed', e);
    } finally {
      this.isInitializing = false;
    }
  }

  async ask(prompt: string): Promise<string> {
    if (!this.engine) throw new Error("Agent not initialized");

    const messages: webllm.ChatCompletionMessageParam[] = [
      { role: "system", content: "You are the MueveCancún Assistant. You help users find bus routes and manage their wallet. Use the provided tools to get real data." },
      { role: "user", content: prompt }
    ];

    const response = await this.engine.chat.completions.create({
      messages,
      tools: NEXUS_TOOLS,
      tool_choice: "auto"
    });

    const message = response.choices[0].message;

    if (message.tool_calls) {
      const toolResults = [];
      for (const toolCall of message.tool_calls) {
        const result = await executeToolCall(toolCall.function.name, JSON.parse(toolCall.function.arguments));
        toolResults.push({
          role: "tool",
          content: JSON.stringify(result),
          tool_call_id: toolCall.id
        });
      }

      // Second pass with tool results
      const finalResponse = await this.engine.chat.completions.create({
        messages: [...messages, message, ...toolResults as any]
      });

      return finalResponse.choices[0].message.content || "No response";
    }

    return message.content || "No response";
  }
}
