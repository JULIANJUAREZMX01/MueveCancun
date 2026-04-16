/**
 * Nexus Agentic Core - Tools Bridge
 */

import type { ChatCompletionTool } from "@mlc-ai/web-llm";

export const NEXUS_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "calculate_route",
      description: "Calculates the best public transport route between two points in Cancún.",
      parameters: {
        type: "object",
        properties: {
          origin: { type: "string" },
          destination: { type: "string" }
        },
        required: ["origin", "destination"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_wallet_balance",
      description: "Retrieves the user's current digital wallet balance in MXN.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  }
];

export async function executeToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  console.log(`[NexusAgent] Executing tool: ${name}`, args);

  if (name === "calculate_route") {
    // Validate that both origin and destination are present and are strings
    if (!args.origin || typeof args.origin !== 'string') {
      return { error: "Missing or invalid 'origin' argument. Must be a non-empty string." };
    }
    if (!args.destination || typeof args.destination !== 'string') {
      return { error: "Missing or invalid 'destination' argument. Must be a non-empty string." };
    }

    if (typeof window !== 'undefined' && (window as unknown as Record<string, boolean>).WASM_READY) {
       const { WasmLoader } = await import('../../utils/WasmLoader');
       const wasm = await WasmLoader.getModule();
       const result = wasm.find_route(args.origin, args.destination);
       return typeof result === 'string' ? (JSON.parse(result) as unknown) : result;
    }
    return { error: "WASM Engine not ready" };
  }

  if (name === "get_wallet_balance") {
    const { getWalletBalance } = await import('../../utils/db');
    const balance = await getWalletBalance();
    return balance;
  }

  throw new Error(`Unknown tool: ${name}`);
}
