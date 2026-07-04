-- Phase 14D (food-scan) — private Storage bucket for scan photos + RLS.
--
-- Scan photos are stored under `food-photos/{user_id}/{file}.jpg`; RLS scopes
-- each user to their own folder. `food_scans.photo_path` (migration 0012) points
-- at these objects. Client upload is best-effort — until this runs, scans just
-- have a null photo_path and the history shows a placeholder.
--
-- Naming: 0016 with the agreed `-mirolim` suffix to avoid colliding with the
-- collaborator's numbering.

insert into storage.buckets (id, name, public)
values ('food-photos', 'food-photos', false)
on conflict (id) do nothing;

-- Owner-only access: the first path segment must equal the user's id.
drop policy if exists "food_photos_insert_own" on storage.objects;
create policy "food_photos_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'food-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "food_photos_select_own" on storage.objects;
create policy "food_photos_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'food-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "food_photos_delete_own" on storage.objects;
create policy "food_photos_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'food-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
