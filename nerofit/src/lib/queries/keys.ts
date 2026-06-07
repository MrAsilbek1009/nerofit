// Centralized query keys. Use these everywhere so invalidations stay aligned.

export const qk = {
  profile: (userId: string) => ["profile", userId] as const,
  goals: (userId: string) => ["goals", userId] as const,
  latestBodyMetric: (userId: string) =>
    ["body-metrics", "latest", userId] as const,
  latestHealthMetric: (userId: string, type: string) =>
    ["health-metrics", "latest", userId, type] as const,
  recentHealthMetrics: (userId: string, type: string) =>
    ["health-metrics", "recent", userId, type] as const,
  todayWaterTotal: (userId: string) =>
    ["water-logs", "today-total", userId] as const,
  programs: () => ["programs"] as const,
  workoutDetail: (workoutId: string) => ["workout-detail", workoutId] as const,
  activeSession: (userId: string, workoutId: string) =>
    ["active-session", userId, workoutId] as const,
};
