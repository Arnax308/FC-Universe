import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { qs, useApi } from './lib/api'
import { seasonLabel } from './lib/format'
import { ThemeScope } from './components/broadcast'
import { ClubCrest, PlayerFace } from './components/media'
import { Async, EmptyState, Icon, PageHeader, PillGroup } from './components/ui'

const TYPES = {
  trophy: { label: 'Silverware', icon: 'trophy', color: 'flood', ink: 'text-night' },
  season_review: { label: 'Season review', icon: 'scoreboard', color: 'cyan', ink: 'text-night' },
  transfer: { label: 'Transfer', icon: 'swap_horiz', color: 'tangerine', ink: 'text-night' },
  award: { label: 'Award', icon: 'workspace_premium', color: 'violet', ink: 'text-chalk' },
  manager_appointment: { label: 'Dugout', icon: 'sports', color: 'pitch', ink: 'text-night' },
  manager_move: { label: 'Dugout', icon: 'sports', color: 'pitch', ink: 'text-night' },
  retirement: { label: 'Farewell', icon: 'waving_hand', color: 'pink', ink: 'text-night' },
  season_start: { label: 'Kick-off', icon: 'flag', color: 'chalk', ink: 'text-night' },
}

const FILTERS = [
  { value: 'all', label: 'Everything', types: null },
  { value: 'trophy', label: 'Silverware', types: ['trophy'] },
  { value: 'season_review', label: 'Seasons', types: ['season_review', 'season_start'] },
  { value: 'transfer', label: 'Transfers', types: ['transfer'] },
  { value: 'award', label: 'Awards', types: ['award'] },
  { value: 'manager', label: 'Dugout', types: ['manager_appointment', 'manager_move'] },
  { value: 'retirement', label: 'Farewells', types: ['retirement'] },
]

function EventCard({ e }) {
  const t = TYPES[e.event_type] || TYPES.season_start
  const big = e.event_type === 'trophy' || e.event_type === 'season_review'
  const body = (
    <ThemeScope club={e.club}>
      <article className={`group relative overflow-hidden rounded-xl border-l-8 bg-night-800 shadow-lg ring-1 ring-white/10 transition hover:-translate-y-0.5 ${big ? 'p-5' : 'p-4'}`} style={{ borderLeftColor: `rgb(var(--${t.color}))` }}>
        {e.event_type === 'trophy' && <div className="absolute inset-0 bg-[radial-gradient(40rem_10rem_at_0%_0%,rgb(255_230_0/.18),transparent)]" aria-hidden="true" />}
        <div className="relative flex items-start gap-4">
          {e.related_player_game_id ? (
            <PlayerFace gameId={e.related_player_game_id} name="" className="h-12 w-12 shrink-0 rounded-full bg-night-700" />
          ) : e.club ? (
            <ClubCrest club={e.club} className={`${big ? 'h-14 w-14' : 'h-11 w-11'} shrink-0`} />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: `rgb(var(--${t.color}))` }}>
              <Icon name={t.icon} className={`text-2xl ${t.ink}`} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <span className={`chip mb-1 ${t.ink}`} style={{ background: `rgb(var(--${t.color}))` }}>
              <Icon name={t.icon} className="text-base" /> {t.label}
            </span>
            <p className={big ? 'font-head text-xl font-extrabold uppercase italic leading-snug sm:text-2xl' : 'font-medium'}>{e.description}</p>
          </div>
          {(e.related_player_id || e.club) && <Icon name="arrow_forward" className="self-center text-chalk-dim transition group-hover:translate-x-1 group-hover:text-chalk" />}
        </div>
      </article>
    </ThemeScope>
  )
  if (e.related_player_id) return <Link to={`/players/${e.related_player_id}`} className="block">{body}</Link>
  if (e.club) return <Link to={`/clubs/${e.club.id}`} className="block">{body}</Link>
  return body
}

export default function Timeline() {
  const { career } = useOutletContext()
  const [filter, setFilter] = useState('all')
  const [gender, setGender] = useState(0)
  const types = FILTERS.find((f) => f.value === filter)?.types
  const state = useApi(career ? `/careers/${career.id}/timeline${qs({ limit: 400, gender, event_type: types })}` : null)

  if (!career) return <EmptyState icon="public" title="No universe selected" />

  return (
    <div>
      <PageHeader kicker="Every headline, season by season" title="Timeline" accent="violet">
        <p className="max-w-2xl text-chalk-dim">History builds up each time you re-import a save — sync after big moments to capture them.</p>
      </PageHeader>
      <div className="panel mb-8 flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <PillGroup label="Event type" value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ value: f.value, label: f.label }))} />
        <PillGroup label="Gender" value={gender} onChange={setGender} options={[
          { value: 0, label: 'Men', activeClass: 'bg-flood text-night' },
          { value: 1, label: 'Women', activeClass: 'bg-pink text-night' },
        ]} />
      </div>

      <Async state={state} loadingLabel="Rewinding the tapes">
        {(events) => {
          if (!events.length) return <EmptyState icon="history" title="Nothing here yet" />
          const seasons = []
          for (const e of events) {
            const last = seasons[seasons.length - 1]
            if (last && last.year === e.season_year) last.events.push(e)
            else seasons.push({ year: e.season_year, events: [e] })
          }
          return (
            <div className="relative">
              <div className="absolute bottom-0 left-5 top-0 w-1 bg-gradient-to-b from-club-1 via-violet to-transparent md:left-1/2 md:-translate-x-1/2" aria-hidden="true" />
              {seasons.map((s) => (
                <section key={s.year ?? 'none'} className="relative mb-10">
                  <div className="sticky top-28 z-10 mb-5 flex md:justify-center">
                    <div className="skew-plate ml-1 bg-chalk px-5 py-1.5 text-night shadow-xl md:ml-0">
                      <h2 className="unskew font-display text-2xl font-normal not-italic">{seasonLabel(s.year)}</h2>
                    </div>
                  </div>
                  <ol className="space-y-4">
                    {s.events.map((e, i) => (
                      <li key={e.id} className={`relative pl-12 md:w-1/2 md:pl-0 ${i % 2 ? 'md:ml-auto md:pl-10' : 'md:pr-10'}`}>
                        <span className={`absolute left-[14px] top-6 h-4 w-4 rotate-45 border-2 border-night md:top-6 ${i % 2 ? 'md:-left-2' : 'md:left-auto md:-right-2'}`} style={{ background: `rgb(var(--${(TYPES[e.event_type] || TYPES.season_start).color}))` }} aria-hidden="true" />
                        <EventCard e={e} />
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )
        }}
      </Async>
    </div>
  )
}
