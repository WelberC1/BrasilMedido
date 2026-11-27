import { useMemo, useRef } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatAxis, formatPercent, formatValue, unitLabel } from '../lib/format'
import { comparableIndex, isCount, type Ranked } from '../lib/stats'
import { BR, type Indicator, type IndicatorData, type Uf } from '../lib/types'
import { AXIS, gapRuns, HatchDefs, yearOf, yearTicks } from './chartBits'
import { useTheme } from '../lib/theme'
import { Delta } from './Delta'
import { SourceLine } from './SourceLine'

// Kept away from the map's better/worse colors; order checked for color blindness.
const SLOTS_LIGHT = ['#0f9d8a', '#7a3fb0', '#d6337a', '#5f7a1f']
const SLOTS_DARK = ['#1ea893', '#9a72e0', '#e0608f', '#8aa63f']
const MAX = SLOTS_LIGHT.length
const REGIONS = ['Norte', 'Nordeste', 'Sudeste', 'Sul', 'Centro-Oeste']

interface Props {
  indicator: Indicator
  data: IndicatorData
  index: number
  ufs: Uf[]
  ranking: Ranked[]
  chosen: string[] | null
  onChange: (list: string[]) => void
}

export function Compare({ indicator, data, index, ufs, ranking, chosen, onChange }: Props) {
  const SLOTS = useTheme() === 'dark' ? SLOTS_DARK : SLOTS_LIGHT
  const withData = ranking.filter((r) => r.rank != null)
  const suggested = chosen == null
  const list = useMemo(() => {
    if (chosen) return chosen.filter((s) => ufs.some((u) => u.sigla === s)).slice(0, MAX)
    const best = withData[0]?.sigla
    const worst = withData[withData.length - 1]?.sigla
    return [best, worst].filter((s, i, a): s is string => !!s && a.indexOf(s) === i)
  }, [chosen, ufs, withData])

  // A UF keeps its color while it stays selected, so removing one never repaints the others.
  const slotOf = useRef(new Map<string, number>())
  for (const s of [...slotOf.current.keys()]) if (!list.includes(s)) slotOf.current.delete(s)
  for (const s of list) {
    if (!slotOf.current.has(s)) {
      const used = new Set(slotOf.current.values())
      slotOf.current.set(s, SLOTS.findIndex((_, i) => !used.has(i)))
    }
  }
  const color = (s: string) => SLOTS[slotOf.current.get(s) ?? 0]

  const ufBySigla = new Map(ufs.map((u) => [u.sigla, u]))
  const rows = data.periods.map((p, i) => {
    const row: Record<string, string | number | null> = { label: p.label, BR: data.series[BR][i] }
    for (const s of list) row[s] = data.series[s][i]
    return row
  })
  const gaps = gapRuns(data)
  const quarterly = data.periods[0].id.length === 6
  const ticks = yearTicks(data, data.periods.length > 12 && !quarterly ? 2 : 1)
  const brNow = data.series[BR][index]

  const toggle = (s: string) => {
    if (list.includes(s)) onChange(list.filter((x) => x !== s))
    else if (list.length < MAX) onChange([...list, s])
  }

  return (
    <section aria-labelledby="compare-title">
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 id="compare-title" className="text-2xl font-extrabold tracking-[-0.01em] text-ink">
            Comparar estados
          </h2>
          <p className="mt-1 text-sm text-ink-2">
            {indicator.name}, {unitLabel(indicator)}. Escolha até {MAX} unidades da federação.{' '}
            {suggested && list.length > 0 && 'Para começar, mostramos o melhor e o pior resultado.'}
          </p>

          <div className="mt-5 space-y-3">
            {REGIONS.map((reg) => (
              <fieldset key={reg}>
                <legend className="mb-1.5 text-xs font-medium text-ink-3">{reg}</legend>
                <div className="flex flex-wrap gap-1.5">
                  {ufs
                    .filter((u) => u.regiao === reg)
                    .sort((a, b) => a.sigla.localeCompare(b.sigla))
                    .map((u) => {
                      const on = list.includes(u.sigla)
                      const full = !on && list.length >= MAX
                      return (
                        <button
                          key={u.sigla}
                          type="button"
                          aria-pressed={on}
                          disabled={full}
                          title={u.nome}
                          aria-label={`${u.nome}${on ? ' (selecionado)' : ''}`}
                          onClick={() => toggle(u.sigla)}
                          className={`inline-flex h-8 min-w-11 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-semibold tracking-wide transition-colors duration-150 ${
                            on
                              ? 'border-ink bg-ink text-on-ink'
                              : 'border-line-2 bg-panel text-ink hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line-2 disabled:hover:text-ink'
                          }`}
                        >
                          {on && <span className="size-2 rounded-full" style={{ background: color(u.sigla) }} aria-hidden />}
                          {u.sigla}
                        </button>
                      )
                    })}
                </div>
              </fieldset>
            ))}
          </div>
          {list.length > 0 && (
            <button type="button" onClick={() => onChange([])} className="mt-4 text-sm font-medium text-good-strong hover:text-ink">
              Limpar seleção
            </button>
          )}
        </div>

        <div className="min-w-0 lg:col-span-8">
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-2">
            {list.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full" style={{ background: color(s) }} />
                {ufBySigla.get(s)?.nome}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0 w-4 border-t-2 border-dashed border-[#8792ad]" />
              Brasil
            </span>
          </div>
          {data.periods.length > 1 ? (
          <div className="mt-2 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <HatchDefs />
                <CartesianGrid vertical={false} stroke="var(--color-line)" />
                {gaps.map(([a, b]) => (
                  <ReferenceArea key={a} x1={a} x2={b} fill="url(#gap-hatch)" fillOpacity={1} stroke="none" />
                ))}
                <XAxis dataKey="label" ticks={ticks} tickFormatter={quarterly ? yearOf : undefined} {...AXIS} tickLine={false} interval="preserveStartEnd" minTickGap={14} />
                <YAxis
                  {...AXIS}
                  axisLine={false}
                  tickLine={false}
                  width={indicator.unit === 'pessoas' ? 58 : 44}
                  domain={['auto', 'auto']}
                  tickFormatter={(v: number) => formatAxis(v, indicator)}
                />
                <Tooltip
                  cursor={{ stroke: 'var(--color-line-2)' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const row = payload[0].payload as Record<string, number | null>
                    const keys = [...list].sort((a, b) => (row[b] ?? -Infinity) - (row[a] ?? -Infinity))
                    return (
                      <div className="rounded-md border border-line bg-panel px-3 py-2 text-xs shadow-[0_6px_20px_-6px_rgba(11,31,74,0.3)]">
                        <div className="mb-1 font-semibold text-ink">{label}</div>
                        {[...keys, BR].map((k) => (
                          <div key={k} className="flex items-center justify-between gap-4">
                            <span className="inline-flex items-center gap-1.5 text-ink-2">
                              <span className="size-2 rounded-full" style={{ background: k === BR ? '#8792ad' : color(k) }} />
                              {k === BR ? 'Brasil' : k}
                            </span>
                            <span className="tnum font-medium text-ink">{formatValue(row[k], indicator)}</span>
                          </div>
                        ))}
                      </div>
                    )
                  }}
                />
                <Line dataKey="BR" stroke="#8792ad" strokeWidth={2} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
                {list.map((s) => (
                  <Line
                    key={s}
                    dataKey={s}
                    stroke={color(s)}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--color-panel)' }}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          ) : (
            <SingleYearBars
              items={[...list.map((x) => ({ key: x, name: ufBySigla.get(x)?.nome ?? x, value: data.series[x][index], color: color(x) })), { key: BR, name: 'Brasil', value: brNow, color: '#8792ad' }]}
              indicator={indicator}
            />
          )}

          <ul className="mt-6 divide-y divide-line border-y border-line md:hidden">
            {[...list, BR].map((s) => {
              const series = data.series[s]
              const ci = comparableIndex(series, index, indicator.periodicity)
              const r = ranking.find((x) => x.sigla === s)
              return (
                <li key={s} className="py-3 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="inline-flex items-center gap-2 font-medium text-ink">
                      <span className="size-2.5 rounded-full" style={{ background: s === BR ? '#8792ad' : color(s) }} aria-hidden />
                      {s === BR ? 'Brasil' : ufBySigla.get(s)?.nome}
                    </span>
                    <span className="tnum font-semibold text-ink">{formatValue(series[index], indicator)}</span>
                  </div>
                  <dl className="mt-1.5 space-y-1 text-xs">
                    {s !== BR && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-3">{isCount(indicator.unit) ? 'Participação no Brasil' : 'Em relação ao Brasil'}</dt>
                        <dd>
                          {isCount(indicator.unit) ? (
                            <span className="tnum text-ink">{series[index] != null && brNow ? formatPercent((series[index]! / brNow) * 100) : '—'}</span>
                          ) : (
                            <Delta value={series[index]} reference={brNow} indicator={indicator} />
                          )}
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-3">{ci != null ? `Desde ${data.periods[ci].label}` : 'Variação'}</dt>
                      <dd>
                        <Delta value={series[index]} reference={ci != null ? series[ci] : null} indicator={indicator} />
                      </dd>
                    </div>
                    {r?.rank && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-3">Posição</dt>
                        <dd className="tnum text-ink">{r.rank}º de 27</dd>
                      </div>
                    )}
                  </dl>
                </li>
              )
            })}
          </ul>

          <div className="mt-6 hidden md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Comparação de {indicator.name} em {data.periods[index].label}
              </caption>
              <thead>
                <tr className="border-b border-line-2 text-left text-xs text-ink-3">
                  <th scope="col" className="py-2 pr-3 font-medium">Unidade</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">{data.periods[index].label}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">{isCount(indicator.unit) ? 'Participação no Brasil' : 'Em relação ao Brasil'}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Variação</th>
                  <th scope="col" className="py-2 text-right font-medium">Posição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((s) => {
                  const series = data.series[s]
                  const ci = comparableIndex(series, index, indicator.periodicity)
                  const r = ranking.find((x) => x.sigla === s)
                  return (
                    <tr key={s}>
                      <th scope="row" className="py-2.5 pr-3 text-left font-medium text-ink">
                        <span className="inline-flex items-center gap-2">
                          <span className="size-2.5 rounded-full" style={{ background: color(s) }} aria-hidden />
                          {ufBySigla.get(s)?.nome}
                        </span>
                      </th>
                      <td className="tnum py-2.5 pr-3 text-right font-semibold text-ink">{formatValue(series[index], indicator)}</td>
                      <td className="py-2.5 pr-3 text-right">
                        {isCount(indicator.unit) ? (
                          <span className="tnum text-ink">{series[index] != null && brNow ? formatPercent((series[index]! / brNow) * 100) : '—'}</span>
                        ) : (
                          <Delta value={series[index]} reference={brNow} indicator={indicator} />
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        <Delta value={series[index]} reference={ci != null ? series[ci] : null} indicator={indicator} />
                      </td>
                      <td className="tnum py-2.5 text-right text-ink-2">{r?.rank ? `${r.rank}º` : '—'}</td>
                    </tr>
                  )
                })}
                <tr>
                  <th scope="row" className="py-2.5 pr-3 text-left font-medium text-ink-2">
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2.5 rounded-full bg-[#8792ad]" aria-hidden />
                      Brasil
                    </span>
                  </th>
                  <td className="tnum py-2.5 pr-3 text-right font-semibold text-ink">{formatValue(brNow, indicator)}</td>
                  <td className="py-2.5 pr-3 text-right text-ink-3">—</td>
                  <td className="py-2.5 pr-3 text-right">
                    {(() => {
                      const ci = comparableIndex(data.series[BR], index, indicator.periodicity)
                      return <Delta value={brNow} reference={ci != null ? data.series[BR][ci] : null} indicator={indicator} />
                    })()}
                  </td>
                  <td className="py-2.5 text-right text-ink-3">—</td>
                </tr>
              </tbody>
            </table>
          </div>
          <SourceLine indicator={indicator} period={data.periods[index].label} />
        </div>
      </div>
    </section>
  )
}

// Censo indicators have a single period: bars instead of a one-point line.
function SingleYearBars({ items, indicator }: { items: { key: string; name: string; value: number | null; color: string }[]; indicator: Indicator }) {
  const max = Math.max(...items.map((i) => i.value ?? 0))
  return (
    <ul className="mt-3 space-y-2.5" aria-label="Comparação">
      {items.map((i) => (
        <li key={i.key} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate font-semibold">{i.name}</span>
          <span className="h-3 rounded-full bg-chip">
            <span className="block h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${max > 0 ? ((i.value ?? 0) / max) * 100 : 0}%`, background: i.color }} />
          </span>
          <span className="tnum min-w-16 text-right font-bold">{formatValue(i.value, indicator)}</span>
        </li>
      ))}
    </ul>
  )
}
