import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { apiGet, qs, unwrap, useApi } from './lib/api'
import { ThemeScope, Ticker } from './components/broadcast'
import { ClubCrest } from './components/media'
import { Icon, Loader } from './components/ui'
import ErrorBoundary from './components/ErrorBoundary'

const NAV = [
  { to: '/', label: 'Universes', icon: 'public', end: true },
  { to: '/career', label: 'Legacy', icon: 'military_tech' },
  { to: '/stats', label: 'Stats', icon: 'leaderboard' },
  { to: '/players', label: 'Players', icon: 'directions_run' },
  { to: '/clubs', label: 'Clubs', icon: 'shield' },
  { to: '/transfers', label: 'Transfers', icon: 'swap_horiz' },
  { to: '/timeline', label: 'Timeline', icon: 'history' },
]

function readStoredCareerId() {
  try {
    return localStorage.getItem('active_career_id')
  } catch {
    return null
  }
}

function storeCareerId(id) {
  try {
    localStorage.setItem('active_career_id', id)
  } catch {
    // storage unavailable (private mode) — selection just won't persist
  }
}

function Scoreboard({ career, summary }) {
  const rec = summary?.record
  return (
    <div className="flex min-w-0 items-stretch overflow-hidden rounded-lg ring-1 ring-white/15">
      <div className="flex items-center gap-2 bg-club-1 px-3 text-club-ink">
        <ClubCrest club={career.team} gameId={career.team_id} name={career.team_name} className="h-7 w-7" />
        <span className="hidden truncate font-head text-lg font-black uppercase italic sm:inline">{career.team_name}</span>
      </div>
      <div className="flex items-center gap-3 bg-black/70 px-3 font-display text-lg tabular-nums">
        <span className="text-chalk-dim">{career.current_season}</span>
        {rec && (
          <span className="hidden items-center gap-1 md:flex" title="Current season record (all competitions)">
            <span className="text-pitch">{rec.wins}W</span>
            <span className="text-flood">{rec.draws}D</span>
            <span className="text-derby">{rec.losses}L</span>
          </span>
        )}
      </div>
    </div>
  )
}

function CareerSwitcher({ careers, career, onSelect }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg bg-night-700 px-3 py-2 font-head text-sm font-bold uppercase ring-1 ring-white/10 hover:bg-night-600"
      >
        <Icon name="swap_vert" className="text-lg text-flood" />
        <span className="hidden sm:inline">Switch</span>
      </button>
      {open && (
        <ul role="listbox" aria-label="Choose career" className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border-2 border-flood bg-night-800 shadow-2xl">
          <li className="hazard h-2" aria-hidden="true" />
          {careers.map((c) => (
            <li key={c.id} role="option" aria-selected={c.id === career?.id}>
              <button
                type="button"
                onClick={() => { onSelect(c); setOpen(false) }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5 ${c.id === career?.id ? 'bg-white/10' : ''}`}
              >
                <ClubCrest club={c.team} gameId={c.team_id} name={c.team_name} className="h-8 w-8" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-head text-lg font-extrabold uppercase italic leading-tight">{c.name}</span>
                  <span className="block truncate text-xs text-chalk-dim">
                    {c.manager_name} · {c.team_name}{c.save_exists === false ? ' · save deleted' : ''}
                  </span>
                </span>
                {c.is_preserved && <Icon name="all_inclusive" className="text-flood" />}
                {c.id === career?.id && <Icon name="check_circle" fill className="text-pitch" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Layout() {
  const [careers, setCareers] = useState(null)
  const [career, setCareer] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [importing, setImporting] = useState(null)
  const [summaryVersion, setSummaryVersion] = useState(0)
  const location = useLocation()

  const refreshCareers = useCallback((selectId = null) => {
    return apiGet('/careers')
      .then((body) => {
        const list = body.data || []
        setCareers(list)
        const wanted = selectId ?? readStoredCareerId()
        const active = list.find((c) => String(c.id) === String(wanted)) || list[0] || null
        setCareer(active)
        if (active) storeCareerId(active.id)
        setSummaryVersion((v) => v + 1)
        setLoadError(null)
      })
      .catch(setLoadError)
  }, [])

  useEffect(() => { refreshCareers() }, [refreshCareers])

  const selectCareer = (c) => {
    setCareer(c)
    storeCareerId(c.id)
  }

  const summary = useApi(career ? `/careers/${career.id}/summary?v=${summaryVersion}` : null, { select: unwrap })
  const headlines = useApi(career ? `/careers/${career.id}/timeline${qs({ limit: 12, event_type: ['trophy', 'transfer', 'award', 'season_review', 'manager_move'] })}&v=${summaryVersion}` : null)

  if (!careers && !loadError) {
    return (
      <div className="stripes-loud flex min-h-screen items-center justify-center">
        <div className="panel px-10 py-6"><Loader label="Floodlights on" /></div>
      </div>
    )
  }

  const tickerItems = (headlines.data || []).map((e) => e.description)

  return (
    <ThemeScope club={career?.team} className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-flood focus:px-4 focus:py-2 focus:text-night">Skip to content</a>

      {/* Left rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/10 bg-night-800/95 lg:flex">
        <div className="stripes h-2 shrink-0" aria-hidden="true" />
        <NavLink to="/" className="flex items-center gap-3 px-5 py-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-chalk text-night shadow-[0_0_0_4px_rgb(var(--club-1))]">
            <Icon name="sports_soccer" fill className="text-3xl" />
          </span>
          <span className="font-display text-2xl uppercase leading-none">FC<br /><span className="text-club-1">Universe</span></span>
        </NavLink>

        <nav aria-label="Main" className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 overflow-hidden rounded-lg px-4 py-3 font-head text-lg font-extrabold uppercase italic transition ${
                  isActive ? 'bg-club-1 text-club-ink shadow-lg' : 'text-chalk-dim hover:bg-white/5 hover:text-chalk'
                }`
              }
            >
              <Icon name={n.icon} className="text-2xl" />
              {n.label}
            </NavLink>
          ))}
        </nav>

        {career && (
          <div className="m-3 overflow-hidden rounded-xl border border-white/10">
            <div className="stripes h-16 opacity-90" aria-hidden="true" />
            <div className="-mt-8 flex flex-col items-center bg-night-800 px-4 pb-4">
              <ClubCrest club={career.team} gameId={career.team_id} name={career.team_name} className="-mt-2 h-16 w-16" />
              <div className="mt-2 text-center font-head text-xl font-black uppercase italic leading-tight">{career.team_name}</div>
              <div className="label mt-1 text-center">Gaffer · {career.manager_name}</div>
            </div>
          </div>
        )}
      </aside>

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-white/10 bg-night/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
            <NavLink to="/" className="flex items-center gap-2 lg:hidden" aria-label="FC Universe home">
              <Icon name="sports_soccer" fill className="text-3xl text-club-1" />
            </NavLink>
            {career ? <Scoreboard career={career} summary={summary.data} /> : <span className="font-head text-xl font-black uppercase italic">No universe yet</span>}
            <div className="ml-auto flex items-center gap-2">
              {importing && (
                <span className="hidden items-center gap-2 rounded-lg bg-flood px-3 py-2 font-head text-sm font-black uppercase text-night md:flex" role="status">
                  <Icon name="sync" className="animate-spin text-lg" /> {importing}
                </span>
              )}
              {careers?.length > 0 && <CareerSwitcher careers={careers} career={career} onSelect={selectCareer} />}
            </div>
          </div>
          {importing && <div className="h-1 overflow-hidden bg-night-700"><div className="h-full w-1/3 animate-sweep bg-flood" /></div>}
          <Ticker items={tickerItems} />
        </header>

        <main id="main" className="mx-auto max-w-[1440px] px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          {loadError && <div className="mb-6 rounded-lg bg-derby px-4 py-3 font-semibold">Couldn’t reach the backend: {loadError.message}</div>}
          {/* keyed by route so navigating away from a crashed screen recovers */}
          <ErrorBoundary key={location.pathname}>
            <Outlet context={{ career, careers: careers || [], refreshCareers, selectCareer, setImporting, importing }} />
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-7 border-t-2 border-club-1 bg-night-800/95 backdrop-blur lg:hidden">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 font-head text-[0.7rem] font-bold uppercase ${isActive ? 'bg-club-1 text-club-ink' : 'text-chalk-dim'}`}
          >
            <Icon name={n.icon} className="text-2xl" />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </ThemeScope>
  )
}
