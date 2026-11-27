import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatAxis, formatValue, unitLabel } from '../lib/format'
import { BR, type Indicator, type IndicatorData } from '../lib/types'
import { gapRuns, yearOf, yearTicks } from './chartBits'

export function TrendChart({ indicator, data, index, focusKey, focusName, onPeriod }: { indicator: Indicator; data: IndicatorData; index: number; focusKey: string | null; focusName: string | null; onPeriod: (i: number) => void }) {
  const rows = data.periods.map((p, i) => ({ label: p.label, br: data.series[BR][i], f: focusKey ? (data.series[focusKey]?.[i] ?? null) : null }))
  const quarterly = data.periods[0].id.length === 6
  const ticks = yearTicks(data, quarterly ? 3 : data.periods.length > 10 ? 3 : 2)
  return (
    <section aria-label="Evolução">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold">Evolução</h3>
        <span className="text-xs text-ink-3">{unitLabel(indicator)}</span>
      </div>
      <p className="text-xs text-ink-3">
        {focusName ? `${focusName} e Brasil` : 'Brasil'}, {data.periods[0].label} a {data.periods[data.periods.length - 1].label}
      </p>
      <div className="mt-2 flex gap-4 text-[11px] text-ink-2">
        {focusKey && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3.5 rounded-full bg-ink" />
            {focusName}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span className={`w-3.5 ${focusKey ? 'h-0 border-t-2 border-dashed border-[#8792ad]' : 'h-0.5 rounded-full bg-ink'}`} />
          Brasil
        </span>
      </div>
      <div className="mt-1 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={rows}
            margin={{ top: 6, right: 6, bottom: 0, left: -6 }}
            onClick={(s) => {
              const i = Number((s as { activeTooltipIndex?: number | string }).activeTooltipIndex)
              if (Number.isFinite(i)) onPeriod(i)
            }}
            className="cursor-pointer"
          >
            <CartesianGrid vertical={false} stroke="var(--color-line)" />
            {gapRuns(data).map(([a, b]) => (
              <ReferenceArea key={a} x1={a} x2={b} fill="var(--color-line)" fillOpacity={1} stroke="none" />
            ))}
            <XAxis dataKey="label" ticks={ticks} tickFormatter={quarterly ? yearOf : undefined} tick={{ fill: 'var(--color-ink-3)', fontSize: 11 }} stroke="var(--color-line-2)" tickLine={false} interval="preserveStartEnd" minTickGap={10} />
            <YAxis tick={{ fill: 'var(--color-ink-3)', fontSize: 11 }} axisLine={false} tickLine={false} width={44} domain={['auto', 'auto']} tickFormatter={(v: number) => formatAxis(v, indicator)} />
            <ReferenceLine x={data.periods[index].label} stroke="var(--color-ink)" strokeDasharray="2 3" />
            <Tooltip
              cursor={{ stroke: 'var(--color-line-2)' }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="rounded-lg bg-ink px-2.5 py-1.5 text-xs text-on-ink">
                    <div className="font-semibold">{label}</div>
                    {focusKey && (
                      <div className="tnum">
                        {focusName}: {formatValue((payload[0].payload as { f: number | null }).f, indicator)}
                      </div>
                    )}
                    <div className="tnum text-on-ink/75">Brasil: {formatValue((payload[0].payload as { br: number | null }).br, indicator)}</div>
                  </div>
                ) : null
              }
            />
            <Line dataKey="br" stroke={focusKey ? '#8792ad' : 'var(--color-ink)'} strokeWidth={2} strokeDasharray={focusKey ? '4 3' : undefined} dot={false} isAnimationActive={false} connectNulls={false} />
            {focusKey && <Line dataKey="f" stroke="var(--color-ink)" strokeWidth={2.2} dot={false} activeDot={{ r: 4, stroke: 'var(--color-panel)', strokeWidth: 2 }} isAnimationActive={false} connectNulls={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
