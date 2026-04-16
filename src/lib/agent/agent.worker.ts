import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

let handler: WebWorkerMLCEngineHandler | null = null;

handler = new WebWorkerMLCEngineHandler();

self.onmessage = (msg: MessageEvent) => {
  if (msg.data && typeof msg.data === 'object' && 'type' in msg.data && msg.data.type === 'nexus-init') {
    return;
  }
  if (handler) {
    handler.onmessage(msg);
  }
};
