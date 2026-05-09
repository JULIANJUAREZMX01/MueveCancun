/**
 * POST /api/v1/nexus
 * Nexus Agent — backend serverless para el chat de transporte.
 *
 * Flujo: Groq (llama-3.1-8b-instant, 0ms cold start) → fallback rule-based.
 * No requiere WebLLM ni descarga de modelo en el cliente.
 *
 * Env vars (opcionales — tiene fallback sin ellas):
 *   GROQ_API_KEY  — si está presente, usa Groq; si no, responde rule-based
 */
import type { APIRoute } from 'astro';
import { logger } from '../../../utils/logger';

export const prerender = false;

const SYSTEM_PROMPT = `Eres Nexus, el asistente de transporte público de Cancún de MueveCancún.
Responde SIEMPRE en español, de forma corta y útil (máximo 80 palabras).
Tienes conocimiento experto sobre:
- Rutas: R-1 (Centro↔Zona Hotelera $12), R-2 (Centro circular $10), R-6 (hasta 10pm $10),
  R-10 (Centro↔Aeropuerto $20 — no llega al aeropuerto directo, termina Las Américas),
  R-27 (Tierra Maya), ADO ($80-150 MXN al aeropuerto), Combis ($10),
  Playa Express (Cancún→Playa del Carmen ~$100).
- El Crucero (Av. Tulum+Cobá): hub central de transferencias.
- Tarifas 2025-2026: combis/urbanos $10-12 MXN, Zona Hotelera $12, ADO $80-150 MXN.
- Horarios: 5am-11pm general; R-6 solo hasta 10pm.
No inventes rutas. Si no sabes algo exacto, di que usen el calculador de rutas de la app.`;

// ── Rule-based fallback (sin LLM) ────────────────────────────────────────────
function ruleBased(q: string): string {
  const n = q.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if (n.match(/aeropuerto|airport|vuelo/))
    return '✈️ ADO desde terminal centro ($80-150 MXN) o R-27 + taxi desde Las Américas. La R-10 NO llega directo al aeropuerto.';
  if (n.match(/zona hotelera|hotel zone|playa.*delfin/))
    return '🏨 R-1 desde el centro, sale cada 10-15 min. $12 MXN. Baja donde veas los hoteles.';
  if (n.match(/precio|costo|cuanto|tarifa|cobran/))
    return '💰 Tarifas 2025: Combis $10 · Urbanos $10-12 · Zona Hotelera $12 · ADO $80-150 MXN.';
  if (n.match(/horario|hora.*paso|frecuencia/))
    return '🕐 Operan 5am-11pm. R-6 solo hasta 10pm. Buses de ZH tienen servicio nocturno.';
  if (n.match(/centro|downtown|mercado|tulum/))
    return '🏙️ Al Centro: R-2 o R-1. $10-12 MXN desde cualquier parada en Av. Kabah o Tulum.';
  if (n.match(/americas|plaza.*americas/))
    return '🛍️ Plaza Las Américas: R-10 o R-33 desde el centro. Baja en Av. Kabah. $10 MXN.';
  if (n.match(/playa.*carmen|playa del carmen/))
    return '🌊 Playa del Carmen: Playa Express desde Terminal ADO. ~$100 MXN. Sale cada hora.';
  if (n.match(/combi|colectivo/))
    return '🚐 Las combis cuestan $10 MXN y cubren rutas urbanas. Combi Roja va a Puerto Juárez/Ultramar.';
  if (n.match(/crucero|av.*tulum.*coba|coba.*tulum/))
    return '📍 El Crucero (Av. Tulum ✕ Cobá): hub central. Convergen R-1, R-2, R-19 y más.';
  if (n.match(/hola|buenas|hey|hi\b/))
    return '👋 ¡Hola! ¿A dónde necesitas llegar?';
  if (n.match(/gracias|thanks|ok\b/))
    return '✅ ¡Con gusto! Si necesitas otra ruta, aquí estoy.';
  return `🗺️ Para "${q.trim()}", usa el calculador de rutas — escribe origen y destino y te damos las paradas exactas.`;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { message, history = [] } = await request.json() as {
      message: string;
      history?: Array<{ role: string; content: string }>;
    };

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'message required' }), { status: 400 });
    }

    const groqKey = process.env.GROQ_API_KEY;

    // ── Path 1: Groq LLM ─────────────────────────────────────────────────────
    if (groqKey) {
      try {
        const messages = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history.slice(-4), // keep last 4 turns for context
          { role: 'user', content: message.trim() },
        ];

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages,
            max_tokens: 150,
            temperature: 0.6,
          }),
        });

        if (res.ok) {
          const data = await res.json() as { choices: Array<{ message: { content: string } }> };
          const reply = data.choices[0]?.message?.content?.trim() || ruleBased(message);
          return new Response(JSON.stringify({ reply, source: 'groq' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        logger.warn('[Nexus] Groq returned', res.status, '— falling back to rules');
      } catch (groqErr) {
        logger.warn('[Nexus] Groq failed:', groqErr);
      }
    }

    // ── Path 2: Rule-based fallback ──────────────────────────────────────────
    const reply = ruleBased(message);
    return new Response(JSON.stringify({ reply, source: 'rules' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    logger.error('[API/Nexus]', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
