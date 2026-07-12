import { supabase } from "@/lib/supabase";
import { sumMealItems } from "@/lib/nutrition/fastLog";

// Fast-log user data: starred favorites + saved meal combos (0020 migration).
// Neither table is in the generated db.ts yet, so — like foods — we query by
// string and cast the row shape.

export type FavoriteFood = {
  id: string;
  name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  total_g: number | null;
  created_at: string;
};

export type UserMealItem = {
  name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
};

export type UserMeal = {
  id: string;
  name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  items: UserMealItem[];
  created_at: string;
};

export type FavoriteInput = {
  name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  total_g?: number | null;
};

const FAVORITE_FIELDS =
  "id, name, kcal, protein_g, carbs_g, fats_g, total_g, created_at";
const USER_MEAL_FIELDS =
  "id, name, kcal, protein_g, carbs_g, fats_g, items, created_at";

export async function listFavorites(userId: string): Promise<FavoriteFood[]> {
  const { data, error } = await supabase
    .from("favorite_foods")
    .select(FAVORITE_FIELDS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as FavoriteFood[];
}

// Upsert on (user_id, name): re-favoriting the same food refreshes its macros
// instead of failing the unique constraint.
export async function addFavorite(
  userId: string,
  input: FavoriteInput,
): Promise<void> {
  const { error } = await supabase.from("favorite_foods").upsert(
    {
      user_id: userId,
      name: input.name,
      kcal: input.kcal,
      protein_g: input.protein_g,
      carbs_g: input.carbs_g,
      fats_g: input.fats_g,
      total_g: input.total_g ?? null,
    } as never,
    { onConflict: "user_id,name" },
  );
  if (error) throw error;
}

export async function removeFavorite(id: string): Promise<void> {
  const { error } = await supabase.from("favorite_foods").delete().eq("id", id);
  if (error) throw error;
}

export async function listUserMeals(userId: string): Promise<UserMeal[]> {
  const { data, error } = await supabase
    .from("user_meals")
    .select(USER_MEAL_FIELDS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as UserMeal[];
}

// Save a meal combo; totals are denormalized from the items at save time so
// lists never sum jsonb.
export async function createUserMeal(
  userId: string,
  name: string,
  items: UserMealItem[],
): Promise<void> {
  const total = sumMealItems(items);
  const { error } = await supabase.from("user_meals").insert({
    user_id: userId,
    name,
    kcal: total.kcal,
    protein_g: total.protein_g,
    carbs_g: total.carbs_g,
    fats_g: total.fats_g,
    items,
  } as never);
  if (error) throw error;
}

export async function deleteUserMeal(id: string): Promise<void> {
  const { error } = await supabase.from("user_meals").delete().eq("id", id);
  if (error) throw error;
}
