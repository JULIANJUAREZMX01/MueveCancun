/**
 * supabase.ts — Cliente Supabase Server-Side
 *
 * Integración paralela a Neon (rama: claude/supabase-integration).
 * Para activar Supabase en producción, configura en Vercel:
 *   SUPABASE_URL        = https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY = service_role key (NO la anon key)
 *
 * La anon key NO se usa server-side para evitar bypass de RLS.
 * DATABASE_PROVIDER = 'supabase' | 'neon' (default: neon)
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase-types';

let _client: SupabaseClient<Database> | null = null;

/**
 * Retorna el cliente Supabase singleton.
 * Lanza error claro si las vars de entorno no están configuradas.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error(
      '[Supabase] SUPABASE_URL y SUPABASE_SERVICE_KEY son requeridas. ' +
      'Configúralas en el Dashboard de Vercel o en tu .env local.'
    );
  }

  _client = createClient<Database>(url, key, {
    auth: {
      // Server-side: no persistir sesión
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return _client;
}

/**
 * Verifica si Supabase está configurado (para health checks).
 */
export function isSupabaseConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}

const VALID_PROVIDERS = new Set(['neon', 'supabase']);

/**
 * Retorna el proveedor de DB activo con validación.
 * Por defecto usa Neon para mantener backwards compatibility.
 */
export function getDbProvider(): 'supabase' | 'neon' {
  const raw = process.env.DATABASE_PROVIDER ?? 'neon';
  return VALID_PROVIDERS.has(raw) ? (raw as 'supabase' | 'neon') : 'neon';
}
