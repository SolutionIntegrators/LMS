// Shared types for lesson content blocks (the "elements" builder).

export type BlockAlign = 'left' | 'center' | 'right'

export type Block =
  | { id: string; type: 'heading'; text: string; level: 'h2' | 'h3' }
  | { id: string; type: 'text'; text: string }
  | { id: string; type: 'button'; label: string; url: string; newTab: boolean; variant: 'filled' | 'outline'; align: BlockAlign }
  | { id: string; type: 'divider' }
  | { id: string; type: 'image'; url: string; alt: string; align: BlockAlign; size: 'small' | 'medium' | 'full' }
  | { id: string; type: 'bullets'; items: string[] }
  | { id: string; type: 'html'; html: string }

export type BlockType = Block['type']

// Parse whatever is stored in lessons.content_blocks into a safe Block[].
export function parseBlocks(raw: unknown): Block[] {
  if (!raw) return []
  let value = raw
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(value)) return []
  return value.filter((b): b is Block => !!b && typeof b === 'object' && typeof (b as any).type === 'string')
}
