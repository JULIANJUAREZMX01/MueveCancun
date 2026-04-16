/**
 * Nexus Agentic Core - Tools Bridge
 *
 * Defines the tools available to the local SLM, mapping natural language
 * intent to high-performance WASM functions.
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
          origin: {
            type: "string",
            description: "Name of the starting stop or landmark (e.g., 'El Crucero')"
          },
          destination: {
            type: "string",
            description: "Name of the destination stop or landmark (e.g., 'Hospital General')"
          }
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

/**
 * Executes a tool call using the local system state (WASM/IndexedDB).
 */
export async function executeToolCall(name: string, args: any) {
  console.log(`[NexusAgent] Executing tool: ${name}`, args);

  if (name === "calculate_route") {
    // This will be called from the main thread where WASM is loaded
    // or we might need to proxy it to the main thread.
    const { find_route } = await import('../initWasm');
    // Assuming find_route is exposed or accessible via window
    if ((window as any).WASM_READY) {
       // Since find_route in Rust takes &str and returns JsValue (Journey[])
       const { WasmLoader } = await import('../../utils/WasmLoader');
       const wasm = await WasmLoader.getModule();
       const result = wasm.find_route(args.origin, args.destination);
       return typeof result === 'string' ? JSON.parse(result) : result;
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
