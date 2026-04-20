import type { ChatCompletionTool } from "@mlc-ai/web-llm";

export const NEXUS_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "calculate_route",
      description: "Calculates the best public transport route between two points in Cancún. Use this whenever the user asks how to get somewhere, what bus to take, or wants directions.",
      parameters: {
        type: "object",
        properties: {
          origin:      { type: "string", description: "Starting location, neighborhood or landmark in Cancún" },
          destination: { type: "string", description: "Destination location, neighborhood or landmark in Cancún" }
        },
        required: ["origin", "destination"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_wallet_balance",
      description: "Retrieves the user's current digital wallet balance in MXN pesos.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  }
];

/** Garantiza que el motor WASM esté listo, inicializándolo lazy si es necesario */
async function ensureWasm(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if ((window as any).WASM_READY === true) return true;
  try {
    const { initWasm } = await import('../initWasm');
    const ok = await initWasm();
    return ok === true;
  } catch (e) {
    console.error('[NexusTools] initWasm lazy failed:', e);
    return false;
  }
}

export async function executeToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {

  if (name === "calculate_route") {
    const origin      = ((args.origin      as string) || '').trim();
    const destination = ((args.destination as string) || '').trim();

    if (!origin || !destination) {
      return { error: "Necesito origen y destino para calcular la ruta." };
    }

    try {
      const ready = await ensureWasm();
      if (!ready) {
        return {
          error: "El motor de rutas no está disponible aún.",
          suggestion: "Usa el calculador de rutas en la parte superior mientras el motor termina de cargar."
        };
      }
      const { WasmLoader } = await import('../../utils/WasmLoader');
      const wasm   = await WasmLoader.getModule();
      const raw    = wasm.find_route(origin, destination);
      if (!raw)    return { error: "No encontré ruta entre esos puntos." };
      const result = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (result?.legs) {
        result.summary = `${result.legs.length} tramo(s) · ~${result.duration_minutes ?? '?'} min · $${result.total_price ?? '?'} MXN`;
      }
      return result;
    } catch (e) {
      console.error('[NexusTools] calculate_route error:', e);
      return { error: "Error calculando la ruta. Por favor intenta de nuevo." };
    }
  }

  if (name === "get_wallet_balance") {
    try {
      const { getWalletBalance } = await import('../../utils/db');
      return await getWalletBalance();
    } catch {
      return { error: "No se pudo obtener el saldo.", amount: 0 };
    }
  }

  return { error: `Herramienta desconocida: ${name}` };
}
