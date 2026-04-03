// Simple in-memory storage (WASM version)
const guardians = new Map<string, any>();
const payments = new Map<string, any[]>();

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

export async function saveGuardian(guardian: Partial<Guardian>) {
  try {
    const key = guardian.email || guardian.stripe_customer_id || 'unknown';

    const existing = guardians.get(key);
    const now = new Date().toISOString();

    const updated = {
      ...existing,
      ...guardian,
      updated_at: now,
      created_at: existing?.created_at || now,
    };

    guardians.set(key, updated);
    console.log(`✅ Guardian saved: ${key}`, updated);

    return updated;
  } catch (error) {
    console.error('Save guardian error:', error);
    throw error;
  }
}

export async function getGuardian(email: string) {
  try {
    const guardian = guardians.get(email);
    return guardian || null;
  } catch (error) {
    console.error('Get guardian error:', error);
    return null;
  }
}

export async function recordPayment(payment: Payment) {
  try {
    const key = payment.stripe_customer_id;
    const now = new Date().toISOString();

    const record = {
      ...payment,
      id: payment.stripe_payment_id || `payment_${Date.now()}`,
      created_at: now,
    };

    if (!payments.has(key)) {
      payments.set(key, []);
    }

    payments.get(key)!.push(record);
    console.log(`✅ Payment recorded: ${payment.stripe_payment_id}`, record);

    return record;
  } catch (error) {
    console.error('Record payment error:', error);
    throw error;
  }
}

export async function getActiveGuardians() {
  try {
    const active = Array.from(guardians.values()).filter(
      g => g.status === 'active'
    );
    return active;
  } catch (error) {
    console.error('Get active guardians error:', error);
    return [];
  }
}

export async function getStats() {
  try {
    const active = await getActiveGuardians();
    const totalRevenue = active.reduce(
      (sum, g) => sum + (g.amount_monthly || 0),
      0
    );

    return {
      guardian_count: active.length,
      monthly_revenue: totalRevenue,
      dev_hours_per_month: totalRevenue * 10,
      guardians: active.map(g => ({
        email: g.email,
        tier: g.tier,
        amount: g.amount_monthly,
      })),
    };
  } catch (error) {
    console.error('Get stats error:', error);
    return {
      guardian_count: 0,
      monthly_revenue: 0,
      dev_hours_per_month: 0,
      guardians: [],
    };
  }
}

export function getAllGuardians() {
  return Array.from(guardians.values());
}

export function getAllPayments(customerId?: string) {
  if (customerId) {
    return payments.get(customerId) || [];
  }
  const all: any[] = [];
  payments.forEach(list => all.push(...list));
  return all;
}
