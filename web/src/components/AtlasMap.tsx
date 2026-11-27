import { geoMercator, geoPath } from 'd3-geo'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Geo } from '../lib/data'
import { inkOn, NO_DATA } from '../lib/scale'
import type { Uf } from '../lib/types'

// Drawing space; the viewBox widens around it to fit the container.
const S = 1000
const FLY = 'transform 750ms cubic-bezier(0.16, 1, 0.3, 1)'
// Too small for an inline label: drawn in a side column with a leader line.
const CALLOUTS = ['CE', 'RN', 'PB', 'PE', 'AL', 'SE', 'ES', 'RJ']
// GO and DF labels would overlap at their centroids.
const ANCHOR: Record<string, 'start' | 'end'> = { GO: 'end', DF: 'start' }

export interface Tip {
  title: string
  value: string
  sub?: string
  color: string
}

interface Props {
  ufGeo: Geo
  ufs: Uf[]
  munUf: Geo | null
  uf: Uf | null
  mun: string | null
  ufColor: (sigla: string) => string
  /** null for indicators without municipal data (municípios take the state color). */
  munColor: ((code: string) => string) | null
  ufLabel: (sigla: string) => string
  cities: { code: string; name: string }[]
  tip: (kind: 'uf' | 'mun', id: string) => Tip | null
  onUf: (sigla: string | null) => void
  onMun: (code: string | null) => void
}

export function AtlasMap({ ufGeo, ufs, munUf, uf, mun, ufColor, munColor, ufLabel, cities, tip, onUf, onMun }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 800, h: 700 })
  const [hover, setHover] = useState<{ kind: 'uf' | 'mun'; id: string; x: number; y: number } | null>(null)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const path = useMemo(() => {
    const projection = geoMercator().fitExtent(
      [
        [24, 24],
        [S - 24, S - 24],
      ],
      ufGeo,
    )
    return geoPath(projection)
  }, [ufGeo])

  const ufById = useMemo(() => new Map(ufs.map((u) => [u.id, u])), [ufs])
  const ufShapes = useMemo(
    () =>
      ufGeo.features.map((f) => {
        const u = ufById.get(String(f.properties.codarea))!
        return { uf: u, d: path(f) ?? '', c: path.centroid(f), b: path.bounds(f) }
      }),
    [ufGeo, path, ufById],
  )
  const ufBorders = useMemo(() => ufShapes.map((s) => s.d).join(' '), [ufShapes])
  const munUfShapes = useMemo(
    () =>
      munUf?.features.map((f) => ({
        code: String(f.properties.codarea),
        d: path(f) ?? '',
        c: path.centroid(f),
        b: path.bounds(f),
      })) ?? [],
    [munUf, path],
  )

  // viewBox wraps the square drawing space to the container's aspect ratio.
  const aspect = size.w / Math.max(size.h, 1)
  const vbW = aspect >= 1 ? S * aspect : S
  const vbH = aspect >= 1 ? S : S / aspect
  const vbX = (S - vbW) / 2
  const vbY = (S - vbH) / 2
  const unitsPerPx = vbW / Math.max(size.w, 1)

  const selUf = uf ? ufShapes.find((s) => s.uf.sigla === uf.sigla) : null
  const selMun = mun ? munUfShapes.find((s) => s.code === mun) : null

  const camera = useMemo(() => {
    let [[x0, y0], [x1, y1]] = selMun?.b ?? selUf?.b ?? [
      [24, 24],
      [S - 24 + 150 * unitsPerPx, S - 24], // room for the side labels of small states
    ]
    if (selMun && selUf) {
      // Keep context around a município: never tighter than a third of its state.
      const minW = (selUf.b[1][0] - selUf.b[0][0]) / 3
      const minH = (selUf.b[1][1] - selUf.b[0][1]) / 3
      const cx = (x0 + x1) / 2
      const cy = (y0 + y1) / 2
      const w = Math.max(x1 - x0, minW)
      const h = Math.max(y1 - y0, minH)
      ;[x0, x1, y0, y1] = [cx - w / 2, cx + w / 2, cy - h / 2, cy + h / 2]
    }
    const fit = uf ? 0.84 : 0.94
    const k = Math.min((vbW * fit) / (x1 - x0), (vbH * fit) / (y1 - y0)) * zoom
    const cx = (x0 + x1) / 2
    const cy = (y0 + y1) / 2
    return { k, tx: vbX + vbW / 2 - k * cx, ty: vbY + vbH / 2 - k * cy }
  }, [selUf, selMun, uf, vbW, vbH, vbX, vbY, zoom, unitsPerPx])

  useEffect(() => setZoom(1), [uf?.sigla, mun])

  // Labels keep a constant on-screen size: counter-scale by the camera and the viewBox scale.
  const labelScale = unitsPerPx / camera.k
  const shownCities = useMemo(() => {
    const placed: { x: number; y: number; w: number }[] = []
    const out: { code: string; name: string; c: [number, number] }[] = []
    const ordered = [...cities].sort((a, b) => (a.code === mun ? -1 : b.code === mun ? 1 : 0))
    for (const city of ordered) {
      const shape = munUfShapes.find((m) => m.code === city.code)
      if (!shape) continue
      const x = (shape.c[0] * camera.k) / unitsPerPx
      const y = (shape.c[1] * camera.k) / unitsPerPx
      const w = city.name.length * 6.6 + 26
      if (city.code !== mun && placed.some((p) => Math.abs(p.y - y) < 22 && x < p.x + p.w && p.x < x + w)) continue
      placed.push({ x, y, w })
      out.push({ ...city, c: shape.c as [number, number] })
    }
    return out
  }, [cities, munUfShapes, camera.k, unitsPerPx, mun])
  const level = mun ? 'mun' : uf ? 'uf' : 'br'

  const calloutY = useMemo(() => {
    const items = ufShapes.filter((s) => CALLOUTS.includes(s.uf.sigla)).sort((a, b) => a.c[1] - b.c[1])
    const gap = 34 * unitsPerPx
    let last = -Infinity
    return new Map(
      items.map((s) => {
        const y = Math.max(s.c[1], last + gap)
        last = y
        return [s.uf.sigla, y]
      }),
    )
  }, [ufShapes, unitsPerPx])
  const calloutX = Math.max(...ufShapes.map((s) => s.b[1][0])) + 46 * unitsPerPx

  // Interior labels: larger states keep their spot; a colliding label slides up or down (in screen px).
  const labelPos = useMemo(() => {
    const px = unitsPerPx / camera.k
    const placed: { x0: number; x1: number; y: number }[] = []
    const out = new Map<string, [number, number]>()
    const order = [...ufShapes].filter((s) => !CALLOUTS.includes(s.uf.sigla)).sort((a, b) => (b.b[1][0] - b.b[0][0]) * (b.b[1][1] - b.b[0][1]) - (a.b[1][0] - a.b[0][0]) * (a.b[1][1] - a.b[0][1]))
    for (const s of order) {
      const w = (36 + ufLabel(s.uf.sigla).length * 6.6) * px
      const a = (ANCHOR[s.uf.sigla] as 'start' | 'end' | undefined) ?? 'middle'
      const x0 = a === 'middle' ? s.c[0] - w / 2 : a === 'end' ? s.c[0] - w - 4 * px : s.c[0] + 4 * px
      let y = s.c[1]
      for (const dy of [0, 24, -24, 48, -48]) {
        const yy = s.c[1] + dy * px
        if (!placed.some((p) => Math.abs(p.y - yy) < 23 * px && x0 < p.x1 && p.x0 < x0 + w)) {
          y = yy
          break
        }
      }
      placed.push({ x0, x1: x0 + w, y })
      out.set(s.uf.sigla, [s.c[0], y])
    }
    return out
  }, [ufShapes, ufLabel, unitsPerPx, camera.k])

  const pick = (target: EventTarget | null) => {
    const el = (target as Element | null)?.closest?.('[data-k]') as HTMLElement | SVGElement | null
    if (!el) return null
    const [kind, id] = (el.getAttribute('data-k') ?? '').split(':')
    return { kind: kind as 'uf' | 'mun', id }
  }

  const onMove = (e: React.PointerEvent) => {
    const p = pick(e.target)
    const r = box.current!.getBoundingClientRect()
    if (!p) return setHover(null)
    setHover({ kind: p.kind, id: p.id, x: e.clientX - r.left, y: e.clientY - r.top })
  }

  const onClick = (e: React.MouseEvent) => {
    const p = pick(e.target)
    if (!p) return
    if (p.kind === 'uf') return onUf(p.id === uf?.sigla && !mun ? null : p.id)
    if (p.kind === 'mun') return onMun(p.id === mun ? null : p.id)
  }

  const hoverTip = hover ? tip(hover.kind, hover.id) : null
  const hoverD =
    hover?.kind === 'uf'
      ? ufShapes.find((s) => s.uf.sigla === hover.id)?.d
      : hover
        ? munUfShapes.find((s) => s.code === hover.id)?.d
        : undefined
  const flip = hover ? hover.x > size.w * 0.62 : false
  const fillOf = (c: string) => (c === NO_DATA ? 'url(#nd)' : c)
  const dimmed = !!uf

  return (
    <div ref={box} className="relative h-full min-h-[22rem] w-full overflow-hidden" onPointerLeave={() => setHover(null)}>
      <svg
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        className="absolute inset-0 h-full w-full touch-manipulation select-none"
        onPointerMove={onMove}
        onClick={onClick}
        role="img"
        aria-label={
          level === 'br'
            ? 'Mapa do Brasil. Clique em um estado para ver seus municípios.'
            : `Mapa de ${uf?.nome}. Clique em um município para ver seus dados.`
        }
      >
        <defs>
          <pattern id="nd" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--color-chip)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-line-2)" strokeWidth="2" />
          </pattern>
        </defs>
        <g style={{ transform: `translate(${camera.tx}px, ${camera.ty}px) scale(${camera.k})`, transformOrigin: '0 0', transition: FLY }}>
          <g
            style={{
              transition: 'opacity 400ms, filter 400ms',
              opacity: dimmed ? 0.45 : 1,
              filter: dimmed ? 'saturate(0.15)' : 'none',
            }}
          >
            {ufShapes.map((s) => (
              <path key={s.uf.sigla} d={s.d} fill={fillOf(ufColor(s.uf.sigla))} data-k={`uf:${s.uf.sigla}`} className="cursor-pointer" />
            ))}
            {dimmed && ufShapes.map((s) => s.uf.sigla !== uf?.sigla && <path key={s.uf.sigla} d={s.d} fill="transparent" data-k={`uf:${s.uf.sigla}`} className="cursor-pointer" />)}
          </g>

          {uf && munUfShapes.length > 0 && (
            <g
              className="animate-[fadein_400ms_ease-out]"
              style={{ transition: 'opacity 400ms, filter 400ms', opacity: mun ? 0.6 : 1, filter: mun ? 'saturate(0.3)' : 'none' }}
            >
              {munUfShapes.map((s) => (
                <path
                  key={s.code}
                  d={s.d}
                  fill={fillOf(munColor ? munColor(s.code) : ufColor(uf.sigla))}
                  stroke="var(--color-panel)"
                  strokeWidth={munColor ? 0.5 : 0.8}
                  strokeOpacity={munColor ? 0.7 : 0.9}
                  vectorEffect="non-scaling-stroke"
                  data-k={`mun:${s.code}`}
                  className="cursor-pointer"
                />
              ))}
            </g>
          )}

          <path d={ufBorders} fill="none" stroke="var(--color-panel)" strokeWidth={1.4} vectorEffect="non-scaling-stroke" pointerEvents="none" />
          {selUf && (
            <path d={selUf.d} fill="none" stroke="var(--color-ink)" strokeWidth={1.6} vectorEffect="non-scaling-stroke" pointerEvents="none" />
          )}
          {selMun && uf && (
            <path d={selMun.d} fill={fillOf(munColor ? munColor(selMun.code) : ufColor(uf.sigla))} data-k={`mun:${selMun.code}`} />
          )}
          {selMun && (
            <path d={selMun.d} fill="none" stroke="var(--color-ink)" strokeWidth={2.6} strokeLinejoin="round" vectorEffect="non-scaling-stroke" pointerEvents="none" />
          )}
          {hoverD && (
            <path d={hoverD} fill="none" stroke="var(--color-ink)" strokeWidth={1.4} vectorEffect="non-scaling-stroke" pointerEvents="none" />
          )}

          {level === 'br' &&
            ufShapes.map((s) => {
              const callout = CALLOUTS.includes(s.uf.sigla)
              const x = callout ? calloutX : s.c[0]
              const y = callout ? calloutY.get(s.uf.sigla)! : (labelPos.get(s.uf.sigla)?.[1] ?? s.c[1])
              return (
                <g key={s.uf.sigla} pointerEvents="none">
                  {!callout && y !== s.c[1] && (
                    <line x1={s.c[0]} y1={s.c[1]} x2={x} y2={y} stroke="var(--color-ink)" strokeOpacity={0.35} strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
                  )}
                  {callout && (
                    <line x1={s.c[0]} y1={s.c[1]} x2={x - 6 * unitsPerPx} y2={y} stroke="var(--color-ink)" strokeOpacity={0.35} strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
                  )}
                  <g style={{ transform: `translate(${x}px, ${y}px) scale(${labelScale})`, transition: FLY }}>
                    <MapLabel sigla={s.uf.sigla} value={ufLabel(s.uf.sigla)} color={ufColor(s.uf.sigla)} anchor={callout ? 'start' : (ANCHOR[s.uf.sigla] ?? 'middle')} />
                  </g>
                </g>
              )
            })}
          {level !== 'br' &&
            shownCities.map((c) => {
              const sel = c.code === mun
              return (
                <g key={c.code} pointerEvents="none" style={{ transform: `translate(${c.c[0]}px, ${c.c[1]}px) scale(${labelScale})`, transition: FLY }}>
                  <circle r={sel ? 0 : 3.5} fill="var(--color-ink)" stroke="var(--color-panel)" strokeWidth={1.5} />
                  <CityLabel name={c.name} selected={sel} />
                </g>
              )
            })}
        </g>
      </svg>

      {hover && hoverTip && (
        <div
          className="pointer-events-none absolute z-20 w-max max-w-64 rounded-xl bg-ink px-3 py-2 text-on-ink shadow-[0_10px_30px_-10px_rgba(11,31,74,0.6)]"
          style={{ left: hover.x, top: hover.y, transform: `translate(${flip ? 'calc(-100% - 16px)' : '16px'}, -50%)` }}
          role="status"
        >
          <div className="text-sm font-semibold">{hoverTip.title}</div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="size-2.5 rounded-sm" style={{ background: hoverTip.color }} />
            <span className="display text-lg leading-tight">{hoverTip.value}</span>
          </div>
          {hoverTip.sub && <div className="text-xs text-on-ink/70">{hoverTip.sub}</div>}
        </div>
      )}

      <div className="absolute bottom-3 right-3 z-10 flex flex-col overflow-hidden rounded-xl bg-panel shadow-[0_4px_14px_-6px_rgba(11,31,74,0.3)]">
        <MapButton label="Aproximar" onClick={() => setZoom((z) => Math.min(z * 1.5, 8))}>
          <Plus className="size-4" />
        </MapButton>
        <MapButton label="Afastar" onClick={() => setZoom((z) => Math.max(z / 1.5, 0.6))}>
          <Minus className="size-4" />
        </MapButton>
        {(uf || zoom !== 1) && (
          <MapButton label="Ver o Brasil inteiro" onClick={() => (zoom !== 1 && !uf ? setZoom(1) : onUf(null))}>
            <RotateCcw className="size-4" />
          </MapButton>
        )}
      </div>
    </div>
  )
}

function MapLabel({ sigla, value, color, anchor }: { sigla: string; value: string; color: string; anchor: 'start' | 'middle' | 'end' }) {
  const w = 36 + value.length * 6.6
  const x = anchor === 'middle' ? -w / 2 : anchor === 'end' ? -w - 4 : 4
  return (
    <g>
      <rect x={x} y={-11} width={w} height={22} rx={6} fill="var(--color-panel)" />
      <rect x={x} y={-11} width={26} height={22} rx={6} fill={color === NO_DATA ? '#c3ccdc' : color} />
      <rect x={x + 20} y={-11} width={6} height={22} fill={color === NO_DATA ? '#c3ccdc' : color} />
      <text x={x + 13} y={4.5} fontSize={11.5} fontWeight={800} fill={inkOn(color === NO_DATA ? '#c3ccdc' : color)} textAnchor="middle" style={{ fontVariationSettings: "'wdth' 88" }}>
        {sigla}
      </text>
      <text x={x + 31} y={4.5} fontSize={12} fontWeight={700} fill="var(--color-ink)" style={{ fontVariantNumeric: 'tabular-nums', fontVariationSettings: "'wdth' 92" }}>
        {value}
      </text>
    </g>
  )
}

function CityLabel({ name, selected }: { name: string; selected: boolean }) {
  const w = name.length * 6.6 + 14
  return (
    <g transform="translate(8, 0)">
      <rect x={0} y={-10} width={w} height={20} rx={10} fill={selected ? 'var(--color-ink)' : 'var(--color-panel)'} fillOpacity={selected ? 1 : 0.92} />
      <text x={7} y={4} fontSize={selected ? 12 : 11} fontWeight={selected ? 700 : 600} fill={selected ? 'var(--color-panel)' : 'var(--color-ink)'}>
        {name}
      </text>
    </g>
  )
}

function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-9 place-items-center border-b border-line text-ink-2 transition-colors last:border-b-0 hover:bg-chip hover:text-ink"
    >
      {children}
    </button>
  )
}
