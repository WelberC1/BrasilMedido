export type Polarity = 'lower-is-better' | 'higher-is-better' | 'neutral'
export type DataKind = 'observado' | 'estimado' | 'calculado'
export type Unit = '%' | 'anos' | 'R$' | 'índice' | 'pessoas' | 'hab/km²'

export interface Category {
  id: string
  name: string
  description: string
}

export interface Indicator {
  id: string
  categoryId: string
  name: string
  shortName: string
  description: string
  unit: Unit
  decimals: number
  polarity: Polarity
  kind: DataKind
  universe: string
  note: string | null
  periodicity: 'anual' | 'trimestral'
  source: { publisher: string; survey: string; table: number; variable: number; url: string }
  coverage: string
  firstPeriod: string
  lastPeriod: string
  municipal: boolean
}

export interface Catalog {
  generatedAt: string
  categories: Category[]
  indicators: Indicator[]
}

export interface Uf {
  id: string
  sigla: string
  nome: string
  regiao: string
}

export interface Period {
  id: string
  label: string
}

/** Arrays in series/cv are aligned with periods. Key "BR" is IBGE's official national estimate. */
export interface IndicatorData {
  id: string
  periods: Period[]
  series: Record<string, (number | null)[]>
  cv: Record<string, (number | null)[]> | null
  warnings: string[]
}

export const BR = 'BR'

/** [IBGE 7-digit code, name, UF sigla] */
export type Municipio = [string, string, string]

export interface MunicipalData {
  id: string
  period: string
  values: Record<string, number | null>
  missing: string[]
}
