/**
 * guardians-supabase.ts — Persistencia de Guardianes con Supabase Postgres
 *
 * Implementación alternativa a guardians.ts (Neon) usando Supabase.
 * Expone la MISMA interfaz pública: saveGuardian, getGuardian,
 * getActiveGuardians, recordPayment, getAllPayments, getStats.
 *
 * Para activar: establecer DATABASE_PROVIDER=supabase en Vercel.
 * El archivo guardians.ts (Neon) permanece intacto.
 *
 * Env vars requeridas:
 *   SUPABASE_URL         = https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY = service_role key
 *
 * SQL de migración: supabase/migrations/001_init.sql
 */

import { getSupabaseClient } from './supabase';
import type { Guardian, Payment } from './guardians';

export type { Guardian, Payment };

// ─── Guardian CRUD ────────────────────────────────────────────────────────────

export async function saveGuardian(guardian: Partial<Guardian>): Promise<Guardian> {
  const sb = getSupabaseClient();
  const now = new Date().toISOString();

  const record = {
    stripe_customer_id: guardian.stripe_customer_id ?? '',
    email:              guardian.email ?? 'unknown',
    tier:               guardian.tier ?? null,
    amount_monthly:     guardian.amount_monthly ?? null,
    status:             guardian.status ?? 'active',
    created_at:         now,
    updated_at:         now,
  };

  if (!record.stripe_customer_id) {
    // Sin customer_id: insert con ID aleatorio
    const { error } = await sb
      .from('guardians')
      .insert({ ...record, stripe_customer_id: crypto.randomUUID() });
    if (error) throw new Error(`[Supabase] saveGuardian insert: ${error.message}`);
  } else {
    const { error } = await sb
      .from('guardians')
      .upsert(record, { onConflict: 'stripe_customer_id' });
    if (error) throw new Error(`[Supabase] saveGuardian upsert: ${error.message}`);
  }

  console.log(`[Supabase/Guardians] Saved: ${guardian.stripe_customer_id ?? guardian.email} (${guardian.status})`);
  return { ...guardian, created_at: now, updated_at: now } as Guardian;
}

export async function getGuardian(emailOrCustomerId: string): Promise<Guardian | null> {
  const sb = getSupabaseClient();

  // Try by stripe_customer_id first, then by email — avoids string interpolation in .or()
  const byCustomerId = await sb
    .from('guardians')
    .select('*')
    .eq('stripe_customer_id', emailOrCustomerId)
    .maybeSingle();

  if (byCustomerId.error) throw new Error(`[Supabase] getGuardian (by id): ${byCustomerId.error.message}`);
  if (byCustomerId.data) return byCustomerId.data as Guardian;

  const byEmail = await sb
    .from('guardians')
    .select('*')
    .eq('email', emailOrCustomerId)
    .limit(1)
    .maybeSingle();

  if (byEmail.error) throw new Error(`[Supabase] getGuardian (by email): ${byEmail.error.message}`);
  return byEmail.data as Guardian | null;
}

export async function getActiveGuardians(): Promise<Guardian[]> {
  const sb = getSupabaseClient();

  const { data, error } = await sb
    .from('guardians')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`[Supabase] getActiveGuardians: ${error.message}`);
  return (data ?? []) as Guardian[];
}

export function getAllGuardians(): Guardian[] {
  console.warn('[Supabase/Guardians] getAllGuardians() is sync — use getActiveGuardians() instead.');
  return [];
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function recordPayment(payment: Payment): Promise<Payment> {
  const sb = getSupabaseClient();
  const now = new Date().toISOString();
  const id  = payment.stripe_payment_id ?? `pay_${Date.now()}`;

  const { error } = await sb
    .from('payments')
    .upsert(
      {
        id,
        stripe_customer_id: payment.stripe_customer_id,
        amount:             payment.amount ?? null,
        status:             payment.status,
        stripe_payment_id:  payment.stripe_payment_id ?? null,
        created_at:         now,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );

  if (error) throw new Error(`[Supabase] recordPayment: ${error.message}`);

  console.log(`[Supabase/Guardians] Payment recorded: ${id} — $${payment.amount}`);
  return { ...payment, id, created_at: now };
}

export async function getAllPayments(customerId?: string): Promise<Payment[]> {
  const sb = getSupabaseClient();

  let query = sb
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });

  if (customerId) {
    query = query.eq('stripe_customer_id', customerId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`[Supabase] getAllPayments: ${error.message}`);
  return (data ?? []) as Payment[];
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getStats() {
  const sb = getSupabaseClient();

  // Conteo + revenue de guardianes activos
  const { data: activeData, error: activeErr } = await sb
    .from('guardians')
    .select('amount_monthly')
    .eq('status', 'active');

  if (activeErr) throw new Error(`[Supabase] getStats (guardians): ${activeErr.message}`);

  const guardian_count  = activeData?.length ?? 0;
  const monthly_revenue = (activeData ?? []).reduce(
    (sum, g) => sum + (g.amount_monthly ?? 0),
    0
  );

  // Total pagado (payments con status success)
  const { data: paymentsData, error: payErr } = await sb
    .from('payments')
    .select('amount')
    .eq('status', 'success');

  if (payErr) throw new Error(`[Supabase] getStats (payments): ${payErr.message}`);

  const total_paid = (paymentsData ?? []).reduce(
    (sum, p) => sum + (p.amount ?? 0),
    0
  );

  return {
    guardian_count,
    monthly_revenue,
    total_paid,
    dev_hours_per_month: monthly_revenue * 10,
    guardians: await getActiveGuardians(),
  };
}
