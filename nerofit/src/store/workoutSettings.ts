import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Player preferences shown in the in-workout "Workout Settings" sheet.
// Persisted locally so the choice sticks across sessions.
//
// Auto-pilot is fully wired (timed exercises auto-advance when the work timer
// ends). The audio flags (coaches / exerciseIntro / timerSounds) are stored
// preferences that gate optional cues: exerciseIntro toggles the "Get ready"
// screen; coaches / timerSounds are reserved for voice/SFX once audio assets
// land (no-op until then).
export type WorkoutSettingKey =
  | "coaches"
  | "exerciseIntro"
  | "timerSounds"
  | "autoPilot";

type WorkoutSettingsState = {
  coaches: boolean;
  exerciseIntro: boolean;
  timerSounds: boolean;
  autoPilot: boolean;
  setSetting: (key: WorkoutSettingKey, value: boolean) => void;
};

export const useWorkoutSettings = create<WorkoutSettingsState>()(
  persist(
    (set) => ({
      coaches: false,
      exerciseIntro: true,
      timerSounds: true,
      autoPilot: true,
      setSetting: (key, value) => set({ [key]: value } as Partial<WorkoutSettingsState>),
    }),
    {
      name: "workout-settings",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        coaches: s.coaches,
        exerciseIntro: s.exerciseIntro,
        timerSounds: s.timerSounds,
        autoPilot: s.autoPilot,
      }),
    },
  ),
);
