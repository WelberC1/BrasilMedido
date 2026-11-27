import { geoArea } from 'd3-geo'
import type { Feature, FeatureCollection, Geometry, Polygon } from 'geojson'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import type { Catalog, IndicatorData, MunicipalData, Municipio, Uf } from './types'

const base = import.meta.env.BASE_URL

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(base + path)
  if (!res.ok) throw new Error(`Falha ao carregar ${path} (HTTP ${res.status})`)
  return (await res.json()) as T
}

export type Geo = FeatureCollection<Geometry, { codarea: string }>
export type UfGeo = Geo

// IBGE meshes use planar winding; d3-geo reads them as "the whole globe except this polygon".
// Reverse any polygon that claims more than half the sphere.
function rewind(geo: Geo): Geo {
  const fixPolygon = (rings: Polygon['coordinates']) => {
    const area = geoArea({ type: 'Polygon', coordinates: rings })
    return area > 2 * Math.PI ? rings.map((r) => [...r].reverse()) : rings
  }
  const features = geo.features.map((f): Feature<Geometry, { codarea: string }> => {
    const g = f.geometry
    if (g.type === 'Polygon') return { ...f, geometry: { ...g, coordinates: fixPolygon(g.coordinates) } }
    if (g.type === 'MultiPolygon') return { ...f, geometry: { ...g, coordinates: g.coordinates.map(fixPolygon) } }
    return f
  })
  return { ...geo, features }
}

export interface StaticData {
  catalog: Catalog
  ufs: Uf[]
  geo: Geo
  municipios: Municipio[]
}

export async function loadStatic(): Promise<StaticData> {
  const [catalog, ufs, geo, municipios] = await Promise.all([
    getJson<Catalog>('data/catalog.json'),
    getJson<Uf[]>('data/ufs.json'),
    getJson<Geo>('geo/uf.json'),
    getJson<Municipio[]>('data/municipios.json'),
  ])
  return { catalog, ufs, geo: rewind(geo), municipios }
}

function cached<T>(load: (key: string) => Promise<T>) {
  const cache = new Map<string, Promise<T>>()
  return (key: string): Promise<T> => {
    let p = cache.get(key)
    if (!p) {
      p = load(key)
      p.catch(() => cache.delete(key))
      cache.set(key, p)
    }
    return p
  }
}

export const loadIndicator = cached((id) => getJson<IndicatorData>(`data/indicators/${id}.json`))
export const loadMunicipal = cached((id) => getJson<MunicipalData>(`data/mun/${id}.json`))

export const loadMunGeo = cached(async (key) => {
  const topo = await getJson<Topology>(`geo/mun/${key}.topo.json`)
  const name = Object.keys(topo.objects)[0]
  return rewind(feature(topo, topo.objects[name]) as unknown as Geo)
})
