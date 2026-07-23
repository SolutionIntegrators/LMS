-- In-app support ticketing, layered on top of the existing ClickUp workflow
-- (ClickUp remains the source of truth for the team's internal work; this
-- table is the source of truth for what the student sees).

create table if not exists public.support_requests (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  subject               text not null,
  description           text not null,
  product_slug          text,
  clickup_task_id       text,
  clickup_list_id       text,
  -- Raw ClickUp status (every status the task can be in, incl. internal-only
  -- ones like "triaged" or "waiting on ashley"). Never shown to students.
  internal_status       text,
  -- The status students actually see — only ever one of the 5 client-visible
  -- statuses (see lib/clickup.ts CLIENT_VISIBLE_STATUSES). Holds steady while
  -- internal_status cycles through internal-only statuses in between.
  client_visible_status text,
  -- Pulled from ClickUp's "Resolution" custom field.
  resolution            text,
  -- Set once the "your ticket is resolved" email has been sent, so it never
  -- double-sends on a later, unrelated status webhook.
  resolved_notified_at  timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists support_requests_user_idx on public.support_requests(user_id, created_at desc);
create index if not exists support_requests_clickup_task_idx on public.support_requests(clickup_task_id);

alter table public.support_requests enable row level security;

-- Admin sees/edits everything, including internal_status. Ticket submission
-- and the ClickUp webhook both go through the service-role client (like
-- lib/grant.ts's purchase pipeline), so no student-facing insert/update
-- policy is needed — students only ever read their own rows.
create policy support_requests_admin_all on public.support_requests
  for all using (public.is_admin());

create policy support_requests_select_own on public.support_requests
  for select using (user_id = auth.uid());
