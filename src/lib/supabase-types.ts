/**
 * supabase-types.ts — Tipos TypeScript generados para el esquema de Supabase.
 *
 * En un proyecto con Supabase CLI, estos tipos se generan automáticamente con:
 *   npx supabase gen types typescript --project-id <project-id> > src/lib/supabase-types.ts
 *
 * Aquí se mantienen manualmente para no requerir la CLI en CI.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      guardians: {
        Row: {
          stripe_customer_id: string;
          email: string;
          tier: 'shield' | 'architect' | null;
          amount_monthly: number | null;
          status: 'active' | 'cancelled' | 'failed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          stripe_customer_id: string;
          email?: string;
          tier?: 'shield' | 'architect' | null;
          amount_monthly?: number | null;
          status?: 'active' | 'cancelled' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          stripe_customer_id?: string;
          email?: string;
          tier?: 'shield' | 'architect' | null;
          amount_monthly?: number | null;
          status?: 'active' | 'cancelled' | 'failed';
          updated_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          stripe_customer_id: string;
          amount: number | null;
          status: 'pending' | 'success' | 'failed';
          stripe_payment_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          stripe_customer_id: string;
          amount?: number | null;
          status: 'pending' | 'success' | 'failed';
          stripe_payment_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          stripe_customer_id?: string;
          amount?: number | null;
          status?: 'pending' | 'success' | 'failed';
          stripe_payment_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_stripe_customer_id_fkey';
            columns: ['stripe_customer_id'];
            isOneToOne: false;
            referencedRelation: 'guardians';
            referencedColumns: ['stripe_customer_id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
