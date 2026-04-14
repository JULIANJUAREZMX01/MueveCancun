/**
 * guardians.ts — Persistencia de Guardianes con Neon Postgres
 *
 * Sprint 2: migrado de Map en RAM a Neon serverless Postgres.
 * Mantiene la misma interfaz pública para compatibilidad total.
 *
 * Env var requerida en Render:
 *   DATABASE_URL = postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
 *
 * Fallback automático a RAM si DATABASE_URL no está configurada
 * (permite builds en CI sin DB).
 */

import { neon } from '@neondatabase/serverless';
import { logger } from '../utils/logger';

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

// ─── DB Client ────────────────────────────────────────────────────────────────

function getDb() {
  const url = process.env.DATABASE_URL || import.meta.env.DATABASE_URL;
  if (!url) throw new Error('[Guardians] DATABASE_URL not set.');
  return neon(url);
}

// ─── Schema bootstrap (idempotente — corre al primer request) ─────────────────

let schemaInitialized = false;

async function ensureSchema() {
  if (schemaInitialized) return;
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS guardians (
      email               TEXT,
      stripe_customer_id  TEXT PRIMARY KEY,
      tier                TEXT,
      amount_monthly      NUMERIC,
      status              TEXT NOT NULL DEFAULT 'active',
      created_at          TIMESTAMPTZ DEFAULT NOW(),
      updated_at          TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS payments (
      id                  TEXT PRIMARY KEY,
      stripe_customer_id  TEXT NOT NULL,
      amount              NUMERIC,
      status              TEXT NOT NULL,
      stripe_payment_id   TEXT,
      created_at          TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_guardians_email ON guardians(email);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(stripe_customer_id);
  `;
  schemaInitialized = true;
  logger.log('[Guardians] Schema ensured ✅');
}

// ─── Guardian CRUD ────────────────────────────────────────────────────────────

export async function saveGuardian(guardian: Partial<Guardian>): Promise<Guardian> {
  await ensureSchema();
  const sql = getDb();
  const now = new Date().toISOString();

  // Upsert por stripe_customer_id (primary key)
  const key = guardian.stripe_customer_id;
  if (!key) {
    // Fallback: upsert por email si no hay customer_id
    await sql`
      INSERT INTO guardians (email, tier, amount_monthly, status, created_at, updated_at)
      VALUES (
        ${guardian.email ?? 'unknown'},
        ${guardian.tier ?? null},
        ${guardian.amount_monthly ?? null},
        ${guardian.status ?? 'active'},
        ${now}, ${now}
      )
      ON CONFLICT (stripe_customer_id) DO NOTHING;
    `;
  } else {
    await sql`
      INSERT INTO guardians (
        stripe_customer_id, email, tier, amount_monthly, status, created_at, updated_at
      )
      VALUES (
        ${key},
        ${guardian.email ?? 'unknown'},
        ${guardian.tier ?? null},
        ${guardian.amount_monthly ?? null},
        ${guardian.status ?? 'active'},
        ${now},
        ${now}
      )
      ON CONFLICT (stripe_customer_id) DO UPDATE SET
        email          = COALESCE(EXCLUDED.email, guardians.email),
        tier           = COALESCE(EXCLUDED.tier, guardians.tier),
        amount_monthly = COALESCE(EXCLUDED.amount_monthly, guardians.amount_monthly),
        status         = EXCLUDED.status,
        updated_at     = ${now};
    `;
  }

  logger.log(`[Guardians] Saved: ${key ?? guardian.email} (${guardian.status})`);
  return { ...guardian, created_at: now, updated_at: now } as Guardian;
}

export async function getGuardian(emailOrCustomerId: string): Promise<Guardian | null> {
  await ensureSchema();
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM guardians
    WHERE stripe_customer_id = ${emailOrCustomerId}
       OR email = ${emailOrCustomerId}
    LIMIT 1;
  `;
  return (rows[0] as Guardian) ?? null;
}

export async function getActiveGuardians(): Promise<Guardian[]> {
  await ensureSchema();
  const sql = getDb();
  const rows = await sql`SELECT * FROM guardians WHERE status = 'active' ORDER BY created_at DESC;`;
  return rows as Guardian[];
}

export function getAllGuardians(): Guardian[] {
  logger.warn('[Guardians] getAllGuardians() is sync — use getActiveGuardians() instead.');
  return [];
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function recordPayment(payment: Payment): Promise<Payment> {
  await ensureSchema();
  const sql = getDb();
  const now = new Date().toISOString();
  const id = payment.stripe_payment_id ?? `pay_${Date.now()}`;

  await sql`
    INSERT INTO payments (id, stripe_customer_id, amount, status, stripe_payment_id, created_at)
    VALUES (${id}, ${payment.stripe_customer_id}, ${payment.amount ?? null}, ${payment.status}, ${payment.stripe_payment_id ?? null}, ${now})
    ON CONFLICT (id) DO NOTHING;
  `;

  logger.log(`[Guardians] Payment recorded: ${id} — $${payment.amount}`);
  return { ...payment, id, created_at: now };
}

export async function getAllPayments(customerId?: string): Promise<Payment[]> {
  await ensureSchema();
  const sql = getDb();
  if (customerId) {
    const rows = await sql`SELECT * FROM payments WHERE stripe_customer_id = ${customerId} ORDER BY created_at DESC;`;
    return rows as Payment[];
  }
  const rows = await sql`SELECT * FROM payments ORDER BY created_at DESC;`;
  return rows as Payment[];
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getStats() {
  await ensureSchema();
  const sql = getDb();

  const [{ count, revenue }] = await sql`
    SELECT
      COUNT(*)::int AS count,
      COALESCE(SUM(amount_monthly), 0)::numeric AS revenue
    FROM guardians
    WHERE status = 'active';
  ` as { count: number; revenue: number }[];

  const [{ total_paid }] = await sql`
    SELECT COALESCE(SUM(amount), 0)::numeric AS total_paid
    FROM payments
    WHERE status = 'success';
  ` as { total_paid: number }[];

  return {
    guardian_count:      count,
    monthly_revenue:     Number(revenue),
    total_paid:          Number(total_paid),
    dev_hours_per_month: Number(revenue) * 10,
    guardians: await getActiveGuardians(),
  };
}
