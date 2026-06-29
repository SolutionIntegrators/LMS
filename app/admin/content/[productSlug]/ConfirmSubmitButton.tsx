'use client'

export default function ConfirmSubmitButton({
  message,
  children,
  style,
}: {
  message: string
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <button
      type="submit"
      style={style}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault()
      }}
    >
      {children}
    </button>
  )
}
