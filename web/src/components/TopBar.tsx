import { Check, Link2, Moon, Search, Sun, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type { Category, Municipio, Uf } from '../lib/types'
import { BRASILIA_32, BRAZIL_OUTLINE_32 } from './brazilOutline'
import { Github } from './icons'

export const REPO_URL = 'https://github.com/WelberC1/BrasilMedido'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

interface Props {
  categories: Category[]
  categoryId: string
  onCategory: (id: string) => void
  municipios: Municipio[]
  ufs: Uf[]
  onPick: (uf: string, mun: string | null) => void
  theme: 'light' | 'dark'
  onTheme: () => void
}

export function TopBar({ categories, categoryId, onCategory, municipios, ufs, onPick, theme, onTheme }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ground/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[110rem] flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 sm:px-5">
        <a href="./" className="inline-flex items-center gap-2" aria-label="Brasil Medido, página inicial">
          <Mark />
          <span className="text-[1.2rem] leading-none tracking-[-0.015em]" style={{ fontVariationSettings: "'wdth' 112" }}>
            <span className="font-extrabold text-ink">Brasil</span>
            <span className="font-semibold text-good"> Medido</span>
          </span>
        </a>

        <nav aria-label="Categorias" className="order-3 -mx-3 w-[calc(100%+1.5rem)] overflow-x-auto px-3 lg:order-none lg:mx-0 lg:w-auto lg:px-0 [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-1 rounded-full bg-panel p-1 shadow-[0_1px_2px_rgba(11,31,74,0.06)]">
            {categories.map((c) => {
              const on = c.id === categoryId
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onCategory(c.id)}
                  className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors duration-200 ${
                    on ? 'bg-ink text-on-ink' : 'text-ink-2 hover:bg-chip hover:text-ink'
                  }`}
                >
                  {c.name}
                </button>
              )
            })}
          </div>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <PlaceSearch municipios={municipios} ufs={ufs} onPick={onPick} />
          <ShareButton />
          <button
            type="button"
            onClick={onTheme}
            aria-label={theme === 'dark' ? 'Usar modo claro' : 'Usar modo noturno'}
            title={theme === 'dark' ? 'Modo claro' : 'Modo noturno'}
            className="grid size-9 place-items-center rounded-full bg-panel text-ink-2 shadow-[0_1px_2px_rgba(11,31,74,0.06)] transition-colors hover:text-ink"
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Código-fonte no GitHub"
            title="Código-fonte no GitHub"
            className="grid size-9 place-items-center rounded-full bg-panel text-ink-2 shadow-[0_1px_2px_rgba(11,31,74,0.06)] transition-colors hover:text-ink"
          >
            <Github className="size-4" />
          </a>
        </div>
      </div>
    </header>
  )
}

function PlaceSearch({ municipios, ufs, onPick }: Pick<Props, 'municipios' | 'ufs' | 'onPick'>) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const index = useMemo(() => municipios.map((m) => ({ m, n: norm(m[1]) })), [municipios])

  const results = useMemo(() => {
    const t = norm(q.trim())
    if (t.length < 2) return []
    const states = ufs
      .filter((u) => norm(u.nome).startsWith(t) || norm(u.sigla) === t)
      .map((u) => ({ key: u.sigla, uf: u.sigla, mun: null as string | null, title: u.nome, sub: 'Estado' }))
    const starts = index.filter((x) => x.n.startsWith(t))
    const contains = index.filter((x) => !x.n.startsWith(t) && x.n.includes(t))
    const muns = [...starts, ...contains].slice(0, 8).map(({ m }) => ({ key: m[0], uf: m[2], mun: m[0], title: m[1], sub: m[2] }))
    return [...states, ...muns].slice(0, 9)
  }, [q, index, ufs])

  const choose = (r: (typeof results)[number]) => {
    onPick(r.uf, r.mun)
    setQ('')
    setOpen(false)
    input.current?.blur()
  }

  return (
    <div className="relative">
      <label className="flex h-9 w-[min(16rem,52vw)] items-center gap-2 rounded-full bg-panel px-3 shadow-[0_1px_2px_rgba(11,31,74,0.06)] focus-within:ring-2 focus-within:ring-good">
        <Search className="size-4 shrink-0 text-ink-3" aria-hidden />
        <span className="sr-only">Buscar estado ou município</span>
        <input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
            setActive(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, results.length - 1))
            if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0))
            if (e.key === 'Enter' && results[active]) choose(results[active])
            if (e.key === 'Escape') setQ('')
          }}
          placeholder="Buscar cidade ou estado"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="place-results"
          aria-autocomplete="list"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-3 focus:outline-none"
        />
        {q && (
          <button type="button" onClick={() => setQ('')} aria-label="Limpar busca" className="text-ink-3 hover:text-ink">
            <X className="size-3.5" />
          </button>
        )}
      </label>
      {open && results.length > 0 && (
        <ul id="place-results" role="listbox" className="panel absolute right-0 top-11 z-40 w-72 overflow-hidden py-1">
          {results.map((r, i) => (
            <li key={r.key} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(r)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm ${i === active ? 'bg-chip' : ''}`}
              >
                <span className="truncate font-medium text-ink">{r.title}</span>
                <span className="shrink-0 text-xs text-ink-3">{r.sub}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ShareButton() {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href)
          setDone(true)
          setTimeout(() => setDone(false), 1800)
        } catch {
          window.prompt('Copie o link:', window.location.href)
        }
      }}
      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-panel px-3 text-sm font-semibold text-ink-2 shadow-[0_1px_2px_rgba(11,31,74,0.06)] transition-colors hover:text-ink"
    >
      {done ? <Check className="size-4 text-good" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
      <span className="hidden sm:inline">{done ? 'Link copiado' : 'Compartilhar'}</span>
    </button>
  )
}

function Mark() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="7" fill="#1d3fa8" />
      <path d={BRAZIL_OUTLINE_32} fill="#ffffff" />
      <circle cx={BRASILIA_32[0]} cy={BRASILIA_32[1]} r="2" fill="#c9822e" stroke="#1d3fa8" strokeWidth="0.8" />
    </svg>
  )
}
