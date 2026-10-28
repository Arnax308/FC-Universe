import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useApi } from './lib/api'
import { ThemeScope } from './components/broadcast'
import { ClubCrest } from './components/media'
import { Async, EmptyState, Icon, PageHeader, PillGroup, RatingBadge } from './components/ui'

const BANNER_COLORS = ['bg-flood text-night', 'bg-derby', 'bg-cyan text-night', 'bg-violet', 'bg-pitch text-night', 'bg-tangerine text-night', 'bg-pink text-night']
const TOP_LEAGUES = ['England Premier League', 'Spain Primera División', 'Italy Serie A', 'Germany 1. Bundesliga', 'France Ligue 1']

function ClubTile({ club }) {
  return (
    <ThemeScope club={club}>
      <Link
        to={`/clubs/${club.id}`}
        className="group relative flex h-full flex-col items-center overflow-hidden rounded-xl border-2 border-club-1/50 bg-night-800 p-3 text-center transition hover:-translate-y-1 hover:border-club-1"
      >
        <div className="stripes absolute inset-x-0 top-0 h-10 opacity-80 transition group-hover:h-full group-hover:opacity-20" aria-hidden="true" />
        <ClubCrest club={club} className="relative mt-2 h-16 w-16 transition group-hover:scale-110" />
        <span className="relative mt-2 line-clamp-2 font-head text-base font-extrabold uppercase italic leading-tight">{club.name}</span>
        <span className="relative mt-auto flex items-center gap-1 pt-2">
          <RatingBadge value={club.overall_rating} size="sm" label="Team overall" />
          <span className="text-xs text-chalk-dim">
            <span className="text-derby">A{club.attack_rating ?? '–'}</span> · <span className="text-pitch">M{club.midfield_rating ?? '–'}</span> · <span className="text-cyan">D{club.defense_rating ?? '–'}</span>
          </span>
        </span>
      </Link>
    </ThemeScope>
  )
}

export default function Clubs() {
  const { career } = useOutletContext()
  const state = useApi(career ? `/careers/${career.id}/clubs?limit=3000` : null)
  const [search, setSearch] = useState('')
  const [gender, setGender] = useState('men')

  const grouped = useMemo(() => {
    const term = search.trim().toLowerCase()
    const clubs = (state.data || []).filter((c) =>
      c.league && (gender === 'women') === c.name.endsWith('(W)') && (!term || c.name.toLowerCase().includes(term)))
    const byLeague = {}
    for (const c of clubs) (byLeague[c.league] ||= []).push(c)
    for (const list of Object.values(byLeague)) list.sort((a, b) => (b.overall_rating || 0) - (a.overall_rating || 0))
    const rank = (l) => {
      const i = TOP_LEAGUES.indexOf(l)
      return i === -1 ? 99 : i
    }
    return Object.entries(byLeague).sort(([a, la], [b, lb]) =>
      rank(a) - rank(b) || (lb[0]?.overall_rating || 0) - (la[0]?.overall_rating || 0))
  }, [state.data, search, gender])

  if (!career) return <EmptyState icon="public" title="No universe selected" />

  return (
    <div>
      <PageHeader kicker="Every crest in the universe" title="Clubs" accent="cyan" />
      <div className="panel mb-6 flex flex-wrap items-center gap-3 p-3">
        <PillGroup label="Gender" value={gender} onChange={setGender} options={[
          { value: 'men', label: 'Men', activeClass: 'bg-flood text-night' },
          { value: 'women', label: 'Women', activeClass: 'bg-pink text-night' },
        ]} />
        <label className="relative min-w-[14rem] flex-1 sm:max-w-sm">
          <span className="sr-only">Search clubs</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-chalk-dim" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clubs…" className="w-full rounded-lg bg-night py-2 pl-10 pr-3 ring-1 ring-white/15 placeholder:text-chalk-dim/60" />
        </label>
        {grouped.length > 0 && (
          <nav aria-label="Jump to league" className="scrollbar-none flex w-full gap-1 overflow-x-auto">
            {grouped.slice(0, 12).map(([league], i) => (
              <a key={league} href={`#league-${i}`} className={`shrink-0 rounded px-2 py-1 font-head text-xs font-bold uppercase ${BANNER_COLORS[i % BANNER_COLORS.length]}`}>{league.replace(/^\w+ /, '')}</a>
            ))}
          </nav>
        )}
      </div>

      <Async state={state} loadingLabel="Walking out the tunnel">
        {() => grouped.length === 0 ? (
          <EmptyState icon="shield" title={search ? `No clubs match “${search}”` : 'No clubs'} />
        ) : (
          <div className="space-y-10">
            {grouped.map(([league, clubs], i) => (
              <section key={league} id={`league-${i}`} className="scroll-mt-32">
                <div className="mb-3 flex items-center gap-3">
                  <div className={`skew-plate px-4 py-1 ${BANNER_COLORS[i % BANNER_COLORS.length]}`}>
                    <h2 className="unskew text-2xl">{league}</h2>
                  </div>
                  <span className="label">{clubs.length} clubs</span>
                  <span className="h-1 flex-1 bg-gradient-to-r from-white/20 to-transparent" aria-hidden="true" />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-7">
                  {clubs.map((c) => <ClubTile key={c.id} club={c} />)}
                </div>
              </section>
            ))}
          </div>
        )}
      </Async>
    </div>
  )
}
