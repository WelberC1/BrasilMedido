import { MapPin } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { formatValue } from '../lib/format'
import type { Scale } from '../lib/scale'
import type { Indicator } from '../lib/types'
import { MapLegend } from './MapLegend'
import { SourceLine } from './SourceLine'

export interface RankRow {
  key: string
  name: string
  value: number | null
  rank: number | null
}

interface Props {
  options: Indicator[]
  indicator: Indicator
  onIndicator: (id: string) => void
  scale: Scale | null
  brValue: number | null
  rows: RankRow[]
  rowsTitle: string
  selected: string | null
  onRow: (key: string) => void
  hasMissing: boolean
}

export function IndicatorPanel(p: Props) {
  const { indicator } = p
  const list = useRef<HTMLOListElement>(null)
  useEffect(() => {
    // scrollIntoView would also scroll the page, so move the list by hand.
    const ol = list.current
    const item = ol?.querySelector<HTMLElement>('[aria-pressed="true"]')?.closest('li')
    if (!ol) return
    if (!item) {
      ol.scrollTop = 0
      return
    }
    const top = item.offsetTop - ol.offsetTop
    if (top < ol.scrollTop || top + item.offsetHeight > ol.scrollTop + ol.clientHeight) ol.scrollTop = top - ol.clientHeight / 2
  }, [p.selected, p.rows])
  return (
    <aside className="panel flex min-h-0 w-full flex-col overflow-hidden" aria-label="Indicador">
      <div className="border-b border-line p-4">
        <div role="radiogroup" aria-label="Indicador" className="flex flex-wrap gap-1.5">
          {p.options.map((i) => {
            const on = i.id === indicator.id
            return (
              <button
                key={i.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => p.onIndicator(i.id)}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-semibold transition-colors ${
                  on ? 'bg-ink text-on-ink' : 'bg-chip text-ink-2 hover:text-ink'
                }`}
              >
                {i.shortName}
                {i.municipal && <MapPin className={`size-3 ${on ? 'text-on-ink/70' : 'text-ink-3'}`} aria-label="tem dado por município" />}
              </button>
            )
          })}
        </div>
        <h1 className="mt-3.5 text-[1.45rem] font-extrabold leading-tight tracking-[-0.01em] text-balance text-ink" style={{ fontVariationSettings: "'wdth' 108" }}>
          {indicator.name}
        </h1>
        <p className="mt-1 text-sm leading-snug text-ink-2">{indicator.description}</p>
        {p.scale && (
          <div className="mt-3.5">
            <MapLegend scale={p.scale} indicator={indicator} brValue={p.brValue} hasMissing={p.hasMissing} />
          </div>
        )}
        {!indicator.municipal && (
          <p className="mt-3 rounded-lg bg-chip px-2.5 py-1.5 text-xs leading-snug text-ink-2">
            Pesquisa sem dado para a maioria dos municípios: as cidades mostram o valor do estado. Dados por cidade estão nos indicadores com{' '}
            <MapPin className="inline size-3 align-[-1px]" aria-label="alfinete" />.
          </p>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4 pt-3">
        <h2 className="text-sm font-bold text-ink">{p.rowsTitle}</h2>
        <ol ref={list} className="-mx-2 mt-1.5 max-h-80 min-h-[15rem] flex-1 overflow-y-auto pr-1 lg:max-h-none" aria-label={p.rowsTitle}>
          {p.rows.map((r) => {
            const on = r.key === p.selected
            return (
              <li key={r.key}>
                <button
                  type="button"
                  onClick={() => p.onRow(r.key)}
                  aria-pressed={on}
                  className={`grid w-full grid-cols-[1.6rem_0.65rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-[5px] text-left text-[13px] transition-colors ${
                    on ? 'bg-ink text-on-ink' : 'hover:bg-chip'
                  }`}
                >
                  <span className={`tnum text-right text-xs ${on ? 'text-on-ink/70' : 'text-ink-3'}`}>{r.rank ?? '–'}</span>
                  <span className="size-2.5 rounded-[3px]" style={{ background: p.scale?.color(r.value) }} aria-hidden />
                  <span className="truncate font-medium">{r.name}</span>
                  <span className={`tnum font-semibold ${on ? 'text-on-ink' : 'text-ink'}`}>{formatValue(r.value, indicator)}</span>
                </button>
              </li>
            )
          })}
        </ol>
        <SourceLine indicator={indicator} />
      </div>
    </aside>
  )
}
