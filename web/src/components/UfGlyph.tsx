import { geoMercator, geoPath } from 'd3-geo'
import { useMemo } from 'react'
import type { UfGeo } from '../lib/data'

export function UfGlyph({ geo, ufId, size = 40 }: { geo: UfGeo; ufId: string | null; size?: number }) {
  const d = useMemo(() => {
    const f = ufId ? geo.features.find((x) => String(x.properties.codarea) === ufId) : null
    const target = f ?? geo
    const projection = geoMercator().fitExtent(
      [
        [2, 2],
        [size - 2, size - 2],
      ],
      target,
    )
    const path = geoPath(projection)
    return f ? (path(f) ?? '') : geo.features.map((x) => path(x) ?? '').join(' ')
  }, [geo, ufId, size])
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0">
      <path d={d} fill="var(--color-ink)" stroke="var(--color-ink)" strokeWidth={0.4} strokeLinejoin="round" />
    </svg>
  )
}
