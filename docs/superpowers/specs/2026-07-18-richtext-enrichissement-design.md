# RichText enrichment — Design (2026-07-18)

Validated brainstorming summary. Canonical implementation spec: [`specs/TSD-026-richtext-enrichissement.md`](../../specs/TSD-026-richtext-enrichissement.md).  
User-facing doc: [`specs/GUIDE-richtext.md`](../../specs/GUIDE-richtext.md).

## Decisions
- Pipeline: extend `tokenize` + textarea UX (no WYSIWYG)
- Blocks: H1–H6, bullets, numbered, checkbox, separator `------` (≥6 hyphens), blockquote, `=>`
- Shortcodes strict; `()` ≡ `{}`
- `/d8` `/d12`, `/svg{file,#color?}`, `/data` ≡ `$<>`, pictos `/ref{view?}`, `/picto{tag,ref,view}` (3 required)
- Views: `icon|label|both` only in RichText
- Slash menu + Doc modal; `bulletIcon` param
- Resource key `or` → `pieces`
)
