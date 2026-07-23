'use client'

import { useEffect, useState } from 'react'
import ThreadList, { ThreadListItem } from './ThreadList'
import ThreadDetail, { ThreadDetailData } from './ThreadDetail'
import NewThreadForm from './NewThreadForm'
import { getThreadList, getThreadDetail, createThread, createReply, toggleThreadMute } from '@/app/community/actions'

type View = { mode: 'list' } | { mode: 'new' } | { mode: 'thread'; id: string }

export default function CommunityBoard({
  productId,
  lessonId,
  initialThreads,
  initialThreadId,
}: {
  productId: string
  lessonId: string
  initialThreads: ThreadListItem[]
  initialThreadId: string | null
}) {
  const [threads, setThreads] = useState<ThreadListItem[]>(initialThreads)
  const [view, setView] = useState<View>(initialThreadId ? { mode: 'thread', id: initialThreadId } : { mode: 'list' })
  const [thread, setThread] = useState<ThreadDetailData | null>(null)
  const [loadingThread, setLoadingThread] = useState(false)

  async function refreshList() {
    try {
      setThreads(await getThreadList(productId))
    } catch {
      // best-effort refresh; keep showing whatever we already have
    }
  }

  async function openThread(id: string) {
    setView({ mode: 'thread', id })
    setLoadingThread(true)
    try {
      setThread(await getThreadDetail(id))
    } catch {
      setThread(null)
    } finally {
      setLoadingThread(false)
    }
  }

  useEffect(() => {
    if (view.mode === 'thread') openThread(view.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleNewThread(title: string, body: string) {
    const fd = new FormData()
    fd.set('product_id', productId)
    fd.set('lesson_id', lessonId)
    fd.set('title', title)
    fd.set('body', body)
    fd.set('origin', window.location.origin)
    const { threadId } = await createThread(fd)
    await refreshList()
    await openThread(threadId)
  }

  async function handleReply(body: string) {
    if (view.mode !== 'thread') return
    const fd = new FormData()
    fd.set('thread_id', view.id)
    fd.set('lesson_id', lessonId)
    fd.set('body', body)
    fd.set('origin', window.location.origin)
    await createReply(fd)
    await Promise.all([refreshList(), openThread(view.id)])
  }

  async function handleToggleMute(mute: boolean) {
    if (view.mode !== 'thread') return
    const fd = new FormData()
    fd.set('thread_id', view.id)
    fd.set('mute', String(mute))
    await toggleThreadMute(fd)
    setThread((prev) => (prev ? { ...prev, isMuted: mute } : prev))
  }

  if (view.mode === 'new') {
    return <NewThreadForm onSubmit={handleNewThread} onCancel={() => setView({ mode: 'list' })} />
  }

  if (view.mode === 'thread') {
    if (loadingThread || !thread) {
      return <p style={{ fontFamily: 'DM Sans, sans-serif', color: 'var(--si-muted)' }}>Loading…</p>
    }
    return (
      <ThreadDetail
        thread={thread}
        onBack={() => setView({ mode: 'list' })}
        onReply={handleReply}
        onToggleMute={handleToggleMute}
      />
    )
  }

  return <ThreadList threads={threads} onOpen={openThread} onNewThread={() => setView({ mode: 'new' })} />
}
