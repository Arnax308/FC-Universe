import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { apiGet, qs } from './lib/api'
import { FutCard } from './components/broadcast'
import { EmptyState, ErrorState, Icon, Loader, PageHeader, PillGroup } from './components/ui'

const PAGE = 60
const POSITIONS = ['', 'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST']

export default function Players() {
  const { career } = useOutletContext()
  const [scope, setScope] = useState('mine')
  const [gender, setGender] = useState(0)
  const [position, setPosition] = useState('')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [pages, setPages] = useState(1)
  const [state, setState] = useState({ items: [], loading: true, error: null, done: false })

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  // Any filter change starts again from page 1
  useEffect(() => { setPages(1) }, [career?.id, scope, gender, position, debounced])

  useEffect(() => {
    if (!career) return
    const ctrl = new AbortController()
    setState((s) => ({ ...s, loading: true, error: null }))
    const query = qs({ my_club: scope === 'mine' || null, gender, position, search: debounced, limit: PAGE * pages })
    apiGet(`/careers/${career.id}/players${query}`, { signal: ctrl.signal })
      .then((items) => setState({ items, loading: false, error: null, done: items.length < PAGE * pages }))
      .catch((error) => { if (error.name !== 'AbortError') setState({ items: [], loading: false, error, done: true }) })
    return () => ctrl.abort()
  }, [career, scope, gender, position, debounced, pages])

  if (!career) return <EmptyState icon="public" title="No universe selected">Import or pick a career first.</EmptyState>

  return (
    <div>
      <PageHeader kicker={scope === 'mine' ? `${career.team_name} squad` : 'Every player in the universe'} title={scope === 'mine' ? 'The squad' : 'Player database'} accent="pitch" />

      <div className="panel mb-6 flex flex-col gap-3 p-3 lg:flex-row lg:flex-wrap lg:items-center">
        <PillGroup
          label="Which players"
          value={scope}
          onChange={setScope}
          options={[
            { value: 'mine', label: 'My squad', activeClass: 'bg-club-1 text-club-ink' },
            { value: 'all', label: 'Everyone', activeClass: 'bg-cyan text-night' },
          ]}
        />
        <PillGroup
          label="Gender"
          value={gender}
          onChange={setGender}
          options={[
            { value: 0, label: 'Men', activeClass: 'bg-flood text-night' },
            { value: 1, label: 'Women', activeClass: 'bg-pink text-night' },
          ]}
        />
        <label className="flex items-center gap-2">
          <span className="label">Position</span>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="rounded-lg bg-night px-3 py-2 font-head font-bold uppercase ring-1 ring-white/15"
          >
            {POSITIONS.map((p) => <option key={p} value={p}>{p || 'All'}</option>)}
          </select>
        </label>
        <label className="relative flex-1 lg:max-w-sm">
          <span className="sr-only">Search players</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-chalk-dim" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="w-full rounded-lg bg-night py-2 pl-10 pr-3 ring-1 ring-white/15 placeholder:text-chalk-dim/60"
          />
        </label>
      </div>

      {state.error ? <ErrorState error={state.error} /> : state.loading && !state.items.length ? <Loader label="Scouting" /> : state.items.length === 0 ? (
        <EmptyState icon="person_search" title="No players found">Try another position, name or switch to “Everyone”.</EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
            {state.items.map((p, i) => (
              <div key={p.id} className="animate-rise" style={{ animationDelay: `${Math.min(i % PAGE, 20) * 25}ms` }}>
                <FutCard player={p} to={`/players/${p.id}`} />
              </div>
            ))}
          </div>
          {!state.done && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                disabled={state.loading}
                onClick={() => setPages((n) => n + 1)}
                className="skew-plate bg-flood px-8 py-3 text-night disabled:opacity-60"
              >
                <span className="unskew block font-head text-xl font-black uppercase italic">{state.loading ? 'Loading…' : 'Load more'}</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
