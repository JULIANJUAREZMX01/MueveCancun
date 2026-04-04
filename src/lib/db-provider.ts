/**
 * db-provider.ts — Despachador de proveedor de base de datos
 *
 * Exporta la misma interfaz que guardians.ts, pero enruta automáticamente
 * a Neon (default) o Supabase según DATABASE_PROVIDER.
 *
 * Uso en API routes:
 *   import { saveGuardian, recordPayment } from '../../lib/db-provider';
 *   // (en lugar de importar directamente de guardians.ts o guardians-supabase.ts)
 *
 * Variables de entorno:
 *   DATABASE_PROVIDER = 'neon' | 'supabase'  (default: 'neon')
 */

export type { Guardian, Payment } from './guardians';

function provider() {
  return (process.env.DATABASE_PROVIDER ?? 'neon') as 'neon' | 'supabase';
}

export async function saveGuardian(
  ...args: Parameters<typeof import('./guardians').saveGuardian>
) {
  if (provider() === 'supabase') {
    const m = await import('./guardians-supabase');
    return m.saveGuardian(...args);
  }
  const m = await import('./guardians');
  return m.saveGuardian(...args);
}

export async function getGuardian(
  ...args: Parameters<typeof import('./guardians').getGuardian>
) {
  if (provider() === 'supabase') {
    const m = await import('./guardians-supabase');
    return m.getGuardian(...args);
  }
  const m = await import('./guardians');
  return m.getGuardian(...args);
}

export async function getActiveGuardians() {
  if (provider() === 'supabase') {
    const m = await import('./guardians-supabase');
    return m.getActiveGuardians();
  }
  const m = await import('./guardians');
  return m.getActiveGuardians();
}

export async function recordPayment(
  ...args: Parameters<typeof import('./guardians').recordPayment>
) {
  if (provider() === 'supabase') {
    const m = await import('./guardians-supabase');
    return m.recordPayment(...args);
  }
  const m = await import('./guardians');
  return m.recordPayment(...args);
}

export async function getAllPayments(customerId?: string) {
  if (provider() === 'supabase') {
    const m = await import('./guardians-supabase');
    return m.getAllPayments(customerId);
  }
  const m = await import('./guardians');
  return m.getAllPayments(customerId);
}

export async function getStats() {
  if (provider() === 'supabase') {
    const m = await import('./guardians-supabase');
    return m.getStats();
  }
  const m = await import('./guardians');
  return m.getStats();
}
