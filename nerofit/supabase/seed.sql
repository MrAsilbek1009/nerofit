-- seed.sql — catalog content for development.
-- Safe to re-run: uses fixed UUIDs with upserts.

-- ---------- Programs ----------
insert into public.programs (id, title, level, image_url, description) values
  ('11111111-1111-1111-1111-111111111111', 'Full Body Power', 'elite',
   'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1000&q=80&auto=format&fit=crop',
   'Compound strength across the whole body. Built with Adrian.'),
  ('22222222-2222-2222-2222-222222222222', 'Full Body Workout', 'intermediate',
   'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1000&q=80&auto=format&fit=crop',
   'A balanced full-body session for general fitness.')
on conflict (id) do update set
  title = excluded.title, level = excluded.level,
  image_url = excluded.image_url, description = excluded.description;

-- ---------- Workouts ----------
insert into public.workouts (id, program_id, title, est_minutes, est_kcal, image_url, order_index) values
  ('aaaaaaa1-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111', 'Full Body Power', 45, 320,
   'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1000&q=80&auto=format&fit=crop', 1),
  ('aaaaaaa2-0000-0000-0000-000000000002',
   '22222222-2222-2222-2222-222222222222', 'Full Body Workout', 40, 280,
   'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1000&q=80&auto=format&fit=crop', 1)
on conflict (id) do update set
  title = excluded.title, est_minutes = excluded.est_minutes,
  est_kcal = excluded.est_kcal, image_url = excluded.image_url;

-- ---------- Exercises ----------
insert into public.exercises (id, title, target_muscles, default_sets, default_reps, image_url) values
  ('e0000001-0000-0000-0000-000000000001', 'Barbell Back Squat', '{Quads,Glutes,Core}', 5, 5,
   'https://images.unsplash.com/photo-1534368786749-d4a1c0c0c0a8?w=400&q=80&auto=format&fit=crop'),
  ('e0000002-0000-0000-0000-000000000002', 'Dumbbell Bench Press', '{Chest,Triceps,Shoulders}', 4, 10,
   'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=400&q=80&auto=format&fit=crop'),
  ('e0000003-0000-0000-0000-000000000003', 'Weighted Pull-Ups', '{Back,Biceps}', 3, 8,
   'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400&q=80&auto=format&fit=crop'),
  ('e0000004-0000-0000-0000-000000000004', 'Overhead Press', '{Shoulders,Triceps}', 3, 8,
   'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80&auto=format&fit=crop'),
  ('e0000005-0000-0000-0000-000000000005', 'Plank to Push-Up', '{Core,Chest}', 3, 12,
   'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=400&q=80&auto=format&fit=crop')
on conflict (id) do update set
  title = excluded.title, target_muscles = excluded.target_muscles, image_url = excluded.image_url;

-- ---------- Workout ↔ Exercises (Full Body Power) ----------
insert into public.workout_exercises (id, workout_id, exercise_id, sets, reps, rest_sec, load_note, order_index) values
  ('c0000001-0000-0000-0000-000000000001', 'aaaaaaa1-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000001', 5, '5',       120, '120 KG', 1),
  ('c0000002-0000-0000-0000-000000000002', 'aaaaaaa1-0000-0000-0000-000000000001', 'e0000002-0000-0000-0000-000000000002', 4, '10',      45,  '30 KG',  2),
  ('c0000003-0000-0000-0000-000000000003', 'aaaaaaa1-0000-0000-0000-000000000001', 'e0000003-0000-0000-0000-000000000003', 3, 'failure', 90,  '+10 KG', 3),
  ('c0000004-0000-0000-0000-000000000004', 'aaaaaaa1-0000-0000-0000-000000000001', 'e0000004-0000-0000-0000-000000000004', 3, '8',       60,  null,     4),
  ('c0000005-0000-0000-0000-000000000005', 'aaaaaaa1-0000-0000-0000-000000000001', 'e0000005-0000-0000-0000-000000000005', 3, '45 sec',  45,  null,     5)
on conflict (id) do update set
  sets = excluded.sets, reps = excluded.reps, rest_sec = excluded.rest_sec,
  load_note = excluded.load_note, order_index = excluded.order_index;

-- ---------- Videos (sample clip — replace with owned content) ----------
insert into public.exercise_videos (id, exercise_id, url, duration_sec, provider) values
  ('d0000002-0000-0000-0000-000000000002', 'e0000002-0000-0000-0000-000000000002',
   'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', 15, 'sample')
on conflict (id) do update set url = excluded.url;
