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
          image_url: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          level?: ProgramLevel;
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
        };
        Insert: {
          id?: string;
          title: string;
          target_muscles?: string[];
          default_sets?: number;
          default_reps?: number;
          image_url?: string | null;
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
