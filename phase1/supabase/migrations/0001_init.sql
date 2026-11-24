-- Offline-first schema. Client generates UUIDs; every row has updated_at + soft delete.
-- Conflict rule: last-write-wins on updated_at (see src/lib/sync.ts).

create extension if not exists "pgcrypto";

create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = greatest(now(), new.updated_at); return new; end;
$$ language plpgsql;

create table exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade, -- null = built-in catalogue
  name text not null,
  category text not null check (category in ('strength','bodyweight','cardio','mobility')),
  equipment text,
  primary_muscles text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table workouts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  notes text,
  started_at timestamptz not null,
  ended_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table workout_exercises (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid not null references workouts(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  position int not null,
  notes text,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table sets (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_exercise_id uuid not null references workout_exercises(id) on delete cascade,
  position int not null,
  set_type text not null default 'working' check (set_type in ('warmup','working','drop','failure')),
  weight_kg numeric(7,2) not null default 0,
  reps int not null default 0,
  rpe numeric(3,1) check (rpe between 1 and 10),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table runs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  distance_m numeric(9,1) not null,
  duration_s int not null,
  avg_hr int,
  rpe numeric(3,1) check (rpe between 1 and 10),
  route jsonb,
  notes text,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index on workouts (user_id, started_at desc);
create index on workout_exercises (workout_id);
create index on sets (workout_exercise_id);
create index on runs (user_id, started_at desc);
-- sync pulls: "everything changed since X"
create index on workouts (user_id, updated_at);
create index on workout_exercises (user_id, updated_at);
create index on sets (user_id, updated_at);
create index on runs (user_id, updated_at);

do $$
declare t text;
begin
  foreach t in array array['exercises','workouts','workout_exercises','sets','runs'] loop
    execute format('create trigger trg_%1$s_updated before update on %1$s
                    for each row execute function set_updated_at()', t);
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Built-in exercises readable by all; custom ones only by owner
create policy exercises_read on exercises for select using (user_id is null or user_id = auth.uid());
create policy exercises_write on exercises for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy workouts_own on workouts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy workout_exercises_own on workout_exercises for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sets_own on sets for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy runs_own on runs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
