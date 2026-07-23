// Minimal, safe inline markdown: escapes all HTML first, then adds only the
// tags we generate (links restricted to http/https), so user-authored text
// can be clickable/bold/bulleted without allowing script injection. Shared by
// lesson text blocks and community posts so both use the same convention:
// **bold**, *italic*, [label](https://url), and lines starting with "- " (or
// "* "/"• ") become bullets.
function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function mdInlineNoBr(text: string): string {
  let s = escapeHtml(text)
  s = s.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g,
    '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:0.5rem 0;display:block" />'
  )
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--si-burnt-orange);text-decoration:underline">$1</a>'
  )
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
  return s
}

export function mdInline(text: string | null | undefined): string {
  let s = escapeHtml(text ?? '')
  s = s.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g,
    '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:0.5rem 0;display:block" />'
  )
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--si-burnt-orange);text-decoration:underline">$1</a>'
  )
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
  s = s.replace(/\n/g, '<br/>')
  return s
}

// Block-level markdown: lines starting with "- ", "* " or "• " become
// bulleted <ul> items; lines starting with "1. ", "2. " etc. become numbered
// <ol> items (each grouped with consecutive lines of the same kind);
// everything else stays a normal line. All content still passes through
// escapeHtml.
export function mdBlock(text: string | null | undefined): string {
  const lines = (text ?? '').split('\n')
  const out: string[] = []
  let list: string[] = []
  let listTag: 'ul' | 'ol' | null = null
  const flushList = () => {
    if (list.length && listTag) {
      const styleAttr = listTag === 'ul'
        ? 'list-style-type:disc'
        : 'list-style-type:decimal'
      out.push(
        `<${listTag} style="margin:0.35rem 0;padding-left:1.4rem;${styleAttr};list-style-position:outside">${list
          .map((li) => `<li style="margin-bottom:0.3rem">${li}</li>`)
          .join('')}</${listTag}>`
      )
      list = []
      listTag = null
    }
  }
  for (const line of lines) {
    const bullet = line.match(/^\s*(?:[-*•])\s+(.*)$/)
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (bullet) {
      if (listTag && listTag !== 'ul') flushList()
      listTag = 'ul'
      list.push(mdInlineNoBr(bullet[1]))
    } else if (numbered) {
      if (listTag && listTag !== 'ol') flushList()
      listTag = 'ol'
      list.push(mdInlineNoBr(numbered[1]))
    } else {
      flushList()
      out.push(mdInlineNoBr(line))
    }
  }
  flushList()
  // Join plain lines with <br/>, but never put a <br/> adjacent to a list.
  const isListTag = (s: string) => s.startsWith('<ul') || s.startsWith('<ol')
  return out
    .map((seg, i) => (i > 0 && !isListTag(seg) && !isListTag(out[i - 1]) ? `<br/>${seg}` : seg))
    .join('')
}
