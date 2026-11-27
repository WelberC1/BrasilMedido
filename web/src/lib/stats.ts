import { BR, type IndicatorData, type Polarity, type Uf } from './types'

interface Entry {
  sigla: string
  value: number | null
}

export function valuesAt(data: IndicatorData, ufs: Uf[], index: number): Entry[] {
  return ufs.map((u) => ({ sigla: u.sigla, value: data.series[u.sigla]?.[index] ?? null }))
}

export function latestIndex(data: IndicatorData): number {
  const br = data.series[BR]
  for (let i = br.length - 1; i >= 0; i--) if (br[i] != null) return i
  return br.length - 1
}

export function hasAnyValue(data: IndicatorData, index: number): boolean {
  return Object.values(data.series).some((s) => s[index] != null)
}

// k classes → up to k-1 ascending thresholds. Quantiles keep every class populated even for skewed data.
export function quantileBreaks(values: number[], k = 5): number[] {
  const sorted = [...values].sort((a, b) => a - b)
  if (sorted.length < 2) return []
  const breaks: number[] = []
  for (let c = 1; c < k; c++) {
    const pos = (sorted.length - 1) * (c / k)
    const lo = Math.floor(pos)
    const t = sorted[lo] + (sorted[Math.min(lo + 1, sorted.length - 1)] - sorted[lo]) * (pos - lo)
    if (breaks.length === 0 || t > breaks[breaks.length - 1]) breaks.push(t)
  }
  return breaks
}

// A value equal to a threshold goes to the upper class.
export function classify(v: number, breaks: number[]): number {
  let c = 0
  while (c < breaks.length && v >= breaks[c]) c++
  return c
}

export interface Ranked extends Entry {
  rank: number | null
}

// Rank 1 is the best result (largest first for neutral indicators). Ties share a rank (1, 2, 2, 4);
// places without data go last with rank null.
export function rankEntries(entries: Entry[], polarity: Polarity): Ranked[] {
  const dir = polarity === 'lower-is-better' ? 1 : -1
  const withValue = entries.filter((e) => e.value != null).sort((a, b) => dir * (a.value! - b.value!))
  const ranked: Ranked[] = []
  withValue.forEach((e, i) => {
    const prev = ranked[i - 1]
    const rank = prev && prev.value === e.value ? prev.rank : i + 1
    ranked.push({ ...e, rank })
  })
  const missing = entries.filter((e) => e.value == null).map((e) => ({ ...e, rank: null }))
  return [...ranked, ...missing]
}

// Same quarter a year earlier for quarterly series (avoids seasonality), previous year for annual ones,
// skipping unpublished periods.
export function comparableIndex(
  series: (number | null)[],
  index: number,
  periodicity: 'anual' | 'trimestral',
): number | null {
  const step = periodicity === 'trimestral' ? 4 : 1
  for (let i = index - step; i >= 0; i -= step) if (series[i] != null) return i
  return null
}

// Population is compared to Brasil as a share of the total, not as a difference.
export function isCount(unit: string): boolean {
  return unit === 'pessoas'
}

// The site's own threshold, not an IBGE rule.
export const CV_ATTENTION = 15

export function cvNeedsAttention(cv: number | null | undefined): boolean {
  return cv != null && cv > CV_ATTENTION
}

// null for neutral indicators.
export function isBetter(a: number, b: number, polarity: Polarity): boolean | null {
  if (polarity === 'neutral' || a === b) return null
  return polarity === 'higher-is-better' ? a > b : a < b
}
