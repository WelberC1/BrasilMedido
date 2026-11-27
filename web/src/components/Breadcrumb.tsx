import { ChevronRight } from 'lucide-react'
import type { Uf } from '../lib/types'

export function Breadcrumb({ uf, munName, onBrasil, onUf }: { uf: Uf | null; munName: string | null; onBrasil: () => void; onUf: () => void }) {
  const crumb = 'rounded-full px-2.5 py-1 transition-colors hover:bg-chip'
  return (
    <nav aria-label="Você está em" className="panel inline-flex items-center gap-0.5 px-1.5 py-1 text-sm">
      <button type="button" onClick={onBrasil} className={`${crumb} ${!uf ? 'font-bold text-ink' : 'font-medium text-ink-2'}`} aria-current={!uf ? 'page' : undefined}>
        Brasil
      </button>
      {uf && (
        <>
          <ChevronRight className="size-3.5 text-ink-3" aria-hidden />
          <button type="button" onClick={onUf} className={`${crumb} ${!munName ? 'font-bold text-ink' : 'font-medium text-ink-2'}`} aria-current={!munName ? 'page' : undefined}>
            {uf.nome}
          </button>
        </>
      )}
      {munName && (
        <>
          <ChevronRight className="size-3.5 text-ink-3" aria-hidden />
          <span className="px-2.5 py-1 font-bold text-ink" aria-current="page">
            {munName}
          </span>
        </>
      )}
    </nav>
  )
}
