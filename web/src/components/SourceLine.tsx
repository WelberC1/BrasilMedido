import { ExternalLink } from 'lucide-react'
import { unitLabel } from '../lib/format'
import type { Indicator } from '../lib/types'

export function SourceLine({ indicator, period }: { indicator: Indicator; period?: string }) {
  return (
    <p className="mt-4 text-xs leading-relaxed text-ink-3">
      Fonte: {indicator.source.publisher}, {indicator.source.survey},{' '}
      <a
        href={indicator.source.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-0.5 font-medium text-good-strong underline hover:text-ink"
      >
        tabela {indicator.source.table}
        <ExternalLink className="size-3" aria-hidden />
      </a>
      {' · '}
      {unitLabel(indicator)}
      {period ? ` · ${period}` : ''}
    </p>
  )
}
