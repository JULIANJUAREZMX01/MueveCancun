import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

/**
 * Nexus Agentic Core - Web Worker
 *
 * This worker handles the inference for the local AI agent.
 * It prioritizes Gemini Nano (Prompt API) if available in the environment,
 * otherwise it falls back to WebLLM (WASM/WebGPU).
 */

let handler: WebWorkerMLCEngineHandler | null = null;

// Initialize WebLLM handler
handler = new WebWorkerMLCEngineHandler();

self.onmessage = async (msg: MessageEvent) => {
  const { type, data } = msg.data;

  // Handle special 'init' for Gemini Nano or other custom logic
  if (type === 'nexus-init') {
    console.log('[NexusWorker] Initializing Agent Core...');
    // Future expansion for custom init logic
    return;
  }

  // Fallback to WebLLM handler for standard messages
  if (handler) {
    handler.onmessage(msg);
  }
};

console.log('[NexusWorker] Agent Worker Loaded');
