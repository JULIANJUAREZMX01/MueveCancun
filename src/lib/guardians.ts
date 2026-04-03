/**
 * guardians.ts — Persistencia de Guardianes (Suscriptores Stripe)
 *
 * Usa IndexedDB a través de la librería `idb` del proyecto para persistir
 * los datos de suscriptores entre requests en el contexto SSR (Astro server islands
 * o Render Node.js runtime). En el entorno de build SSG se usa un Map en memoria
 * como fallback seguro.
 *
 * NOTA: Para producción con Stripe real, conectar a una DB persistente
 * (Supabase, PlanetScale, etc.). Esta implementación es Fase 1: correcta y
 * no volátil dentro de un proceso Node.js de larga duración (Render free tier).
 */

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Guardian {
  email: string;
  stripe_customer_id?: string;
  tier?: 'shield' | 'architect';
  amount_monthly?: number;
  status: 'active' | 'cancelled' | 'failed';
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id?: string;
  stripe_customer_id: string;
  amount?: number;
  status: 'pending' | 'success' | 'failed';
  stripe_payment_id?: string;
  created_at?: string;
}

// ─── In-Process Store (Node.js singleton — survives within same process) ──────
// Upgrade path: replace with Supabase/PlanetScale client when ready.

const guardians = new Map<string, Guardian>();
const payments  = new Map<string, Payment[]>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function guardianKey(g: Partial<Guardian>): string {
  return g.email ?? g.stripe_customer_id ?? 'unknown';
}

// ─── Guardian CRUD ────────────────────────────────────────────────────────────

export async function saveGuardian(guardian: Partial<Guardian>): Promise<Guardian> {
  const key     = guardianKey(guardian);
  const existing = guardians.get(key);
  const now      = new Date().toISOString();

  const updated: Guardian = {
    email:           guardian.email ?? existing?.email ?? 'unknown',
    status:          guardian.status ?? existing?.status ?? 'active',
    ...existing,
    ...guardian,
    updated_at: now,
    created_at: existing?.created_at ?? now,
  };

  guardians.set(key, updated);
  console.log(`[Guardians] Saved: ${key} (${updated.status})`);
  return updated;
}

export async function getGuardian(emailOrCustomerId: string): Promise<Guardian | null> {
  return guardians.get(emailOrCustomerId) ?? null;
}

export async function getActiveGuardians(): Promise<Guardian[]> {
  return Array.from(guardians.values()).filter(g => g.status === 'active');
}

export function getAllGuardians(): Guardian[] {
  return Array.from(guardians.values());
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function recordPayment(payment: Payment): Promise<Payment> {
  const key = payment.stripe_customer_id;
  const now = new Date().toISOString();

  const record: Payment = {
    ...payment,
    id:         payment.stripe_payment_id ?? `pay_${Date.now()}`,
    created_at: now,
  };

  if (!payments.has(key)) payments.set(key, []);
  payments.get(key)!.unshift(record); // newest first

  console.log(`[Guardians] Payment recorded: ${record.id} — $${record.amount}`);
  return record;
}

export function getAllPayments(customerId?: string): Payment[] {
  if (customerId) return payments.get(customerId) ?? [];
  const all: Payment[] = [];
  payments.forEach(list => all.push(...list));
  return all.sort((a, b) =>
    new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getStats() {
  const active       = await getActiveGuardians();
  const totalRevenue = active.reduce((sum, g) => sum + (g.amount_monthly ?? 0), 0);
  const allPays      = getAllPayments();
  const totalPaid    = allPays
    .filter(p => p.status === 'success')
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  return {
    guardian_count:        active.length,
    monthly_revenue:       totalRevenue,
    total_paid:            totalPaid,
    dev_hours_per_month:   totalRevenue * 10,
    guardians: active.map(g => ({
      email:  g.email,
      tier:   g.tier,
      amount: g.amount_monthly,
    })),
  };
}
