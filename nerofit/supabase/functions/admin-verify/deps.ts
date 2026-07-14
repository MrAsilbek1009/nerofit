// Single pinned import point for the Supabase client (S1 supply-chain hardening:
// exact version, bumped deliberately). Every module imports the client from here.
export { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
