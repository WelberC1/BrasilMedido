import type { IndicatorData } from '../lib/types'

// [firstLabel, lastLabel] of each run of periods with no national value.
export function gapRuns(data: IndicatorData): [string, string][] {
  const runs: [string, string][] = []
  const br = data.series.BR
  let start = -1
  br.forEach((v, i) => {
    if (v == null && start < 0) start = i
    if ((v != null || i === br.length - 1) && start >= 0) {
      const end = v == null ? i : i - 1
      runs.push([data.periods[start].label, data.periods[end].label])
      start = -1
    }
  })
  return runs
}

export function yearTicks(data: IndicatorData, every = 1): string[] {
  const q = data.periods[0].id.length === 6
  const labels = q ? data.periods.filter((p) => p.id.endsWith('01')).map((p) => p.label) : data.periods.map((p) => p.label)
  return labels.filter((_, i) => i % every === 0)
}

export function yearOf(label: string): string {
  return label.slice(-4)
}

export const AXIS = { stroke: 'var(--color-line-2)', tick: { fill: 'var(--color-ink-3)', fontSize: 11 } }

export function HatchDefs() {
  return (
    <defs>
      <pattern id="gap-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="var(--color-chip)" />
        <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-line-2)" strokeWidth="1.5" />
      </pattern>
    </defs>
  )
}
