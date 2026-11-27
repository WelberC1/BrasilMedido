import type { Indicator } from './types'

const nf = (min: number, max = min) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max })

// "4,9%", "R$ 3.456", "10,1 anos", "0,504", "3.132"
export function formatValue(v: number | null | undefined, ind: Indicator): string {
  if (v == null) return '—'
  switch (ind.unit) {
    case '%':
      return `${nf(ind.decimals).format(v)}%`
    case 'R$':
      return `R$ ${nf(0).format(v)}`
    case 'anos':
      return `${nf(ind.decimals).format(v)} anos`
    case 'pessoas':
      return nf(0).format(v)
    case 'hab/km²':
      return `${nf(v < 10 ? 1 : 0).format(v)} hab/km²`
    default:
      return nf(ind.decimals).format(v)
  }
}

export function formatAxis(v: number, ind: Indicator): string {
  if (ind.unit === 'pessoas') return formatPeople(v, true)
  if (ind.unit === 'R$') return nf(0).format(v)
  if (ind.unit === 'hab/km²') return nf(v < 10 ? 1 : 0).format(v)
  return nf(ind.decimals > 1 ? 2 : ind.decimals === 0 ? 0 : 1, ind.decimals).format(v)
}

function formatPeople(v: number, short = false): string {
  if (Math.abs(v) >= 1e6) return `${nf(1).format(v / 1e6)}${short ? ' mi' : ' milhões'}`
  if (Math.abs(v) >= 1e3) return `${nf(0).format(v / 1e3)}${short ? ' mil' : ' mil'}`
  return nf(0).format(v)
}

// Rates differ in percentage points (p.p.), not "%".
export function formatDelta(d: number | null, ind: Indicator, base?: number | null): string {
  if (d == null) return '—'
  const sign = d > 0 ? '+' : d < 0 ? '−' : '±'
  const abs = Math.abs(d)
  switch (ind.unit) {
    case '%':
      return `${sign}${nf(ind.decimals).format(abs)} p.p.`
    case 'anos':
      return `${sign}${nf(ind.decimals).format(abs)} ${abs === 1 ? 'ano' : 'anos'}`
    case 'índice':
      return `${sign}${nf(ind.decimals).format(abs)}`
    case 'hab/km²':
      return `${sign}${nf(1).format(abs)} hab/km²`
    case 'R$':
    case 'pessoas': {
      const main = ind.unit === 'R$' ? `R$ ${nf(0).format(abs)}` : formatPeople(abs)
      if (base) return `${sign}${main} (${sign}${nf(1).format(Math.abs((d / base) * 100))}%)`
      return `${sign}${main}`
    }
  }
}

export function formatPercent(v: number, digits = 1): string {
  return `${nf(digits).format(v)}%`
}

export function unitLabel(ind: Indicator): string {
  switch (ind.unit) {
    case '%':
      return 'percentual (%)'
    case 'R$':
      return 'reais (R$), valores reais'
    case 'anos':
      return ind.id === 'anos-estudo' ? 'anos de estudo' : 'anos'
    case 'pessoas':
      return 'pessoas'
    case 'hab/km²':
      return 'habitantes por km²'
    default:
      return 'índice (0 a 1)'
  }
}
