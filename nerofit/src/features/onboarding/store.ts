import { create } from "zustand";
import type {
  BasicsValues,
  EquipmentValues,
  FocusValues,
  OnboardingDraft,
} from "./schema";

type OnboardingState = {
  draft: OnboardingDraft;
  setBasics: (v: BasicsValues) => void;
  setFocus: (v: FocusValues) => void;
  setEquipment: (v: EquipmentValues) => void;
  reset: () => void;
};

// In-memory only — onboarding finishes in a single session. If the user kills
// the app mid-flow we send them back to step 1.
export const useOnboardingStore = create<OnboardingState>((set) => ({
  draft: {},
  setBasics: (v) => set((s) => ({ draft: { ...s.draft, ...v } })),
  setFocus: (v) => set((s) => ({ draft: { ...s.draft, ...v } })),
  setEquipment: (v) => set((s) => ({ draft: { ...s.draft, ...v } })),
  reset: () => set({ draft: {} }),
}));
