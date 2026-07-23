// ClickUp API integration for in-app support ticketing. Keeps ClickUp as the
// team's working tool (task creation + status/resolution stay there); this
// module is the only place that talks to ClickUp's REST API directly.

const CLICKUP_LIST_ID = '901400808508' // "The Goodies Shop" support list

// Custom field ids on that list (fetched via the ClickUp API — see
// clickup_get_custom_fields — rather than guessed, since these are per-list).
const FIELD_CLIENT_EMAIL = '4494df44-7005-495c-8ea7-56bccfca8a53'
const FIELD_PRODUCT = 'eb479ea5-1f5a-42ca-99a3-f10a25ea71e3' // "Which product are you submitting questions for?"
const FIELD_REQUEST_TYPE = 'd5114083-0893-449b-aec1-5d9df2c0d127'
const REQUEST_TYPE_SUPPORT_OPTION = '6df087a6-8dd9-4b91-a47e-17b42eb53ff9' // "Support Request" option
const FIELD_RESOLUTION = '84a6c35a-2330-4353-8e20-02debff361a3'
const FIELD_ADDITIONAL_INFO = '9c1c4c58-c595-46b6-b620-4aa83fb86ba5'

// The only 5 statuses ever shown to a student — everything else on the list
// ("triaged", "waiting on ashley", etc.) is internal-only. Matched against
// ClickUp's actual status strings (lowercase, as ClickUp returns them).
export const CLIENT_VISIBLE_STATUSES = [
  'new tickets',
  'working on it',
  'pending client feedback',
  'testing',
  'resolved',
] as const

async function clickUpFetch(path: string, init?: RequestInit): Promise<Response> {
  const key = process.env.CLICKUP_API_KEY
  if (!key) throw new Error('CLICKUP_API_KEY not configured')
  return fetch(`https://api.clickup.com/api/v2${path}`, {
    ...init,
    headers: { Authorization: key, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
}

// Best-effort: returns null (never throws) so a ClickUp outage never blocks
// the student's ticket submission — the row still exists in Supabase either
// way; /api/cron/support-sync retries rows left with no clickup_task_id.
export async function createClickUpTask(opts: {
  subject: string
  description: string
  email: string
  productTitle: string | null
}): Promise<{ taskId: string; listId: string } | null> {
  if (!process.env.CLICKUP_API_KEY) return null
  try {
    const custom_fields: Array<{ id: string; value: unknown }> = [
      { id: FIELD_CLIENT_EMAIL, value: opts.email },
      { id: FIELD_REQUEST_TYPE, value: REQUEST_TYPE_SUPPORT_OPTION },
    ]
    if (opts.productTitle) custom_fields.push({ id: FIELD_PRODUCT, value: opts.productTitle })

    const res = await clickUpFetch(`/list/${CLICKUP_LIST_ID}/task`, {
      method: 'POST',
      body: JSON.stringify({ name: opts.subject, description: opts.description, custom_fields }),
    })
    if (!res.ok) {
      console.error('ClickUp createTask failed:', res.status, (await res.text()).slice(0, 300))
      return null
    }
    const json = (await res.json()) as { id: string }
    return { taskId: json.id, listId: CLICKUP_LIST_ID }
  } catch (err) {
    console.error('createClickUpTask failed:', err instanceof Error ? err.message : err)
    return null
  }
}

export interface ClickUpTaskFields {
  status: string | null
  resolution: string | null
  additionalInfoNeeded: string | null
}

// Fetches the task's *current* state directly from ClickUp — used as the
// single source of truth for status/Resolution/Additional Info Needed,
// rather than trusting whatever a webhook payload claims to contain (a
// ClickUp Automation's "Send Webhook" action has no reliable way to attach a
// live status value, unlike a natively-registered webhook's history diff).
// Best-effort: returns null on any failure rather than throwing, so a sync
// never fails outright over it.
export async function getClickUpTaskFields(taskId: string): Promise<ClickUpTaskFields | null> {
  try {
    const res = await clickUpFetch(`/task/${taskId}`)
    if (!res.ok) return null
    const json = (await res.json()) as { status?: { status?: string }; custom_fields?: Array<{ id: string; value?: unknown }> }
    const textField = (id: string) => {
      const field = (json.custom_fields ?? []).find((f) => f.id === id)
      return typeof field?.value === 'string' && field.value.trim() ? field.value : null
    }
    return {
      status: typeof json.status?.status === 'string' ? json.status.status.toLowerCase().trim() : null,
      resolution: textField(FIELD_RESOLUTION),
      additionalInfoNeeded: textField(FIELD_ADDITIONAL_INFO),
    }
  } catch (err) {
    console.error('getClickUpTaskFields failed:', err instanceof Error ? err.message : err)
    return null
  }
}
