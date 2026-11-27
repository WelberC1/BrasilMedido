import { AlertTriangle, ArrowLeft } from 'lucide-react'
import type { Geo } from '../lib/data'
import { formatPercent, formatValue } from '../lib/format'
import { comparableIndex, CV_ATTENTION, cvNeedsAttention, isCount } from '../lib/stats'
import { BR, type Indicator, type IndicatorData, type Uf } from '../lib/types'
import { Delta } from './Delta'
import { TrendChart } from './TrendChart'
import { UfGlyph } from './UfGlyph'

export interface ProfileItem {
  indicator: Indicator
  mun: number | null
  uf: number | null
  br: number | null
}

interface Props {
  geo: Geo
  indicator: Indicator
  data: IndicatorData | null
  index: number
  uf: Uf | null
  ufRank: number | null
  rankOf: number
  extremes: { best: string; worst: string } | null
  mun: { code: string; name: string; pop: number | null; value: number | null; rank: number | null; of: number } | null
  profile: ProfileItem[]
  onBrasil: () => void
  onUf: () => void
  onPeriod: (i: number) => void
  extremesBars: { key: string; name: string; value: number | null; color: string }[][] | null
}

export function PlacePanel(p: Props) {
  const { indicator, data, index, uf, mun } = p
  const key = uf?.sigla ?? BR
  const period = data?.periods[index]
  const series = data?.series[key]
  const ufValue = series?.[index] ?? null
  const brValue = data?.series[BR][index] ?? null
  const cmp = series ? comparableIndex(series, index, indicator.periodicity) : null
  const cv = data?.cv?.[key]?.[index]
  const munLevel = !!mun
  const value = munLevel ? (indicator.municipal ? mun!.value : null) : ufValue

  return (
    <aside className="panel flex min-h-0 w-full flex-col overflow-y-auto" aria-label="Lugar selecionado" aria-live="polite">
      <div className="border-b border-line p-4">
        {(uf || mun) && (
          <button
            type="button"
            onClick={mun ? p.onUf : p.onBrasil}
            className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-ink-3 transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            {mun ? uf?.nome : 'Brasil'}
          </button>
        )}
        <div className="flex items-center gap-3">
          <UfGlyph geo={p.geo} ufId={uf?.id ?? null} size={40} />
          <div className="min-w-0">
            <h2 className="truncate text-[1.35rem] font-extrabold leading-tight tracking-[-0.01em]" style={{ fontVariationSettings: "'wdth' 108" }}>
              {mun ? mun.name : uf ? uf.nome : 'Brasil'}
            </h2>
            <p className="text-sm text-ink-3">
              {mun
                ? `${uf?.sigla} · ${mun.pop != null ? `${formatValue(mun.pop, { ...indicator, unit: 'pessoas', decimals: 0 })} habitantes (Censo 2022)` : ''}`
                : uf
                  ? `Região ${uf.regiao}`
                  : '27 unidades da federação'}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-sm font-semibold text-ink-2">
            {indicator.shortName}
            {period && !munLevel && ` · ${period.label}`}
            {munLevel && indicator.municipal && ' · Censo 2022'}
          </div>
          {munLevel && !indicator.municipal ? (
            <p className="mt-1.5 rounded-lg bg-chip px-3 py-2 text-sm leading-snug text-ink-2">
              A PNAD Contínua não tem dado para a maioria dos municípios. O valor de {uf?.nome} é{' '}
              <strong className="tnum font-bold text-ink">{formatValue(ufValue, indicator)}</strong>. Veja abaixo o retrato da cidade no Censo 2022.
            </p>
          ) : (
            <div className="display mt-0.5 text-[3rem] leading-none">{formatValue(value, indicator)}</div>
          )}
          {value == null && !(munLevel && !indicator.municipal) && period && (
            <p className="mt-1 text-sm text-caution">Sem dado divulgado para este período.</p>
          )}
        </div>

        <dl className="mt-3 divide-y divide-line text-sm">
          {(uf || mun) && value != null && (
            <Row label={isCount(indicator.unit) ? 'Participação no Brasil' : 'Comparado ao Brasil'}>
              {isCount(indicator.unit) ? (
                <span className="tnum font-semibold">{brValue ? formatPercent((value / brValue) * 100) : '—'}</span>
              ) : (
                <Delta value={value} reference={brValue} indicator={indicator} />
              )}
            </Row>
          )}
          {mun && indicator.municipal && value != null && (
            <Row label={`Comparado a ${uf?.sigla}`}>
              <Delta value={value} reference={ufValue} indicator={indicator} />
            </Row>
          )}
          {!munLevel && cmp != null && (
            <Row label={`Desde ${data!.periods[cmp].label}`}>
              <Delta value={value} reference={series![cmp]} indicator={indicator} />
            </Row>
          )}
          {uf && !mun && p.ufRank != null && (
            <Row label="Posição entre as UFs">
              <span className="tnum font-bold">{p.ufRank}º de {p.rankOf}</span>
            </Row>
          )}
          {mun && indicator.municipal && mun.rank != null && (
            <Row label={`Posição em ${uf?.sigla}`}>
              <span className="tnum font-bold">{mun.rank}º de {mun.of}</span>
            </Row>
          )}
          {!uf && p.extremes && (
            <>
              <Row label={indicator.polarity === 'neutral' ? 'Maior valor' : 'Melhor estado'}>
                <span className="font-semibold">{p.extremes.best}</span>
              </Row>
              <Row label={indicator.polarity === 'neutral' ? 'Menor valor' : 'Pior estado'}>
                <span className="font-semibold">{p.extremes.worst}</span>
              </Row>
            </>
          )}
          {!munLevel && cv != null && (
            <Row label="Margem (coef. de variação)">
              <span className={`tnum inline-flex items-center gap-1 ${cvNeedsAttention(cv) ? 'font-semibold text-caution' : ''}`}>
                {cvNeedsAttention(cv) && <AlertTriangle className="size-3.5" aria-label={`acima de ${CV_ATTENTION}%`} />}
                {formatPercent(cv)}
              </span>
            </Row>
          )}
        </dl>
      </div>

      {!mun && data && data.periods.length > 1 && (
        <div className="p-4">
          <TrendChart indicator={indicator} data={data} index={index} focusKey={uf?.sigla ?? null} focusName={uf?.nome ?? null} onPeriod={p.onPeriod} />
        </div>
      )}

      {!uf && !mun && p.extremesBars && (
        <div className="space-y-4 p-4">
          {p.extremesBars.map((group, gi) => {
            const max = Math.max(...p.extremesBars!.flat().map((x) => x.value ?? 0))
            return (
              <div key={gi}>
                <h3 className="text-sm font-bold">
                  {gi === 0 ? (indicator.polarity === 'neutral' ? 'Maiores valores' : '5 melhores estados') : indicator.polarity === 'neutral' ? 'Menores valores' : '5 piores estados'}
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {group.map((x) => (
                    <li key={x.key} className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-2 text-[13px]">
                      <span className="truncate font-medium">{x.name}</span>
                      <span className="h-2.5 rounded-full bg-chip">
                        <span className="block h-full rounded-full" style={{ width: `${max > 0 ? ((x.value ?? 0) / max) * 100 : 0}%`, background: x.color }} />
                      </span>
                      <span className="tnum font-semibold">{formatValue(x.value, indicator)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
          <p className="text-xs text-ink-3">{indicator.source.survey} · tabela {indicator.source.table}</p>
        </div>
      )}

      {mun && p.profile.length > 0 && (
        <div className="p-4">
          <h3 className="text-sm font-bold">Retrato da cidade no Censo 2022</h3>
          <ul className="mt-2 space-y-2.5">
            {p.profile.map((it) => (
              <li key={it.indicator.id} className="rounded-xl bg-chip px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-semibold text-ink-2">{it.indicator.shortName}</span>
                  <span className="display text-lg leading-none">{formatValue(it.mun, it.indicator)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs text-ink-3">
                  <span className="tnum">
                    {uf?.sigla} {formatValue(it.uf, it.indicator)} · BR {formatValue(it.br, it.indicator)}
                  </span>
                  {it.indicator.polarity !== 'neutral' && <Delta value={it.mun} reference={it.br} indicator={it.indicator} betterWord="melhor" worseWord="pior" />}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-ink-2">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}
