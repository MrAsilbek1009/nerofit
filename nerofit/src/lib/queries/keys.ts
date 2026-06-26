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
  curriculumPrograms: () => ["curriculum-programs"] as const,
  programDays: (programId: string) => ["program-days", programId] as const,
  programDayDetail: (dayId: string) => ["program-day-detail", dayId] as const,
  daySession: (userId: string, programDayId: string) =>
    ["day-session", userId, programDayId] as const,
  completedDays: (userId: string) => ["completed-days", userId] as const,
  sessionTaskCompletions: (sessionId: string) =>
    ["task-completions", sessionId] as const,
  xpTotal: (userId: string) => ["xp-total", userId] as const,
  dayTestResults: (dayId: string) => ["test-results", dayId] as const,
  workoutDetail: (workoutId: string) => ["workout-detail", workoutId] as const,
  activeSession: (userId: string, workoutId: string) =>
    ["active-session", userId, workoutId] as const,
  weightSeries: (userId: string, period: string) =>
    ["weight-series", userId, period] as const,
  weekSessions: (userId: string) => ["week-sessions", userId] as const,
  workoutStats: (userId: string) => ["workout-stats", userId] as const,
  meals: () => ["meals"] as const,
  mealLogsToday: (userId: string) => ["meal-logs-today", userId] as const,
  supplements: () => ["supplements"] as const,
  supplementLogsToday: (userId: string) =>
    ["supplement-logs-today", userId] as const,
  chatThread: (userId: string) => ["chat-thread", userId] as const,
  chatMessages: (threadId: string) => ["chat-messages", threadId] as const,
};
