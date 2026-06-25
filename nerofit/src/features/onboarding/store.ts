import { create } from "zustand";
import type {
  BodyValues,
  EquipmentValues,
  ExperienceValues,
  FocusValues,
  OnboardingDraft,
  SexValues,
} from "./schema";

type OnboardingState = {
  draft: OnboardingDraft;
  setSex: (v: SexValues) => void;
  setBody: (v: BodyValues) => void;
  setFocus: (v: FocusValues) => void;
  setExperience: (v: ExperienceValues) => void;
  setEquipment: (v: EquipmentValues) => void;
  reset: () => void;
};

// In-memory only — onboarding finishes in a single session. If the user kills
// the app mid-flow we send them back to step 1.
export const useOnboardingStore = create<OnboardingState>((set) => ({
  draft: {},
  setSex: (v) => set((s) => ({ draft: { ...s.draft, ...v } })),
  setBody: (v) => set((s) => ({ draft: { ...s.draft, ...v } })),
  setFocus: (v) => set((s) => ({ draft: { ...s.draft, ...v } })),
  setExperience: (v) => set((s) => ({ draft: { ...s.draft, ...v } })),
  setEquipment: (v) => set((s) => ({ draft: { ...s.draft, ...v } })),
  reset: () => set({ draft: {} }),
}));
