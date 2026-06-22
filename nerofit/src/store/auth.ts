import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase } from "@/lib/supabase";

type AuthState = {
  session: Session | null;
  ready: boolean;
  setSession: (session: Session | null) => void;
  setReady: (ready: boolean) => void;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  ready: false,
  setSession: (session) => set({ session }),
  setReady: (ready) => set({ ready }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null });
  },
}));

// Wire Supabase → store. Call once from the root layout.
export function bootstrapAuth() {
  void (async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      useAuthStore.getState().setSession(data.session);
    } catch {
      // Stale/invalid refresh token ("Refresh Token Not Found") — purge the
      // local credentials so we land on login cleanly instead of throwing on
      // every background auto-refresh.
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      useAuthStore.getState().setSession(null);
    } finally {
      useAuthStore.getState().setReady(true);
    }
  })();

  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setSession(session);
  });

  return () => sub.subscription.unsubscribe();
}
