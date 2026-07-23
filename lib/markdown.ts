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
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--si-burnt-orange);text-decoration:underline">$1</a>'
  )
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
  s = s.replace(/\n/g, '<br/>')
  return s
}

// Block-level markdown: lines starting with "- ", "* " or "• " become bullet
// items (consecutive ones grouped into a <ul>); everything else stays a
// normal line. All content still passes through escapeHtml.
export function mdBlock(text: string | null | undefined): string {
  const lines = (text ?? '').split('\n')
  const out: string[] = []
  let list: string[] = []
  const flushList = () => {
    if (list.length) {
      out.push(
        `<ul style="margin:0.35rem 0;padding-left:1.4rem;list-style-type:disc;list-style-position:outside">${list
          .map((li) => `<li style="margin-bottom:0.3rem">${li}</li>`)
          .join('')}</ul>`
      )
      list = []
    }
  }
  for (const line of lines) {
    const m = line.match(/^\s*(?:[-*•])\s+(.*)$/)
    if (m) {
      list.push(mdInlineNoBr(m[1]))
    } else {
      flushList()
      out.push(mdInlineNoBr(line))
    }
  }
  flushList()
  // Join plain lines with <br/>, but never put a <br/> adjacent to a list.
  return out
    .map((seg, i) => (i > 0 && !seg.startsWith('<ul') && !out[i - 1].startsWith('<ul') ? `<br/>${seg}` : seg))
    .join('')
}
