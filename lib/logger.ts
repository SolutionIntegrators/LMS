import { createClient } from './supabase'

type LogEvent =
  | 'login'
  | 'logout'
  | 'lesson_viewed'
  | 'lesson_completed'
  | 'product_accessed'
  | 'download'

interface LogOptions {
  productId?: string
  moduleId?: string
  lessonId?: string
  metadata?: Record<string, unknown>
}

export async function logActivity(
  userId: string,
  eventType: LogEvent | string,
  options: LogOptions = {}
) {
  const supabase = createClient()
  await supabase.from('activity_logs').insert({
    user_id: userId,
    event_type: eventType,
    product_id: options.productId ?? null,
    module_id: options.moduleId ?? null,
    lesson_id: options.lessonId ?? null,
    metadata: (options.metadata ?? null) as import('./database.types').Json | null,
  })
}
