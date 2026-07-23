-- Surfaces ClickUp's "Additional Info Needed" custom field to the student
-- when the team needs more detail on a ticket that isn't resolved yet.
alter table public.support_requests add column if not exists additional_info_needed text;
