import { AlertTriangle, RotateCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AtlasMap, type Tip } from './components/AtlasMap'
import { Breadcrumb } from './components/Breadcrumb'
import { Compare } from './components/Compare'
import { IndicatorPanel, type RankRow } from './components/IndicatorPanel'
import { PlacePanel, type ProfileItem } from './components/PlacePanel'
import { Scoreboard, type Tile } from './components/Scoreboard'
import { Sources } from './components/Sources'
import { Timeline } from './components/Timeline'
import { Github, Linkedin } from './components/icons'
import { REPO_URL, TopBar } from './components/TopBar'

const LINKEDIN_URL = 'https://www.linkedin.com/in/welber-caetano/'
import { loadIndicator, loadMunGeo, loadMunicipal, loadStatic, type Geo, type StaticData } from './lib/data'
import { formatDelta, formatValue } from './lib/format'
import { buildScale, NO_DATA } from './lib/scale'
import { comparableIndex, hasAnyValue, isBetter, latestIndex, rankEntries, valuesAt } from './lib/stats'
import { BR, type Indicator, type IndicatorData, type MunicipalData } from './lib/types'
import { ThemeContext, useThemeState } from './lib/theme'
import { useViewState } from './lib/urlState'

const DEFAULT_INDICATOR = 'desocupacao'
const HEADLINE = [
  { id: 'populacao', label: 'População' },
  { id: 'desocupacao', label: 'Desemprego' },
  { id: 'rendimento-per-capita', label: 'Renda por pessoa' },
  { id: 'analfabetismo', label: 'Não sabem ler' },
  { id: 'esgoto', label: 'Casas com esgoto' },
]
const HEADLINE_MUN = [
  { id: 'populacao-2022', label: 'População' },
  { id: 'alfabetizacao', label: 'Sabem ler' },
  { id: 'esgoto', label: 'Casas com esgoto' },
  { id: 'agua', label: 'Água encanada' },
  { id: 'idade-mediana', label: 'Idade mediana' },
]

// Returns null while a new key is loading, so stale data never shows under a new key.
function useAsync<T>(key: string | null, load: (key: string) => Promise<T>, onError: (e: Error) => void) {
  const [state, setState] = useState<{ key: string; value: T } | null>(null)
  useEffect(() => {
    if (!key) return
    let alive = true
    load(key)
      .then((value) => alive && setState({ key, value }))
      .catch((e: Error) => alive && onError(e))
    return () => {
      alive = false
    }
  }, [key, load, onError])
  return state && state.key === key ? state.value : null
}

export default function App() {
  const [view, setView] = useViewState()
  const { theme, toggle } = useThemeState()
  const [stat, setStat] = useState<StaticData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [headline, setHeadline] = useState<Record<string, IndicatorData>>({})
  const [profileMun, setProfileMun] = useState<Record<string, MunicipalData>>({})
  const fail = useCallback((e: Error) => setError(e.message), [])

  useEffect(() => {
    setError(null)
    loadStatic().then(setStat).catch(fail)
  }, [attempt, fail])

  const indicator = useMemo(() => {
    if (!stat) return null
    const list = stat.catalog.indicators
    return list.find((i) => i.id === view.indicator) ?? list.find((i) => i.id === DEFAULT_INDICATOR) ?? list[0]
  }, [stat, view.indicator])

  const uf = useMemo(() => stat?.ufs.find((u) => u.sigla === view.uf) ?? null, [stat, view.uf])
  const munInfo = useMemo(() => {
    if (!stat || !view.mun || !uf) return null
    const m = stat.municipios.find((x) => x[0] === view.mun)
    return m && m[2] === uf.sigla ? m : null
  }, [stat, view.mun, uf])
  const munCode = munInfo?.[0] ?? null

  const data = useAsync(indicator?.id ?? null, loadIndicator, fail)
  const munData = useAsync(indicator?.municipal ? indicator.id : null, loadMunicipal, fail)
  const munUf = useAsync<Geo>(uf?.id ?? null, loadMunGeo, fail)
  const pop2022 = useAsync(uf ? 'populacao-2022' : null, loadMunicipal, fail)

  // Headline series for the scoreboard, and the município profile files.
  useEffect(() => {
    if (!stat) return
    const municipalIds = stat.catalog.indicators.filter((i) => i.municipal).map((i) => i.id)
    const ids = [...new Set([...HEADLINE, ...HEADLINE_MUN].map((h) => h.id).concat(municipalIds))].filter((id) => stat.catalog.indicators.some((i) => i.id === id))
    Promise.all(ids.map((id) => loadIndicator(id).then((d) => [id, d] as const)))
      .then((pairs) => setHeadline(Object.fromEntries(pairs)))
      .catch(fail)
  }, [stat, fail])
  useEffect(() => {
    if (!stat || !munCode) return
    const ids = stat.catalog.indicators.filter((i) => i.municipal).map((i) => i.id)
    Promise.all([...ids, 'populacao-2022'].map((id) => loadMunicipal(id).then((d) => [id, d] as const)))
      .then((pairs) => setProfileMun(Object.fromEntries(pairs)))
      .catch(fail)
  }, [stat, munCode, fail])

  const ready = !!stat && !!indicator && !!data && data.id === indicator.id
  const index = useMemo(() => {
    if (!ready) return 0
    const i = data.periods.findIndex((p) => p.id === view.period)
    return i >= 0 && hasAnyValue(data, i) ? i : latestIndex(data)
  }, [ready, data, view.period])
  const brValue = ready ? data.series[BR][index] : null

  const ufRanking = useMemo(() => (ready ? rankEntries(valuesAt(data, stat.ufs, index), indicator.polarity) : []), [ready, data, stat, index, indicator])

  const scale = useMemo(() => {
    if (!ready) return null
    if (indicator.municipal && munData && uf) {
      const vals = Object.values(munData.values).filter((v): v is number => v != null)
      return buildScale(vals, brValue, indicator.polarity, theme)
    }
    const vals = ufRanking.map((r) => r.value).filter((v): v is number => v != null)
    return buildScale(vals, brValue, indicator.polarity, theme)
  }, [ready, indicator, munData, ufRanking, brValue, uf, theme])

  const munName = useMemo(() => new Map(stat?.municipios.map((m) => [m[0], m[1]]) ?? []), [stat])

  const munRanking = useMemo(() => {
    if (!uf || !indicator?.municipal || !munData || !stat) return null
    const entries = stat.municipios.filter((m) => m[2] === uf.sigla).map((m) => ({ sigla: m[0], value: munData.values[m[0]] ?? null }))
    return rankEntries(entries, indicator.polarity)
  }, [uf, indicator, munData, stat])

  const cities = useMemo(() => {
    if (!uf || !pop2022 || !stat) return []
    const inUf = stat.municipios.filter((m) => m[2] === uf.sigla)
    const top = [...inUf].sort((a, b) => (pop2022.values[b[0]] ?? 0) - (pop2022.values[a[0]] ?? 0)).slice(0, 6)
    if (munInfo && !top.some((m) => m[0] === munInfo[0])) top.push(munInfo)
    return top.map((m) => ({ code: m[0], name: m[1] }))
  }, [uf, pop2022, stat, munInfo])

  const selectUf = useCallback((sigla: string | null) => setView({ uf: sigla, mun: null }), [setView])
  const selectMun = useCallback((code: string | null) => setView({ mun: code }), [setView])
  const setPeriod = useCallback((i: number) => data && hasAnyValue(data, i) && setView({ period: data.periods[i].id }), [data, setView])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || (e.target as HTMLElement)?.tagName === 'INPUT') return
      if (view.mun) setView({ mun: null })
      else if (view.uf) setView({ uf: null })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view.mun, view.uf, setView])

  if (error)
    return (
      <Shell>
        <ErrorState message={error} onRetry={() => setAttempt((a) => a + 1)} />
      </Shell>
    )
  if (!stat || !indicator) return <Shell><div className="skeleton mt-4 h-[70vh] w-full" /></Shell>

  const ufColor = (sigla: string) => scale?.color(ufRanking.find((r) => r.sigla === sigla)?.value) ?? NO_DATA
  const munColor = indicator.municipal && munData && scale ? (code: string) => scale.color(munData.values[code]) : null
  const ufLabel = (sigla: string) => formatValue(ufRanking.find((r) => r.sigla === sigla)?.value, indicator)
  const withData = ufRanking.filter((r) => r.rank != null).length
  const period = ready ? data.periods[index] : null

  const tip = (kind: 'uf' | 'mun', id: string): Tip | null => {
    if (kind === 'uf') {
      const u = stat.ufs.find((x) => x.sigla === id)
      const r = ufRanking.find((x) => x.sigla === id)
      if (!u) return null
      return { title: u.nome, value: formatValue(r?.value, indicator), sub: r?.rank ? `${r.rank}º de ${withData} · ${period?.label}` : 'Sem dado', color: ufColor(id) }
    }
    const name = munName.get(id)
    const sigla = stat.ufs.find((u) => u.id === id.slice(0, 2))?.sigla ?? ''
    if (!name) return null
    if (munColor && munData) {
      const pos = sigla === uf?.sigla ? munRanking?.find((r) => r.sigla === id)?.rank : null
      return {
        title: `${name} · ${sigla}`,
        value: formatValue(munData.values[id], indicator),
        sub: pos ? `${pos}º de ${munRanking!.filter((r) => r.rank != null).length} em ${sigla} · Censo 2022` : 'Censo 2022 · clique para abrir',
        color: munColor(id),
      }
    }
    return { title: `${name} · ${sigla}`, value: formatValue(ufRanking.find((r) => r.sigla === sigla)?.value, indicator), sub: `Valor do estado (${sigla}): a PNAD não cobre a maioria dos municípios`, color: ufColor(sigla) }
  }

  const placeKey = uf?.sigla ?? BR
  const badgeOf = (def: Indicator | undefined, v: number | null, ref: number | null, suffix: string): Tile['badge'] => {
    if (!def || v == null || ref == null) return null
    const better = isBetter(v, ref, def.polarity)
    return { text: `${formatDelta(v - ref, def)} ${suffix}`, tone: better === true ? 'good' : better === false ? 'bad' : 'flat' }
  }
  const range = (vals: (number | null | undefined)[]) => {
    const xs = vals.filter((x): x is number => x != null)
    return xs.length ? { min: Math.min(...xs), max: Math.max(...xs) } : null
  }
  const shortSource = (def: Indicator) => (def.source.survey.startsWith('PNAD') ? 'PNAD' : def.source.survey.startsWith('Censo') ? 'Censo' : 'IBGE')

  const tiles: Tile[] = munInfo
    ? HEADLINE_MUN.map((h) => {
        const def = stat.catalog.indicators.find((i) => i.id === h.id)
        const v = profileMun[h.id]?.values[munInfo[0]] ?? null
        const br = headline[h.id]?.series[BR][0] ?? null
        const shown = def ?? { ...indicator, unit: 'pessoas' as const, decimals: 0, polarity: 'neutral' as const }
        const ufMuns = stat.municipios.filter((m) => m[2] === uf!.sigla).map((m) => profileMun[h.id]?.values[m[0]])
        const r = def && def.unit !== 'hab/km²' ? range(ufMuns) : null
        return {
          key: h.id,
          label: h.label,
          value: formatValue(v, shown),
          context: def ? `IBGE · Censo 2022` : 'IBGE · Censo 2022',
          badge: def && def.polarity !== 'neutral' ? badgeOf(def, v, br, 'vs BR') : null,
          bar: r ? { ...r, v, br } : null,
          active: def?.id === indicator.id,
          onClick: def ? () => setView({ indicator: def.id }) : undefined,
        }
      })
    : HEADLINE.map((h) => {
        const def = stat.catalog.indicators.find((i) => i.id === h.id)!
        const d = headline[h.id]
        const i = d ? latestIndex(d) : 0
        const v = d?.series[placeKey]?.[i] ?? null
        const br = d?.series[BR][i] ?? null
        const prevI = d ? comparableIndex(d.series[placeKey], i, def.periodicity) : null
        const prev = prevI != null ? d!.series[placeKey][prevI] : null
        const r = d && def.unit !== 'pessoas' ? range(stat.ufs.map((u) => d.series[u.sigla]?.[i])) : null
        return {
          key: h.id,
          label: h.label,
          value: formatValue(v, def),
          context: d ? `${d.periods[i].label}${def.unit === 'R$' ? ', por mês' : ''} · ${shortSource(def)}` : '',
          badge: def.unit === 'pessoas' ? null : uf ? badgeOf(def, v, br, 'vs BR') : badgeOf(def, v, prev, prevI != null && d ? `vs ${d.periods[prevI].label.replace('º tri ', 'T')}` : ''),
          bar: r ? { ...r, v, br } : null,
          active: def.id === indicator.id,
          onClick: () => setView({ indicator: def.id }),
        }
      })

  const rows: RankRow[] = munRanking
    ? munRanking.map((r) => ({ key: r.sigla, name: munName.get(r.sigla) ?? r.sigla, value: r.value, rank: r.rank }))
    : ufRanking.map((r) => ({ key: r.sigla, name: stat.ufs.find((u) => u.sigla === r.sigla)?.nome ?? r.sigla, value: r.value, rank: r.rank }))

  const best = ufRanking.filter((r) => r.rank != null)
  const nameOf = (s: string) => stat.ufs.find((u) => u.sigla === s)?.nome ?? s
  const extremes =
    best.length > 1
      ? {
          best: `${best.filter((r) => r.value === best[0].value).map((r) => nameOf(r.sigla)).join(' e ')} ${formatValue(best[0].value, indicator)}`,
          worst: `${best.filter((r) => r.value === best[best.length - 1].value).map((r) => nameOf(r.sigla)).join(' e ')} ${formatValue(best[best.length - 1].value, indicator)}`,
        }
      : null

  const profile: ProfileItem[] = munInfo
    ? stat.catalog.indicators
        .filter((i) => i.municipal)
        .map((i) => ({
          indicator: i,
          mun: profileMun[i.id]?.values[munInfo[0]] ?? null,
          uf: headline[i.id]?.series[uf!.sigla]?.[0] ?? null,
          br: headline[i.id]?.series[BR][0] ?? null,
        }))
    : []

  const munRank = munInfo && munRanking ? munRanking.find((r) => r.sigla === munInfo[0]) : null

  return (
    <ThemeContext.Provider value={theme}>
    <Shell
      top={
        <TopBar
          categories={stat.catalog.categories}
          categoryId={indicator.categoryId}
          onCategory={(id) => setView({ indicator: stat.catalog.indicators.find((i) => i.categoryId === id)!.id })}
          municipios={stat.municipios}
          ufs={stat.ufs}
          onPick={(ufSigla, mun) => setView({ uf: ufSigla, mun })}
          theme={theme}
          onTheme={toggle}
        />
      }
    >
      <Scoreboard place={munInfo?.[1] ?? uf?.nome ?? 'Brasil'} tiles={tiles} loading={Object.keys(headline).length === 0} />

      <div className="mt-3 grid gap-3 lg:h-[calc(100dvh-13rem)] lg:min-h-[36rem] lg:grid-cols-[19rem_minmax(0,1fr)_20rem] xl:grid-cols-[21rem_minmax(0,1fr)_22rem]">
        <div className="order-3 flex min-h-0 lg:order-none">
          <IndicatorPanel
            options={stat.catalog.indicators.filter((i) => i.categoryId === indicator.categoryId)}
            indicator={indicator}
            onIndicator={(id) => setView({ indicator: id })}
            scale={scale}
            brValue={brValue}
            rows={rows}
            rowsTitle={munRanking ? `Municípios de ${uf!.nome}` : `Estados · ${period?.label ?? ''}`}
            selected={munRanking ? munCode : view.uf}
            onRow={(k) => (munRanking ? selectMun(k === munCode ? null : k) : selectUf(k === view.uf ? null : k))}
            hasMissing={rows.some((r) => r.value == null)}
          />
        </div>

        <section className="order-1 flex min-h-0 flex-col gap-3 lg:order-none" aria-label="Mapa">
          <div className="panel relative min-h-[24rem] flex-1 overflow-hidden max-lg:h-[64vh]">
            <div className="absolute left-3 top-3 z-10">
              <Breadcrumb uf={uf} munName={munInfo?.[1] ?? null} onBrasil={() => selectUf(null)} onUf={() => selectMun(null)} />
            </div>
            {ready && scale ? (
              <AtlasMap
                ufGeo={stat.geo}
                ufs={stat.ufs}
                munUf={munUf}
                uf={uf}
                mun={munCode}
                ufColor={ufColor}
                munColor={munColor}
                ufLabel={ufLabel}
                cities={cities}
                tip={tip}
                onUf={selectUf}
                onMun={selectMun}
              />
            ) : (
              <div className="skeleton absolute inset-6" />
            )}
          </div>
          {ready && <Timeline data={data} index={index} onIndex={setPeriod} />}
        </section>

        <div className="order-2 flex min-h-0 lg:order-none">
          <PlacePanel
            geo={stat.geo}
            indicator={indicator}
            data={ready ? data : null}
            index={index}
            uf={uf}
            ufRank={uf ? (ufRanking.find((r) => r.sigla === uf.sigla)?.rank ?? null) : null}
            rankOf={withData}
            extremes={extremes}
            mun={
              munInfo
                ? {
                    code: munInfo[0],
                    name: munInfo[1],
                    pop: profileMun['populacao-2022']?.values[munInfo[0]] ?? pop2022?.values[munInfo[0]] ?? null,
                    value: munData?.values[munInfo[0]] ?? null,
                    rank: munRank?.rank ?? null,
                    of: munRanking?.filter((r) => r.rank != null).length ?? 0,
                  }
                : null
            }
            profile={profile}
            onBrasil={() => selectUf(null)}
            onUf={() => selectMun(null)}
            onPeriod={setPeriod}
            extremesBars={
              ready && data.periods.length === 1 && scale
                ? [best.slice(0, 5), best.slice(-5).reverse()].map((g) =>
                    g.map((r) => ({ key: r.sigla, name: nameOf(r.sigla), value: r.value, color: scale.color(r.value) })),
                  )
                : null
            }
          />
        </div>
      </div>

      {ready && (
        <section className="panel mt-3 p-5 sm:p-7">
          <Compare
            indicator={indicator}
            data={data}
            index={index}
            ufs={stat.ufs}
            ranking={ufRanking}
            chosen={view.compare}
            onChange={(list) => setView({ compare: list })}
          />
        </section>
      )}
      <section className="panel mt-3 p-5 sm:p-7">
        <Sources catalog={stat.catalog} />
      </section>
    </Shell>
    </ThemeContext.Provider>
  )
}

function Shell({ children, top }: { children: React.ReactNode; top?: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      {top}
      <main className="mx-auto w-full max-w-[110rem] flex-1 px-3 py-3 sm:px-5">{children}</main>
      <footer className="mx-auto w-full max-w-[110rem] px-3 pb-6 pt-2 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line pt-4 text-sm text-ink-3">
          <p className="max-w-2xl leading-relaxed">
            Site gratuito e de uso livre. Os dados são públicos, do{' '}
            <a href="https://sidra.ibge.gov.br" className="font-semibold text-ink-2 underline hover:text-ink" target="_blank" rel="noreferrer">
              IBGE
            </a>
            , e podem ser reutilizados citando a fonte. Projeto independente, sem vínculo com o IBGE.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-ink-2">
              Desenvolvido por <strong className="font-semibold text-ink">Welber Caetano</strong>
            </span>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Welber Caetano no LinkedIn"
              title="LinkedIn"
              className="grid size-9 place-items-center rounded-full bg-panel text-ink-2 ring-1 ring-line transition-colors hover:text-good"
            >
              <Linkedin className="size-4" />
            </a>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Código-fonte do Brasil Medido no GitHub"
              title="Código-fonte no GitHub"
              className="grid size-9 place-items-center rounded-full bg-panel text-ink-2 ring-1 ring-line transition-colors hover:text-ink"
            >
              <Github className="size-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="panel mx-auto mt-10 max-w-lg p-8 text-center">
      <AlertTriangle className="mx-auto size-6 text-caution" aria-hidden />
      <h1 className="mt-3 text-xl font-extrabold">Não foi possível carregar os dados</h1>
      <p className="mt-2 text-sm text-ink-2">{message}. Verifique sua conexão e tente de novo.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-on-ink transition-transform hover:scale-[1.02]"
      >
        <RotateCw className="size-4" aria-hidden />
        Tentar de novo
      </button>
    </div>
  )
}
