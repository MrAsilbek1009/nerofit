import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Local-only "already celebrated today" flag for the streak modal (device
// state, not server state — hence AsyncStorage through react-query rather
// than a table). Lives outside lib/queries because it owns no server data.

const KEY = "nutrition_streak_celebrated_date";

function localToday(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function useStreakCelebration() {
  const qc = useQueryClient();
  const state = useQuery({
    queryKey: ["streak-celebrated"],
    queryFn: async () => {
      const today = localToday();
      const last = await AsyncStorage.getItem(KEY);
      return { today, celebratedToday: last === today };
    },
    staleTime: 1000 * 60,
  });

  function markCelebrated() {
    const today = state.data?.today;
    if (!today) return;
    void AsyncStorage.setItem(KEY, today);
    qc.setQueryData(["streak-celebrated"], { today, celebratedToday: true });
  }

  return {
    ready: state.isSuccess,
    celebratedToday: state.data?.celebratedToday ?? true,
    markCelebrated,
  };
}
