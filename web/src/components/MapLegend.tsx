import { ArrowLeft, ArrowRight } from 'lucide-react'
import { formatAxis, formatValue } from '../lib/format'
import { NO_DATA_CSS, type Scale } from '../lib/scale'
import type { Indicator } from '../lib/types'

export function MapLegend({ scale, indicator, brValue, hasMissing }: { scale: Scale; indicator: Indicator; brValue: number | null; hasMissing: boolean }) {
  const noData = hasMissing && (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-3">
      <span className="h-2.5 w-4 rounded-sm" style={{ background: NO_DATA_CSS }} aria-hidden />
      Sem dado
    </span>
  )
  if (scale.kind === 'sequential') {
    return (
      <div>
        <div className="flex gap-[2px]">
          {scale.steps.map((s, i) => (
            <span key={i} className="h-2.5 flex-1 first:rounded-l-full last:rounded-r-full" style={{ background: s.color }} />
          ))}
        </div>
        <div className="tnum mt-1 flex justify-between text-[11px] text-ink-3">
          <span>{formatAxis(scale.steps[0].from, indicator)}</span>
          <span>{formatAxis(scale.steps[scale.steps.length - 1].to, indicator)}</span>
        </div>
        <p className="mt-1.5 text-xs text-ink-3">Mais escuro, maior o valor. Cada tom reúne cerca de um quinto dos lugares.</p>
        {noData}
      </div>
    )
  }
  const lowSide = scale.steps[0]?.side
  return (
    <div>
      <div className="flex items-stretch gap-[2px]">
        {scale.steps.map((s, i) => (
          <span
            key={i}
            className={`h-2.5 first:rounded-l-full last:rounded-r-full ${s.side === 'mid' ? 'w-3 flex-none ring-2 ring-ink ring-inset' : 'flex-1'}`}
            style={{ background: s.color }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex items-start justify-between gap-2 text-xs">
        <span className={lowSide === 'good' ? 'font-semibold text-good-strong' : 'font-semibold text-bad-strong'}>
          <ArrowLeft className="mr-0.5 inline size-3 align-[-2px]" aria-hidden />
          {lowSide === 'good' ? 'Melhor' : 'Pior'}
        </span>
        <span className="tnum shrink-0 rounded-full bg-ink px-2 py-0.5 font-semibold text-on-ink">≈ Brasil {formatValue(brValue, indicator)}</span>
        <span className={lowSide === 'good' ? 'text-right font-semibold text-bad-strong' : 'text-right font-semibold text-good-strong'}>
          {lowSide === 'good' ? 'Pior' : 'Melhor'}
          <ArrowRight className="ml-0.5 inline size-3 align-[-2px]" aria-hidden />
        </span>
      </div>
      {noData && <div className="mt-1.5">{noData}</div>}
    </div>
  )
}
