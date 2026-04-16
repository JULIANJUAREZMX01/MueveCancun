import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

/**
 * Nexus Agentic Core - Web Worker
 */

let handler: WebWorkerMLCEngineHandler | null = null;

handler = new WebWorkerMLCEngineHandler();

self.onmessage = (msg: MessageEvent) => {
  if (msg.data && typeof msg.data === 'object' && 'type' in msg.data && msg.data.type === 'nexus-init') {
    console.log('[NexusWorker] Initializing Agent Core...');
    return;
  }

  if (handler) {
    handler.onmessage(msg);
  }
};

console.log('[NexusWorker] Agent Worker Loaded');
