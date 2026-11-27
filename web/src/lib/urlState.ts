import { useCallback, useEffect, useState } from 'react'

interface ViewState {
  indicator: string | null
  uf: string | null
  mun: string | null
  period: string | null
  compare: string[] | null
}

function read(): ViewState {
  const q = new URLSearchParams(window.location.search)
  const cmp = q.get('cmp')
  return {
    indicator: q.get('i'),
    uf: q.get('uf'),
    mun: q.get('mun'),
    period: q.get('p'),
    compare: cmp === null ? null : cmp.split(',').filter(Boolean),
  }
}

function write(s: ViewState) {
  const q = new URLSearchParams()
  if (s.indicator) q.set('i', s.indicator)
  if (s.uf) q.set('uf', s.uf)
  if (s.mun) q.set('mun', s.mun)
  if (s.period) q.set('p', s.period)
  if (s.compare) q.set('cmp', s.compare.join(','))
  const qs = q.toString()
  window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
}

/** View state mirrored in the query string so any view can be shared as a link. */
export function useViewState() {
  const [state, setState] = useState<ViewState>(read)
  useEffect(() => write(state), [state])
  const update = useCallback((patch: Partial<ViewState>) => setState((s) => ({ ...s, ...patch })), [])
  return [state, update] as const
}
