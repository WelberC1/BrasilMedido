import { classify, quantileBreaks } from './stats'
import type { Theme } from './theme'
import type { Polarity } from './types'

// Index 0 is the step nearest Brasil's value.
export const GOOD = ['#a9bef2', '#4f74d9', '#1d3fa8', '#0f256b'] as const
export const BAD = ['#f0d3a6', '#e2a55a', '#c9822e', '#8e4a12'] as const
export const MID = '#c9c3b8'
export const SEQ = ['#d7efec', '#9bd5cf', '#4fb0a8', '#1f7f7a', '#0e4e4c'] as const
export const NO_DATA = '#fbfbfc'
export const NO_DATA_CSS = 'repeating-linear-gradient(45deg,var(--color-line-2) 0 2px,var(--color-chip) 2px 5px)'

// On the dark background the farthest step is the lightest, so the order of lightness flips.
const DARK = {
  GOOD: ['#2c4178', '#3d5fc4', '#6488f0', '#a6bdff'],
  BAD: ['#5a4127', '#946630', '#d6953f', '#f6c27a'],
  MID: '#6b665c',
  SEQ: ['#173a3b', '#1f5e5a', '#2e8c84', '#58bdb3', '#a6e3dc'],
} as const
const LIGHT = { GOOD, BAD, MID, SEQ }

interface LegendStep {
  color: string
  from: number
  to: number
  side: 'good' | 'bad' | 'mid' | 'seq'
}

export interface Scale {
  kind: 'diverging' | 'sequential'
  color: (v: number | null | undefined) => string
  steps: LegendStep[]
  center: number | null
}

// Centered on Brasil's value; each side gets its own quantile classes so a lopsided
// distribution still shows gradation on both sides. Neutral indicators get a sequential scale.
export function buildScale(values: number[], center: number | null, polarity: Polarity, theme: Theme = 'light'): Scale {
  const R = theme === 'dark' ? DARK : LIGHT
  const sorted = [...values].sort((a, b) => a - b)
  const min = sorted[0] ?? 0
  const max = sorted[sorted.length - 1] ?? 0

  if (polarity === 'neutral' || center == null) {
    const breaks = quantileBreaks(values, R.SEQ.length)
    const ramp = R.SEQ.slice(R.SEQ.length - (breaks.length + 1))
    const edges = [min, ...breaks, max]
    return {
      kind: 'sequential',
      center: null,
      color: (v) => (v == null ? NO_DATA : ramp[classify(v, breaks)]),
      steps: ramp.map((color, i) => ({ color, from: edges[i], to: edges[i + 1], side: 'seq' })),
    }
  }

  const tol = Math.max(Math.abs(center) * 0.005, 1e-9)
  const below = values.filter((v) => v < center - tol)
  const above = values.filter((v) => v > center + tol)
  const k = 3
  const belowBreaks = quantileBreaks(below.map((v) => center - v), k) // distance from center
  const aboveBreaks = quantileBreaks(above.map((v) => v - center), k)
  const higherIsGood = polarity === 'higher-is-better'
  const aboveRamp: readonly string[] = higherIsGood ? R.GOOD : R.BAD
  const belowRamp: readonly string[] = higherIsGood ? R.BAD : R.GOOD

  const color = (v: number | null | undefined) => {
    if (v == null) return NO_DATA
    if (Math.abs(v - center) <= tol) return R.MID
    if (v > center) return aboveRamp[Math.min(classify(v - center, aboveBreaks), 3)]
    return belowRamp[Math.min(classify(center - v, belowBreaks), 3)]
  }

  const steps: LegendStep[] = []
  const side = (ramp: readonly string[], breaks: number[], dir: 1 | -1, list: number[]) => {
    if (list.length === 0) return []
    const far = dir === 1 ? Math.max(...list) - center : center - Math.min(...list)
    const edges = [0, ...breaks, far]
    return edges.slice(0, -1).map((e, i) => ({
      color: ramp[Math.min(i, 3)],
      from: center + dir * e,
      to: center + dir * edges[i + 1],
      side: (ramp === R.GOOD ? 'good' : 'bad') as 'good' | 'bad',
    }))
  }
  steps.push(...side(belowRamp, belowBreaks, -1, below).reverse())
  steps.push({ color: R.MID, from: center, to: center, side: 'mid' })
  steps.push(...side(aboveRamp, aboveBreaks, 1, above))
  return { kind: 'diverging', center, color, steps }
}


export function inkOn(color: string): string {
  const n = parseInt(color.slice(1), 16)
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return lum > 0.6 ? '#0b1f4a' : '#ffffff'
}
