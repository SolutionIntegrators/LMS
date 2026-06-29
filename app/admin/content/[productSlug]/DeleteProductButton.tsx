'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { deleteProduct } from '../actions'

export default function DeleteProductButton({ productId }: { productId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm('Delete this product and all its modules and lessons? This cannot be undone.')) return
    startTransition(async () => {
      const formData = new FormData()
      formData.set('id', productId)
      await deleteProduct(formData)
      router.push('/admin/content')
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '0.75rem',
        fontWeight: 500,
        padding: '0.25rem 0.625rem',
        borderRadius: 5,
        border: '1px solid #f5c6c0',
        background: '#FDF0EE',
        color: '#8B2A1A',
        cursor: pending ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
        opacity: pending ? 0.6 : 1,
      }}
    >
      {pending ? 'Deleting…' : 'Delete product'}
    </button>
  )
}
