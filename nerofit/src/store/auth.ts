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
  void supabase.auth.getSession().then(({ data }) => {
    useAuthStore.getState().setSession(data.session);
    useAuthStore.getState().setReady(true);
  });

  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setSession(session);
  });

  return () => sub.subscription.unsubscribe();
}
