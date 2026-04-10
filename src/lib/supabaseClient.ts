import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabase-types';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://jumkjpgwehtjzplhduad.supabase.co';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1bWtqcGd3ZWh0anpwbGhkdWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDQ0NzEsImV4cCI6MjA5MDg4MDQ3MX0.PTgirFfqGayWYwDDfLcjO8KA6JhKQHUuP-04M_AmLD8';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
