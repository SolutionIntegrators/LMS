-- Per (member, product) engagement, computed from access grants + activity +
-- lesson completions. security_invoker so it respects underlying RLS, and
-- access is revoked from anon/authenticated — only the service role (the
-- engagement sync cron) reads it.
create or replace view public.member_engagement
with (security_invoker = true) as
select
  pr.id                                   as user_id,
  pr.email,
  pr.full_name                            as name,
  p.title                                 as product,
  p.slug                                  as product_slug,
  upa.granted_at,
  fl.first_login_at,
  la.last_active_at,
  coalesce(lc.completed, 0)               as lessons_completed,
  coalesce(tl.total, 0)                   as total_lessons
from public.user_product_access upa
join public.profiles pr on pr.id = upa.user_id
join public.products  p  on p.id = upa.product_id
left join lateral (
  select min(created_at) as first_login_at
  from public.activity_logs
  where user_id = upa.user_id and event_type = 'login'
) fl on true
left join lateral (
  select max(created_at) as last_active_at
  from public.activity_logs
  where user_id = upa.user_id
) la on true
left join lateral (
  select count(*) as total
  from public.lessons l
  join public.modules m on m.id = l.module_id
  where m.product_id = upa.product_id and l.is_published
) tl on true
left join lateral (
  select count(*) as completed
  from public.lesson_completions lc2
  join public.lessons l on l.id = lc2.lesson_id
  join public.modules m on m.id = l.module_id
  where lc2.user_id = upa.user_id and m.product_id = upa.product_id and l.is_published
) lc on true;

revoke all on public.member_engagement from anon, authenticated;
grant select on public.member_engagement to service_role;
