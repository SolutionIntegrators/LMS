-- Kit (ConvertKit) tag applied to buyers of this product on purchase.
-- The purchase webhook calls Kit's v4 API to add this tag to the buyer.
alter table public.products add column if not exists kit_tag_id bigint;
