import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

export interface Tile {
  key: string
  label: string
  value: string
  context: string
  badge?: { text: string; tone: 'good' | 'bad' | 'flat' } | null
  bar?: { min: number; max: number; v: number | null; br: number | null } | null
  active?: boolean
  onClick?: () => void
}

export function Scoreboard({ place, tiles, loading }: { place: string; tiles: Tile[]; loading: boolean }) {
  return (
    <section aria-label={`Números principais: ${place}`} className="panel overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t, i) => {
          const Tag = t.onClick ? 'button' : 'div'
          const on = !!t.active
          return (
            <Tag
              key={t.key}
              {...(t.onClick ? { type: 'button' as const, onClick: t.onClick, 'aria-pressed': on } : {})}
              className={`relative flex min-h-[8.25rem] min-w-0 sm:h-[8.25rem] flex-col items-start px-4 pb-3 pt-3.5 text-left transition-colors duration-200 sm:px-5 ${
                i > 0 ? 'border-line max-lg:border-t lg:border-l' : ''
              } ${on ? 'bg-ink text-on-ink' : t.onClick ? 'hover:bg-chip' : ''} ${i === tiles.length - 1 ? 'max-sm:col-span-2' : ''}`}
            >
              <span className={`text-[13px] font-semibold ${on ? 'text-on-ink/75' : 'text-ink-2'}`}>{t.label}</span>
              {loading ? (
                <span className="skeleton mt-1.5 h-9 w-28" />
              ) : (
                <span
                  className={`display mt-0.5 whitespace-nowrap leading-none ${
                    t.value.length > 9 ? 'text-[clamp(1.2rem,1.85vw,2rem)]' : 'text-[clamp(1.6rem,2.4vw,2.35rem)]'
                  }`}
                >
                  {t.value}
                </span>
              )}
              <span className="mt-auto flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pt-2">
                {t.badge && <Badge {...t.badge} inverted={on} />}
                <span className={`text-[11px] leading-tight ${on ? 'text-on-ink/65' : 'text-ink-3'}`}>{t.context}</span>
              </span>
              {t.bar && <PositionBar {...t.bar} inverted={on} />}
            </Tag>
          )
        })}
      </div>
    </section>
  )
}

function Badge({ text, tone, inverted }: { text: string; tone: 'good' | 'bad' | 'flat'; inverted: boolean }) {
  const Icon = text.startsWith('+') ? ArrowUpRight : text.startsWith('−') ? ArrowDownRight : Minus
  const cls =
    tone === 'good' ? 'bg-good text-on-ink' : tone === 'bad' ? 'bg-bad text-on-bad' : inverted ? 'bg-on-ink/15 text-on-ink' : 'bg-chip text-ink-2'
  return (
    <span className={`tnum inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${cls}`}>
      <Icon className="size-3" aria-hidden />
      {text.replace(/^[+−±]/, '')}
    </span>
  )
}

function PositionBar({ min, max, v, br, inverted }: { min: number; max: number; v: number | null; br: number | null; inverted: boolean }) {
  const pos = (x: number) => `${max > min ? ((x - min) / (max - min)) * 100 : 50}%`
  return (
    <span className={`relative mt-2 block h-1 w-full rounded-full ${inverted ? 'bg-on-ink/20' : 'bg-chip'}`} aria-hidden>
      {br != null && <span className={`absolute -top-1 h-3 w-px ${inverted ? 'bg-on-ink/70' : 'bg-ink-3'}`} style={{ left: pos(br) }} />}
      {v != null && (
        <span
          className={`absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${inverted ? 'border-ink bg-on-ink' : 'border-on-ink bg-ink'}`}
          style={{ left: pos(v) }}
        />
      )}
    </span>
  )
}
