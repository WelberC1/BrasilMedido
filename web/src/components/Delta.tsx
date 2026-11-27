import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { formatDelta } from '../lib/format'
import { isBetter } from '../lib/stats'
import type { Indicator } from '../lib/types'

export function Delta({
  value,
  reference,
  indicator,
  betterWord = 'melhor',
  worseWord = 'pior',
}: {
  value: number | null | undefined
  reference: number | null | undefined
  indicator: Indicator
  betterWord?: string
  worseWord?: string
}) {
  if (value == null || reference == null) return <span className="text-ink-3">sem dado comparável</span>
  const d = value - reference
  const better = isBetter(value, reference, indicator.polarity)
  const Icon = d > 0 ? ArrowUpRight : d < 0 ? ArrowDownRight : Minus
  const tone = better === true ? 'text-good-strong' : better === false ? 'text-bad-strong' : 'text-ink-2'
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-1.5 ${tone}`}>
      <span className="inline-flex items-center gap-0.5 font-semibold tnum">
        <Icon className="size-4 self-center" aria-hidden />
        {formatDelta(d, indicator, reference)}
      </span>
      {better != null && <span className="text-xs font-medium">{better ? betterWord : worseWord}</span>}
    </span>
  )
}
