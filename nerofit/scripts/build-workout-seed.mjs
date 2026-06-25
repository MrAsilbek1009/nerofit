// Generates supabase/seed_workout.sql from content/workout/*.json.
// Run: node scripts/build-workout-seed.mjs
// Idempotent: every row uses a stable UUID v5 (or natural key) so re-running
// upserts in place. Apply the output via Supabase SQL editor or `db push`.

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const CONTENT = join(ROOT, "content", "workout");
const OUT = join(ROOT, "supabase", "seed_workout.sql");

// Stable UUID v5 (DNS namespace, dependency-free).
const NS = Buffer.from("6ba7b8109dad11d180b400c04fd430c8", "hex");
function uid(name) {
  const h = createHash("sha1").update(NS).update(Buffer.from(name, "utf8")).digest();
  const b = Buffer.from(h.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50; // version 5
  b[8] = (b[8] & 0x3f) | 0x80; // variant
  const x = b.toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`;
}

// SQL literal helpers.
const q = (v) =>
  v === null || v === undefined || v === "" ? "null" : `'${String(v).replace(/'/g, "''")}'`;
const num = (v) =>
  v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? "null" : String(Number(v));
const bool = (v) => (v ? "true" : "false");
const arr = (a) =>
  Array.isArray(a) && a.length
    ? `'{${a.map((s) => `"${String(s).replace(/"/g, '\\"')}"`).join(",")}}'`
    : "'{}'";

const PROGRAM_ID = uid("program:beginner-phase1");
const MODE_KEY = "weight_adapted_3day";

const lib = JSON.parse(readFileSync(join(CONTENT, "exercise_library.json"), "utf8"));
const weekFiles = [
  "beginner_phase1_weight_adapted_weeks1-4.json",
  "beginner_phase1_weight_adapted_weeks5-8.json",
];

// ---- Pass 1: walk weeks, normalise days, collect referenced exercise codes ----
const libByCode = new Map(lib.exercises.map((e) => [e.id, e]));
const refNames = new Map(); // code -> name_uz seen in program (for placeholders)
const days = [];

function pushRef(code, nameUz) {
  if (code && !refNames.has(code)) refNames.set(code, nameUz ?? null);
}

function items(list, section) {
  const out = [];
  let order = 0;
  for (const it of list ?? []) {
    if (!it || !it.exercise_id) continue; // skip superset/group markers
    order += 1;
    pushRef(it.exercise_id, it.name_uz);
    out.push({
      section,
      order_index: it.order ?? order,
      code: it.exercise_id,
      sets: it.sets ?? null,
      reps: it.reps ?? it.reps_or_time ?? null,
      rest_sec: it.rest_sec ?? null,
      rest_after_sec: it.rest_after_sec ?? null,
      notes: [it.label, it.notes_uz].filter(Boolean).join(" — ") || null,
    });
  }
  return out;
}

function roundsOf(day) {
  if (day.rounds) return day.rounds;
  for (const it of day.main_workout ?? []) if (it && it.rounds) return it.rounds;
  return null;
}

for (const file of weekFiles) {
  const data = JSON.parse(readFileSync(join(CONTENT, file), "utf8"));
  for (const [wkKey, wkVal] of Object.entries(data)) {
    if (!wkKey.startsWith("week_")) continue;
    const weekNo = Number(wkKey.slice(5));
    const modeObj = wkVal[MODE_KEY] ?? {};
    for (const [dayKey, day] of Object.entries(modeObj)) {
      if (!dayKey.startsWith("day_")) continue;
      const dayNo = Number(dayKey.slice(4));
      const dayId = uid(`day:${PROGRAM_ID}:${weekNo}:${dayNo}`);
      const exercises = [
        ...items(day.warmup, "warmup"),
        ...items([...(day.main_workout ?? []), ...(day.extra_exercises ?? [])], "main"),
        ...items(day.cooldown, "cooldown"),
      ];
      const tasks = (day.tasks ?? []).map((t, i) => ({
        id: uid(`task:${t.task_id ?? `${dayId}:${i}`}`),
        type: t.type,
        title: t.title_uz,
        duration_min: t.duration_min ?? null,
        target: t.target ?? null,
        optional: !!t.optional,
        reward_xp: t.reward_xp ?? null,
        linked_to: t.linked_to ?? null,
      }));
      const tests = (day.fitness_test ?? []).map((t) => {
        if (t.exercise_id) pushRef(t.exercise_id, t.name_uz);
        return {
          id: uid(`test:${dayId}:${t.test_id}`),
          test_key: t.test_id,
          name: t.name_uz,
          code: t.exercise_id ?? null,
          instructions: t.instructions_uz ?? null,
          log_type: t.log_type,
        };
      });
      days.push({
        id: dayId,
        week_no: weekNo,
        day_no: dayNo,
        weekday: day.weekday ?? null,
        session_title: day.session_title_uz ?? `Week ${weekNo} Day ${dayNo}`,
        intro: day.intro_video_script_uz ?? null,
        is_rest: !!day.is_rest_day,
        is_test: !!day.is_test_day || Array.isArray(day.fitness_test),
        is_milestone: !!day.is_milestone_day,
        format: day.main_workout_format ?? "standard",
        rounds: roundsOf(day),
        total: day.total_duration_estimate_min ?? null,
        exercises,
        tasks,
        tests,
      });
    }
  }
}

// ---- Emit ----
const L = [];
L.push("-- seed_workout.sql — GENERATED by scripts/build-workout-seed.mjs. Do NOT edit by hand.");
L.push("-- Idempotent: re-running upserts in place. Apply via Supabase SQL editor or db push.");
L.push("");

// Exercises: full library + placeholders for any referenced-but-missing code.
L.push("-- ===== Exercises =====");
const allCodes = new Set([...libByCode.keys(), ...refNames.keys()]);
for (const code of allCodes) {
  const e = libByCode.get(code);
  const id = uid(`ex:${code}`);
  const title = e?.name_en ?? code;
  const nameUz = e?.name_uz ?? refNames.get(code);
  const f = e?.injury_flags ?? {};
  L.push(
    `insert into public.exercises (id, code, title, name_uz, category, equipment_tier, progression_tier, progression_group, target_muscles, injury_knee_safe, injury_back_safe, injury_shoulder_safe, cues_uz, default_sets_reps) values (` +
      `${q(id)}, ${q(code)}, ${q(title)}, ${q(nameUz)}, ${q(e?.category)}, ${q(e?.equipment_tier)}, ${num(e?.progression_tier)}, ${q(e?.progression_group)}, ${arr(e?.target_muscles)}, ${bool(f.knee_safe ?? true)}, ${bool(f.back_safe ?? true)}, ${bool(f.shoulder_safe ?? true)}, ${q(e?.cues_uz)}, ${q(e?.default_sets_reps)})` +
      ` on conflict (code) do update set title=excluded.title, name_uz=excluded.name_uz, category=excluded.category, equipment_tier=excluded.equipment_tier, progression_tier=excluded.progression_tier, progression_group=excluded.progression_group, target_muscles=excluded.target_muscles, injury_knee_safe=excluded.injury_knee_safe, injury_back_safe=excluded.injury_back_safe, injury_shoulder_safe=excluded.injury_shoulder_safe, cues_uz=excluded.cues_uz, default_sets_reps=excluded.default_sets_reps;`,
  );
}

// Program
L.push("");
L.push("-- ===== Program =====");
L.push(
  `insert into public.programs (id, title, level, phase, mode, description) values (` +
    `${q(PROGRAM_ID)}, ${q("Boshlang'ich — 1-faza")}, 'beginner', 1, 'standard', ${q("8 haftalik boshlang'ich dastur: postura, asoslar, progressiya.")})` +
    ` on conflict (id) do update set title=excluded.title, level=excluded.level, phase=excluded.phase, mode=excluded.mode, description=excluded.description;`,
);

// Days + children
L.push("");
L.push("-- ===== Program days =====");
for (const d of days) {
  L.push(
    `insert into public.program_days (id, program_id, week_no, day_no, weekday, session_title, intro_video_script, is_rest_day, is_test_day, is_milestone_day, format, rounds, total_duration_min, order_index) values (` +
      `${q(d.id)}, ${q(PROGRAM_ID)}, ${d.week_no}, ${d.day_no}, ${q(d.weekday)}, ${q(d.session_title)}, ${q(d.intro)}, ${bool(d.is_rest)}, ${bool(d.is_test)}, ${bool(d.is_milestone)}, ${q(d.format)}, ${num(d.rounds)}, ${num(d.total)}, ${d.day_no})` +
      ` on conflict (id) do update set weekday=excluded.weekday, session_title=excluded.session_title, intro_video_script=excluded.intro_video_script, is_rest_day=excluded.is_rest_day, is_test_day=excluded.is_test_day, is_milestone_day=excluded.is_milestone_day, format=excluded.format, rounds=excluded.rounds, total_duration_min=excluded.total_duration_min;`,
  );
  d.exercises.forEach((x, i) => {
    const id = uid(`pde:${d.id}:${x.section}:${i}:${x.code}`);
    L.push(
      `insert into public.program_day_exercises (id, program_day_id, section, order_index, exercise_id, sets, reps, rest_sec, rest_after_sec, notes) values (` +
        `${q(id)}, ${q(d.id)}, '${x.section}', ${x.order_index}, ${q(uid(`ex:${x.code}`))}, ${num(x.sets)}, ${q(x.reps)}, ${num(x.rest_sec)}, ${num(x.rest_after_sec)}, ${q(x.notes)})` +
        ` on conflict (id) do update set section=excluded.section, order_index=excluded.order_index, exercise_id=excluded.exercise_id, sets=excluded.sets, reps=excluded.reps, rest_sec=excluded.rest_sec, rest_after_sec=excluded.rest_after_sec, notes=excluded.notes;`,
    );
  });
  d.tasks.forEach((t, i) => {
    L.push(
      `insert into public.program_day_tasks (id, program_day_id, order_index, type, title, duration_min, target, optional, reward_xp, linked_to) values (` +
        `${q(t.id)}, ${q(d.id)}, ${i}, '${t.type}', ${q(t.title)}, ${num(t.duration_min)}, ${q(t.target)}, ${bool(t.optional)}, ${num(t.reward_xp)}, ${q(t.linked_to)})` +
        ` on conflict (id) do update set order_index=excluded.order_index, type=excluded.type, title=excluded.title, duration_min=excluded.duration_min, target=excluded.target, optional=excluded.optional, reward_xp=excluded.reward_xp, linked_to=excluded.linked_to;`,
    );
  });
  d.tests.forEach((t, i) => {
    L.push(
      `insert into public.program_day_tests (id, program_day_id, order_index, test_key, name, exercise_id, instructions, log_type) values (` +
        `${q(t.id)}, ${q(d.id)}, ${i}, ${q(t.test_key)}, ${q(t.name)}, ${t.code ? q(uid(`ex:${t.code}`)) : "null"}, ${q(t.instructions)}, '${t.log_type}')` +
        ` on conflict (id) do update set order_index=excluded.order_index, test_key=excluded.test_key, name=excluded.name, exercise_id=excluded.exercise_id, instructions=excluded.instructions, log_type=excluded.log_type;`,
    );
  });
}

writeFileSync(OUT, L.join("\n") + "\n", "utf8");
const exCount = allCodes.size;
const pdeCount = days.reduce((s, d) => s + d.exercises.length, 0);
const taskCount = days.reduce((s, d) => s + d.tasks.length, 0);
const testCount = days.reduce((s, d) => s + d.tests.length, 0);
console.log(
  `seed_workout.sql written: ${exCount} exercises, ${days.length} days, ${pdeCount} day-exercises, ${taskCount} tasks, ${testCount} tests.`,
);
