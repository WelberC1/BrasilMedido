import { Pause, Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import { hasAnyValue } from '../lib/stats'
import type { IndicatorData } from '../lib/types'

export function Timeline({ data, index, onIndex }: { data: IndicatorData; index: number; onIndex: (i: number) => void }) {
  const [playing, setPlaying] = useState(false)
  const n = data.periods.length
  const quarterly = data.periods[0].id.length === 6

  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => {
      let next = index + 1
      while (next < n && !hasAnyValue(data, next)) next++
      if (next >= n) setPlaying(false)
      else onIndex(next)
    }, quarterly ? 260 : 650)
    return () => clearInterval(t)
  }, [playing, index, n, data, onIndex, quarterly])

  if (n < 2) {
    return (
      <div className="panel flex items-center gap-3 px-4 py-2.5 text-sm">
        <span className="display text-base">{data.periods[0].label}</span>
        <span className="text-ink-3">Retrato único do Censo 2022: não há série histórica para este indicador.</span>
      </div>
    )
  }

  const years = data.periods.map((p, i) => ({ p, i })).filter(({ p }) => (quarterly ? p.id.endsWith('01') : true))
  const step = Math.ceil(years.length / 8)

  return (
    <div className="panel flex items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-4">
      <button
        type="button"
        onClick={() => {
          if (!playing && index >= n - 1) onIndex(data.periods.findIndex((_, i) => hasAnyValue(data, i)))
          setPlaying((p) => !p)
        }}
        aria-label={playing ? 'Pausar animação' : 'Animar a série no tempo'}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-on-ink transition-transform hover:scale-105"
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
      </button>
      <div className="display w-24 shrink-0 text-base sm:w-28" aria-live="polite">
        {data.periods[index].label}
      </div>
      <div className="relative min-w-0 flex-1 pb-4">
        <div className="absolute inset-x-0 top-[9px] flex h-1.5 overflow-hidden rounded-full bg-chip" aria-hidden>
          {data.periods.map((p, i) => (
            <span
              key={p.id}
              className="h-full flex-1"
              style={{
                background: !hasAnyValue(data, i)
                  ? 'repeating-linear-gradient(45deg,var(--color-line-2) 0 2px,transparent 2px 5px)'
                  : i <= index
                    ? 'var(--color-ink)'
                    : 'transparent',
              }}
            />
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={n - 1}
          value={index}
          onChange={(e) => {
            setPlaying(false)
            const i = Number(e.target.value)
            if (hasAnyValue(data, i)) onIndex(i)
          }}
          aria-label="Período"
          aria-valuetext={data.periods[index].label}
          className="relative h-6 w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-on-ink [&::-moz-range-thumb]:bg-ink [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-on-ink [&::-webkit-slider-thumb]:bg-ink [&::-webkit-slider-thumb]:shadow"
        />
        <div className="tnum pointer-events-none absolute inset-x-0 bottom-0 h-4 text-[11px] text-ink-3" aria-hidden>
          {years
            .filter((_, k) => k % step === 0)
            .map(({ p, i }) => (
              <span key={p.id} className="absolute -translate-x-1/2" style={{ left: `${(i / (n - 1)) * 100}%` }}>
                {p.id.slice(0, 4)}
              </span>
            ))}
        </div>
      </div>
    </div>
  )
}
