// Hand-maintained until `supabase gen types typescript --project-id <id>` is
// wired into CI. Keep in sync with supabase/migrations/*.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BiologicalSex = "male" | "female" | "non_binary";
export type GoalFocus = "lose_fat" | "build_muscle" | "stay_fit";
export type ActivityLevel =
  | "sedentary"
  | "lightly_active"
  | "moderately_active"
  | "very_active";
export type EquipmentAccess = "no_equipment" | "home_gym" | "full_gym";
export type HealthMetricType =
  | "heart_rate"
  | "blood_pressure_systolic"
  | "blood_pressure_diastolic"
  | "steps";
export type ProgramLevel = "beginner" | "intermediate" | "elite";
export type SessionStatus = "active" | "completed" | "abandoned";
export type LogStatus = "done" | "skipped";
export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";
export type MealSource = "catalog" | "scan" | "manual";
export type DayPart = "morning" | "midday" | "evening";
export type ExerciseCategory =
  | "push"
  | "pull"
  | "legs"
  | "core"
  | "cardio"
  | "warmup"
  | "mobility_stretch";
export type EquipmentTier = "bodyweight" | "dumbbell_band" | "gym_full";
export type ProgramSection = "warmup" | "main" | "cooldown";

// Custom workout generator parameters (stored on custom_sessions.params).
export type GeneratorFocus = "strength" | "muscle" | "endurance";
export type GeneratorTarget =
  | "upper"
  | "lower"
  | "core"
  | "push"
  | "pull"
  | "full";
export type GeneratorDifficulty = "beginner" | "intermediate" | "advanced";
export type GeneratorEquipment = "none" | "dumbbells" | "your" | "all_gym";
export type GeneratorParams = {
  timeMin: number;
  target: GeneratorTarget;
  focus: GeneratorFocus;
  difficulty: GeneratorDifficulty;
  equipment: GeneratorEquipment;
  warmup: boolean;
  stretch: boolean;
};
export type TaskType = "education" | "workout" | "lifestyle" | "challenge";
export type TestLogType = "count" | "seconds" | "minutes";
export type UnitSystem = "metric" | "imperial";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string | null;
          avatar_url: string | null;
          focus: string | null;
          subscription_tier: string;
          sex: BiologicalSex | null;
          date_of_birth: string | null;
          daily_water_goal_ml: number;
          water_serving_ml: number;
          protein_goal_g: number;
          carbs_goal_g: number;
          fats_goal_g: number;
          preferred_unit_system: UnitSystem;
          onboarded_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          avatar_url?: string | null;
          focus?: string | null;
          subscription_tier?: string;
          sex?: BiologicalSex | null;
          date_of_birth?: string | null;
          daily_water_goal_ml?: number;
          water_serving_ml?: number;
          protein_goal_g?: number;
          carbs_goal_g?: number;
          fats_goal_g?: number;
          preferred_unit_system?: UnitSystem;
          onboarded_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      goals: {
        Row: {
          user_id: string;
          focus: GoalFocus;
          activity_level: ActivityLevel;
          equipment: EquipmentAccess;
          injuries: string[];
          notes: string | null;
          target_weight: number | null;
          experience_level: string | null;
          entry_point_week: number;
          training_frequency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          focus: GoalFocus;
          activity_level: ActivityLevel;
          equipment: EquipmentAccess;
          injuries?: string[];
          notes?: string | null;
          target_weight?: number | null;
          experience_level?: string | null;
          entry_point_week?: number;
          training_frequency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["goals"]["Insert"]>;
        Relationships: [];
      };
      body_metrics: {
        Row: {
          id: string;
          user_id: string;
          recorded_at: string;
          weight_kg: number | null;
          height_cm: number | null;
          body_fat_pct: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          recorded_at?: string;
          weight_kg?: number | null;
          height_cm?: number | null;
          body_fat_pct?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["body_metrics"]["Insert"]>;
        Relationships: [];
      };
      health_metrics: {
        Row: {
          id: string;
          user_id: string;
          type: HealthMetricType;
          value: number;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: HealthMetricType;
          value: number;
          recorded_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["health_metrics"]["Insert"]>;
        Relationships: [];
      };
      water_logs: {
        Row: {
          id: string;
          user_id: string;
          amount_ml: number;
          logged_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount_ml: number;
          logged_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["water_logs"]["Insert"]>;
        Relationships: [];
      };
      programs: {
        Row: {
          id: string;
          title: string;
          level: ProgramLevel;
          phase: number;
          mode: string;
          image_url: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          level?: ProgramLevel;
          phase?: number;
          mode?: string;
          image_url?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["programs"]["Insert"]>;
        Relationships: [];
      };
      workouts: {
        Row: {
          id: string;
          program_id: string;
          title: string;
          est_minutes: number | null;
          est_kcal: number | null;
          image_url: string | null;
          order_index: number;
        };
        Insert: {
          id?: string;
          program_id: string;
          title: string;
          est_minutes?: number | null;
          est_kcal?: number | null;
          image_url?: string | null;
          order_index?: number;
        };
        Update: Partial<Database["public"]["Tables"]["workouts"]["Insert"]>;
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          title: string;
          target_muscles: string[];
          default_sets: number;
          default_reps: number;
          image_url: string | null;
          code: string | null;
          name_uz: string | null;
          category: ExerciseCategory | null;
          equipment_tier: EquipmentTier | null;
          progression_tier: number | null;
          progression_group: string | null;
          injury_knee_safe: boolean;
          injury_back_safe: boolean;
          injury_shoulder_safe: boolean;
          cues_uz: string | null;
          default_sets_reps: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          target_muscles?: string[];
          default_sets?: number;
          default_reps?: number;
          image_url?: string | null;
          code?: string | null;
          name_uz?: string | null;
          category?: ExerciseCategory | null;
          equipment_tier?: EquipmentTier | null;
          progression_tier?: number | null;
          progression_group?: string | null;
          injury_knee_safe?: boolean;
          injury_back_safe?: boolean;
          injury_shoulder_safe?: boolean;
          cues_uz?: string | null;
          default_sets_reps?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["exercises"]["Insert"]>;
        Relationships: [];
      };
      workout_exercises: {
        Row: {
          id: string;
          workout_id: string;
          exercise_id: string;
          sets: number;
          reps: string;
          rest_sec: number;
          load_note: string | null;
          order_index: number;
        };
        Insert: {
          id?: string;
          workout_id: string;
          exercise_id: string;
          sets?: number;
          reps?: string;
          rest_sec?: number;
          load_note?: string | null;
          order_index?: number;
        };
        Update: Partial<Database["public"]["Tables"]["workout_exercises"]["Insert"]>;
        Relationships: [];
      };
      exercise_videos: {
        Row: {
          id: string;
          exercise_id: string;
          url: string;
          duration_sec: number | null;
          provider: string;
        };
        Insert: {
          id?: string;
          exercise_id: string;
          url: string;
          duration_sec?: number | null;
          provider?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exercise_videos"]["Insert"]>;
        Relationships: [];
      };
      workout_sessions: {
        Row: {
          id: string;
          user_id: string;
          workout_id: string;
          status: SessionStatus;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          workout_id: string;
          status?: SessionStatus;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["workout_sessions"]["Insert"]>;
        Relationships: [];
      };
      exercise_logs: {
        Row: {
          id: string;
          session_id: string;
          exercise_id: string;
          status: LogStatus;
          sets_done: number | null;
          reps_done: number | null;
          weight_used: number | null;
          logged_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          exercise_id: string;
          status: LogStatus;
          sets_done?: number | null;
          reps_done?: number | null;
          weight_used?: number | null;
          logged_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exercise_logs"]["Insert"]>;
        Relationships: [];
      };
      program_days: {
        Row: {
          id: string;
          program_id: string;
          week_no: number;
          day_no: number;
          weekday: string | null;
          session_title: string;
          intro_video_script: string | null;
          intro_video_url: string | null;
          is_rest_day: boolean;
          is_test_day: boolean;
          is_milestone_day: boolean;
          format: string;
          rounds: number | null;
          total_duration_min: number | null;
          order_index: number;
        };
        Insert: {
          id?: string;
          program_id: string;
          week_no: number;
          day_no: number;
          weekday?: string | null;
          session_title: string;
          intro_video_script?: string | null;
          intro_video_url?: string | null;
          is_rest_day?: boolean;
          is_test_day?: boolean;
          is_milestone_day?: boolean;
          format?: string;
          rounds?: number | null;
          total_duration_min?: number | null;
          order_index?: number;
        };
        Update: Partial<Database["public"]["Tables"]["program_days"]["Insert"]>;
        Relationships: [];
      };
      program_day_exercises: {
        Row: {
          id: string;
          program_day_id: string;
          section: ProgramSection;
          order_index: number;
          exercise_id: string;
          sets: number | null;
          reps: string | null;
          rest_sec: number | null;
          rest_after_sec: number | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          program_day_id: string;
          section?: ProgramSection;
          order_index?: number;
          exercise_id: string;
          sets?: number | null;
          reps?: string | null;
          rest_sec?: number | null;
          rest_after_sec?: number | null;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["program_day_exercises"]["Insert"]>;
        Relationships: [];
      };
      program_day_tasks: {
        Row: {
          id: string;
          program_day_id: string;
          order_index: number;
          type: TaskType;
          title: string;
          duration_min: number | null;
          target: string | null;
          optional: boolean;
          reward_xp: number | null;
          linked_to: string | null;
          video_url: string | null;
        };
        Insert: {
          id?: string;
          program_day_id: string;
          order_index?: number;
          type: TaskType;
          title: string;
          duration_min?: number | null;
          target?: string | null;
          optional?: boolean;
          reward_xp?: number | null;
          linked_to?: string | null;
          video_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["program_day_tasks"]["Insert"]>;
        Relationships: [];
      };
      program_day_tests: {
        Row: {
          id: string;
          program_day_id: string;
          order_index: number;
          test_key: string;
          name: string;
          exercise_id: string | null;
          instructions: string | null;
          log_type: TestLogType;
        };
        Insert: {
          id?: string;
          program_day_id: string;
          order_index?: number;
          test_key: string;
          name: string;
          exercise_id?: string | null;
          instructions?: string | null;
          log_type: TestLogType;
        };
        Update: Partial<Database["public"]["Tables"]["program_day_tests"]["Insert"]>;
        Relationships: [];
      };
      day_sessions: {
        Row: {
          id: string;
          user_id: string;
          program_day_id: string;
          status: SessionStatus;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          program_day_id: string;
          status?: SessionStatus;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["day_sessions"]["Insert"]>;
        Relationships: [];
      };
      day_exercise_logs: {
        Row: {
          id: string;
          day_session_id: string;
          program_day_exercise_id: string;
          status: LogStatus;
          sets_done: number | null;
          reps_done: number | null;
          weight_used: number | null;
          logged_at: string;
        };
        Insert: {
          id?: string;
          day_session_id: string;
          program_day_exercise_id: string;
          status: LogStatus;
          sets_done?: number | null;
          reps_done?: number | null;
          weight_used?: number | null;
          logged_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["day_exercise_logs"]["Insert"]>;
        Relationships: [];
      };
      task_completions: {
        Row: {
          id: string;
          day_session_id: string;
          program_day_task_id: string;
          completed_at: string;
        };
        Insert: {
          id?: string;
          day_session_id: string;
          program_day_task_id: string;
          completed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["task_completions"]["Insert"]>;
        Relationships: [];
      };
      custom_sessions: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          params: GeneratorParams;
          status: SessionStatus;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          params: GeneratorParams;
          status?: SessionStatus;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["custom_sessions"]["Insert"]>;
        Relationships: [];
      };
      custom_session_exercises: {
        Row: {
          id: string;
          custom_session_id: string;
          exercise_id: string;
          section: ProgramSection;
          order_index: number;
          reps: string | null;
          sets: number | null;
          rest_sec: number | null;
          status: LogStatus | null;
          sets_done: number | null;
          reps_done: number | null;
          weight_used: number | null;
          logged_at: string | null;
        };
        Insert: {
          id?: string;
          custom_session_id: string;
          exercise_id: string;
          section: ProgramSection;
          order_index: number;
          reps?: string | null;
          sets?: number | null;
          rest_sec?: number | null;
          status?: LogStatus | null;
          sets_done?: number | null;
          reps_done?: number | null;
          weight_used?: number | null;
          logged_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["custom_session_exercises"]["Insert"]>;
        Relationships: [];
      };
      test_results: {
        Row: {
          id: string;
          user_id: string;
          program_day_test_id: string;
          value: number;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          program_day_test_id: string;
          value: number;
          recorded_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["test_results"]["Insert"]>;
        Relationships: [];
      };
      meals: {
        Row: {
          id: string;
          name: string;
          kcal: number;
          protein_g: number;
          carbs_g: number;
          fats_g: number;
          fiber_g: number | null;
          sugar_g: number | null;
          sodium_mg: number | null;
          image_url: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          kcal?: number;
          protein_g?: number;
          carbs_g?: number;
          fats_g?: number;
          fiber_g?: number | null;
          sugar_g?: number | null;
          sodium_mg?: number | null;
          image_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["meals"]["Insert"]>;
        Relationships: [];
      };
      meal_logs: {
        Row: {
          id: string;
          user_id: string;
          meal_id: string | null;
          slot: MealSlot;
          log_date: string;
          name: string | null;
          kcal: number | null;
          protein_g: number | null;
          carbs_g: number | null;
          fats_g: number | null;
          fiber_g: number | null;
          sugar_g: number | null;
          sodium_mg: number | null;
          source: MealSource;
          logged_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          meal_id?: string | null;
          slot: MealSlot;
          log_date?: string;
          name?: string | null;
          kcal?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fats_g?: number | null;
          fiber_g?: number | null;
          sugar_g?: number | null;
          sodium_mg?: number | null;
          source?: MealSource;
          logged_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["meal_logs"]["Insert"]>;
        Relationships: [];
      };
      supplements: {
        Row: {
          id: string;
          name: string;
          default_dose: string | null;
          time_of_day: DayPart;
          order_index: number;
        };
        Insert: {
          id?: string;
          name: string;
          default_dose?: string | null;
          time_of_day?: DayPart;
          order_index?: number;
        };
        Update: Partial<Database["public"]["Tables"]["supplements"]["Insert"]>;
        Relationships: [];
      };
      supplement_logs: {
        Row: {
          id: string;
          user_id: string;
          supplement_id: string;
          taken: boolean;
          log_date: string;
          logged_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          supplement_id: string;
          taken?: boolean;
          log_date?: string;
          logged_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["supplement_logs"]["Insert"]>;
        Relationships: [];
      };
      chat_threads: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_threads"]["Insert"]>;
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          thread_id: string;
          role: ChatRole;
          content: string;
          embed: ChatEmbed | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          role: ChatRole;
          content: string;
          embed?: ChatEmbed | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_messages"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Goals = Database["public"]["Tables"]["goals"]["Row"];
export type BodyMetric = Database["public"]["Tables"]["body_metrics"]["Row"];
export type HealthMetric = Database["public"]["Tables"]["health_metrics"]["Row"];
export type WaterLog = Database["public"]["Tables"]["water_logs"]["Row"];
export type Program = Database["public"]["Tables"]["programs"]["Row"];
export type Workout = Database["public"]["Tables"]["workouts"]["Row"];
export type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
export type WorkoutExercise =
  Database["public"]["Tables"]["workout_exercises"]["Row"];
export type ExerciseVideo =
  Database["public"]["Tables"]["exercise_videos"]["Row"];
export type WorkoutSession =
  Database["public"]["Tables"]["workout_sessions"]["Row"];
export type ExerciseLog = Database["public"]["Tables"]["exercise_logs"]["Row"];
export type Meal = Database["public"]["Tables"]["meals"]["Row"];
export type MealLog = Database["public"]["Tables"]["meal_logs"]["Row"];
export type Supplement = Database["public"]["Tables"]["supplements"]["Row"];
export type SupplementLog =
  Database["public"]["Tables"]["supplement_logs"]["Row"];
export type ProgramDay = Database["public"]["Tables"]["program_days"]["Row"];
export type ProgramDayExercise =
  Database["public"]["Tables"]["program_day_exercises"]["Row"];
export type ProgramDayTask =
  Database["public"]["Tables"]["program_day_tasks"]["Row"];
export type ProgramDayTest =
  Database["public"]["Tables"]["program_day_tests"]["Row"];
export type DaySession = Database["public"]["Tables"]["day_sessions"]["Row"];
export type DayExerciseLog =
  Database["public"]["Tables"]["day_exercise_logs"]["Row"];
export type TaskCompletion =
  Database["public"]["Tables"]["task_completions"]["Row"];
export type TestResult = Database["public"]["Tables"]["test_results"]["Row"];
export type CustomSession =
  Database["public"]["Tables"]["custom_sessions"]["Row"];
export type CustomSessionExercise =
  Database["public"]["Tables"]["custom_session_exercises"]["Row"];

export type ChatRole = "user" | "assistant";

export type ChatEmbed = {
  type: "workout";
  id: string;
  title: string;
  est_minutes: number | null;
  category: string | null;
  image_url: string | null;
};

export type ChatThread = {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  thread_id: string;
  role: ChatRole;
  content: string;
  embed: ChatEmbed | null;
  created_at: string;
};

// ── Gym membership (abonement) ──────────────────────────────────────────
export type MembershipStatus =
  | "pending"
  | "active"
  | "expired"
  | "frozen"
  | "cancelled";
export type PaymentStatus = "created" | "paid" | "cancelled";

export type MembershipPlan = {
  id: string;
  name_uz: string;
  duration_days: number;
  price_app_uzs: number;
  price_gym_uzs: number;
  is_active: boolean;
  sort_order: number;
};

export type Membership = {
  id: string;
  user_id: string;
  plan_id: string;
  status: MembershipStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

export type Payment = {
  id: string;
  user_id: string;
  membership_id: string | null;
  amount_uzs: number;
  provider: string;
  provider_txn: string | null;
  status: PaymentStatus;
  paid_at: string | null;
  created_at: string;
  // Provider bookkeeping (migration 0016) — only set by the payments-webhook.
  // Payme transaction state: 1 created, 2 performed, -1/-2 cancelled.
  provider_state: number | null;
  create_time: number | null;
  perform_time: number | null;
  cancel_time: number | null;
  cancel_reason: number | null;
};
