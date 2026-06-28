import { create } from "zustand";
import type { GeneratorParams } from "@/types/db";

// Holds the in-memory generator parameters between the Customize sheet and the
// preview screen, plus a seed the "Refresh" button bumps to re-roll the picks.
// Nothing is persisted to the DB until the user taps "Start Workout".

const DEFAULT_PARAMS: GeneratorParams = {
  timeMin: 20,
  target: "upper",
  focus: "strength",
  difficulty: "beginner",
  equipment: "your",
  warmup: true,
  stretch: true,
};

const newSeed = () => Math.floor(Math.random() * 1e9);

type GeneratorDraftState = {
  params: GeneratorParams;
  seed: number;
  setParams: (params: GeneratorParams) => void;
  reroll: () => void;
};

export const useGeneratorDraft = create<GeneratorDraftState>((set) => ({
  params: DEFAULT_PARAMS,
  seed: newSeed(),
  setParams: (params) => set({ params, seed: newSeed() }),
  reroll: () => set({ seed: newSeed() }),
}));
