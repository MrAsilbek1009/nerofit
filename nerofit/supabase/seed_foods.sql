-- seed_foods.sql — verified regional foods for the `foods` table (N1 moat).
-- Run AFTER migration 0019-mirolim_foods.sql. Idempotent-ish: safe to re-run only
-- if the table is empty (no natural key), so run once on a fresh foods table.
--
-- Names are Uzbek-latin (target market types Uzbek). Per-serving macros; serving
-- label describes the portion. source='seed', is_verified=true, region='uz'.

insert into public.foods
  (name, region, kcal, protein_g, carbs_g, fats_g, serving_label, serving_grams, is_verified, source)
values
  ('Palov (Osh)', 'uz', 600, 15, 65, 30, '1 plate (300 g)', 300, true, 'seed'),
  ('Somsa (go''shtli)', 'uz', 340, 14, 30, 18, '1 pastry (150 g)', 150, true, 'seed'),
  ('Manti', 'uz', 270, 16, 28, 10, '2 dumplings (200 g)', 200, true, 'seed'),
  ('Qovurma lagman', 'uz', 490, 22, 55, 20, '1 plate (350 g)', 350, true, 'seed'),
  ('Suyuq lagman', 'uz', 380, 18, 45, 14, '1 bowl (400 g)', 400, true, 'seed'),
  ('Shashlik (kabob)', 'uz', 340, 32, 3, 22, '2 skewers (180 g)', 180, true, 'seed'),
  ('Norin', 'uz', 385, 20, 40, 16, '1 plate (250 g)', 250, true, 'seed'),
  ('Dimlama', 'uz', 355, 18, 30, 18, '1 plate (350 g)', 350, true, 'seed'),
  ('Mastava', 'uz', 300, 12, 40, 10, '1 bowl (400 g)', 400, true, 'seed'),
  ('Sho''rva', 'uz', 300, 16, 25, 15, '1 bowl (400 g)', 400, true, 'seed'),
  ('Chuchvara', 'uz', 310, 15, 35, 12, '1 bowl (300 g)', 300, true, 'seed'),
  ('Qozon kabob', 'uz', 510, 24, 35, 30, '1 plate (300 g)', 300, true, 'seed'),
  ('Tandir go''sht', 'uz', 380, 30, 2, 28, '1 serving (200 g)', 200, true, 'seed'),
  ('Beshbarmoq', 'uz', 495, 28, 45, 22, '1 plate (350 g)', 350, true, 'seed'),
  ('Non (tandir non)', 'uz', 250, 8, 45, 4, '1/4 flatbread (80 g)', 80, true, 'seed'),
  ('Patir', 'uz', 320, 8, 45, 12, '1/4 flatbread (90 g)', 90, true, 'seed'),
  ('Obi non', 'uz', 240, 7, 46, 3, '1/4 flatbread (80 g)', 80, true, 'seed'),
  ('Katlama', 'uz', 335, 7, 40, 16, '1 piece (100 g)', 100, true, 'seed'),
  ('Achichuk', 'uz', 40, 2, 8, 0, '1 serving (150 g)', 150, true, 'seed'),
  ('Suzma', 'uz', 70, 5, 4, 4, '2 tbsp (60 g)', 60, true, 'seed'),
  ('Qatiq', 'uz', 135, 8, 10, 7, '1 cup (200 g)', 200, true, 'seed'),
  ('Ayron', 'uz', 110, 7, 9, 5, '1 glass (250 g)', 250, true, 'seed'),
  ('Chak-chak', 'uz', 250, 4, 40, 8, '1 piece (60 g)', 60, true, 'seed'),
  ('Holva', 'uz', 255, 5, 25, 15, '1 piece (50 g)', 50, true, 'seed'),
  ('Navvot', 'uz', 120, 0, 30, 0, '3 pieces (30 g)', 30, true, 'seed'),
  ('Parvarda', 'uz', 160, 0, 38, 1, '5 pieces (40 g)', 40, true, 'seed'),
  ('Oq guruch (pishgan)', 'uz', 200, 4, 45, 0, '1 cup (160 g)', 160, true, 'seed'),
  ('Marjumak (grechka)', 'uz', 180, 6, 34, 2, '1 cup (170 g)', 170, true, 'seed'),
  ('Yogurt (oddiy)', 'uz', 145, 8, 12, 7, '1 cup (200 g)', 200, true, 'seed'),
  ('Moshkichiri', 'uz', 365, 14, 50, 12, '1 plate (300 g)', 300, true, 'seed'),
  ('Mosh xo''rda', 'uz', 280, 12, 40, 8, '1 bowl (350 g)', 350, true, 'seed'),
  ('Halim', 'uz', 350, 16, 45, 12, '1 bowl (300 g)', 300, true, 'seed'),
  ('Ko''k somsa', 'uz', 280, 8, 35, 12, '1 pastry (120 g)', 120, true, 'seed'),
  ('Tuxum barak', 'uz', 305, 10, 35, 14, '4 pieces (180 g)', 180, true, 'seed'),
  ('Hasip', 'uz', 320, 14, 20, 20, '1 serving (150 g)', 150, true, 'seed'),
  ('Qazi', 'uz', 315, 15, 1, 28, '3 slices (90 g)', 90, true, 'seed'),
  ('Chalop', 'uz', 120, 7, 12, 5, '1 bowl (300 g)', 300, true, 'seed'),
  ('Do''lma', 'uz', 270, 10, 25, 14, '5 pieces (200 g)', 200, true, 'seed'),
  ('Jarkob', 'uz', 445, 22, 35, 24, '1 plate (320 g)', 320, true, 'seed'),
  ('Bog''irsoq', 'uz', 310, 6, 40, 14, '5 pieces (80 g)', 80, true, 'seed'),
  ('Sumalak', 'uz', 140, 3, 30, 1, '3 tbsp (100 g)', 100, true, 'seed');
