import { create } from "zustand";

type EntitlementState = {
  // Elite via the RevenueCat entitlement (client-side truth when configured).
  rcElite: boolean;
  setRcElite: (value: boolean) => void;
};

export const useEntitlementStore = create<EntitlementState>((set) => ({
  rcElite: false,
  setRcElite: (rcElite) => set({ rcElite }),
}));
