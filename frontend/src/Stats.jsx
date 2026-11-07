import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { qs, useApi } from './lib/api'
import { seasonLabel } from './lib/format'
import { ClubCrest, PlayerFace, TrophyImage } from './components/media'
import { Async, EmptyState, Icon, PageHeader, PillGroup, PositionChip, SectionBanner, Tabs } from './components/ui'

const BOARDS = [
  { stat: 'goals', title: 'Goals', color: 'pitch', icon: 'sports_soccer' },
  { stat: 'assists', title: 'Assists', color: 'cyan', icon: 'assistant_direction' },
  { stat: 'clean_sheets', title: 'Clean sheets', color: 'violet', icon: 'front_hand' },
  { stat: 'avg_rating', title: 'Avg rating', color: 'flood', icon: 'star' },
  { stat: 'appearances', title: 'Appearances', color: 'tangerine', icon: 'directions_run' },
]

const TEXT = { pitch: 'text-pitch', cyan: 'text-cyan', violet: 'text-violet', flood: 'text-flood', tangerine: 'text-tangerine' }
const EDGE = { pitch: 'border-pitch', cyan: 'border-cyan', violet: 'border-violet', flood: 'border-flood', tangerine: 'border-tangerine' }

const fmt = (stat, v) => (v === null || v === undefined ? '—' : stat === 'avg_rating' ? Number(v).toFixed(2) : v)

function Board({ title, stat, color, icon, rows }) {
  return (
    <section className={`panel overflow-hidden border-t-4 ${EDGE[color]}`}>
      <div className="flex items-center justify-between px-4 pt-3">
        <h3 className={`text-2xl ${TEXT[color]}`}>{title}</h3>
        <Icon name={icon} className={`text-2xl ${TEXT[color]}`} />
      </div>
      {rows.length ? (
        <ol className="mt-2">
          {rows.slice(0, 10).map((r, i) => (
            <li key={r.player?.id ?? i} className={`flex items-center gap-3 border-t border-white/5 px-4 py-2 ${i === 0 ? 'bg-white/5' : ''}`}>
              <span className={`num w-6 text-center text-lg ${i === 0 ? TEXT[color] : 'text-chalk-dim'}`}>{i + 1}</span>
              <PlayerFace gameId={r.player?.game_id} name={r.player?.name} className="h-9 w-9 shrink-0 rounded-full bg-night-700" />
              <div className="min-w-0 flex-1">
                <Link to={`/players/${r.player?.id}`} className="block truncate font-semibold hover:underline">{r.player?.name}</Link>
                <span className="flex items-center gap-1 truncate text-xs text-chalk-dim">
                  <ClubCrest club={r.club} className="h-4 w-4" /> {r.club?.name || '—'} · {r.appearances ?? '—'} apps
                </span>
              </div>
              <span className={`num text-2xl ${TEXT[color]}`}>{fmt(stat, r[stat])}</span>
            </li>
          ))}
        </ol>
      ) : <p className="px-4 py-6 text-chalk-dim">Nobody on this board yet.</p>}
    </section>
  )
}

function Leaderboards({ careerId }) {
  const [season, setSeason] = useState(null)
  const [competition, setCompetition] = useState('')
  const [gender, setGender] = useState(0)
  const state = useApi(`/careers/${careerId}/stats/leaders${qs({ season, competition, gender, limit: 10 })}`)

  return (
    <Async state={state} loadingLabel="Crunching the numbers">
      {(data) => !data.seasons.length ? (
        <EmptyState icon="leaderboard" title="No stats tracked yet">
          FC 26 only keeps the season in progress. Sync your save during each season and FC Universe files the numbers away so you can look back at every year.
        </EmptyState>
      ) : (
        <div>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <PillGroup
              label="Season"
              value={data.season}
              onChange={(v) => { setSeason(v); setCompetition('') }}
              options={data.seasons.map((y) => ({ value: y, label: seasonLabel(y) }))}
            />
            <label className="flex items-center gap-2">
              <span className="label">Competition</span>
              <select
                value={competition}
                onChange={(e) => setCompetition(e.target.value)}
                className="rounded-lg bg-night-800 px-3 py-2 font-head font-bold uppercase ring-1 ring-white/10"
              >
                <option value="">All competitions</option>
                {data.competitions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <PillGroup label="Gender" value={gender} onChange={setGender} options={[{ value: 0, label: 'Men' }, { value: 1, label: 'Women' }]} />
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {BOARDS.map((b) => <Board key={b.stat} {...b} rows={data.leaders[b.stat] || []} />)}
          </div>
          <p className="mt-4 text-sm text-chalk-dim">
            <Icon name="info" className="align-middle text-base" /> EA publishes the top 20 per stat in each competition, so totals cover the players who made those lists. Every season you sync is kept here for good.
          </p>
        </div>
      )}
    </Async>
  )
}

const MEDAL = ['from-[#fff3a0] via-[#ffd23f] to-[#c8961e] text-night', 'from-[#f2f4f8] via-[#c4cad6] to-[#8a93a6] text-night', 'from-[#f3c08b] via-[#c6814a] to-[#7d4a24] text-night']

function Podium({ award }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border-2 border-flood bg-night-800 p-5 sm:p-7">
      <div className="absolute inset-0 bg-[radial-gradient(40rem_16rem_at_50%_0%,rgb(255_230_0/.22),transparent)]" aria-hidden="true" />
      <div className="relative flex flex-col items-center text-center">
        <TrophyImage src={award.icon} name={award.name} className="h-20 w-20" />
        <h3 className="mt-2 font-display text-4xl uppercase">{award.name}</h3>
        <div className="mt-5 grid w-full max-w-3xl grid-cols-3 items-end gap-3">
          {[1, 0, 2].map((rank) => {
            const e = award.podium[rank]
            if (!e) return <div key={rank} />
            return (
              <Link key={rank} to={`/players/${e.player?.id}`} className={`flex flex-col items-center rounded-2xl bg-white/5 p-3 hover:bg-white/10 ${rank === 0 ? 'pb-6 ring-2 ring-flood' : ''}`}>
                <span className={`num mb-2 rounded bg-gradient-to-br px-2 text-lg ${MEDAL[rank]}`}>{rank + 1}</span>
                <PlayerFace gameId={e.player?.game_id} name={e.player?.name} className={`${rank === 0 ? 'h-20 w-20' : 'h-14 w-14'} rounded-full bg-night-700`} />
                <span className={`mt-2 font-head font-black uppercase italic leading-tight ${rank === 0 ? 'text-xl' : 'text-base'}`}>{e.player?.name}</span>
                <span className="mt-1 flex items-center gap-1 text-xs text-chalk-dim"><ClubCrest club={e.club} className="h-4 w-4" />{e.club?.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function AwardCard({ a }) {
  const unit = a.name === 'Player of the Season' ? 'avg' : a.name === 'Golden Boot' ? 'goals' : a.name === 'Playmaker of the Season' ? 'assists' : a.name === 'Golden Glove' ? 'clean sheets' : 'pts'
  return (
    <li className="panel flex items-center gap-3 p-3">
      <TrophyImage src={a.icon} name={a.name} className="h-12 w-12 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="label truncate">{a.name}</div>
        <Link to={`/players/${a.player?.id}`} className="block truncate font-head text-lg font-black uppercase italic hover:underline">{a.player?.name}</Link>
        <span className="flex items-center gap-1 truncate text-xs text-chalk-dim">
          <ClubCrest club={a.club} className="h-4 w-4" /> {a.club?.name}
          {a.player?.position && <PositionChip pos={a.player.position} className="ml-1 scale-90" />}
        </span>
      </div>
      {unit !== 'pts' && (
        <div className="text-right">
          <div className="num text-2xl text-flood">{typeof a.value === 'number' && !Number.isInteger(a.value) ? a.value.toFixed(2) : a.value}</div>
          <div className="label">{unit}</div>
        </div>
      )}
    </li>
  )
}

function Awards({ careerId }) {
  const state = useApi(`/careers/${careerId}/awards`)
  return (
    <Async state={state} loadingLabel="Polishing the trophies">
      {(seasons) => !seasons.length ? (
        <EmptyState icon="emoji_events" title="No awards handed out yet">
          Awards are decided once a season finishes, from the stats tracked during it.
        </EmptyState>
      ) : (
        <div className="space-y-12">
          {seasons.map((s) => {
            const world = s.awards.filter((a) => a.scope === 'world')
            const club = s.awards.filter((a) => a.scope === 'club')
            const leagues = {}
            s.awards.filter((a) => a.scope === 'league').forEach((a) => { (leagues[a.competition] ||= []).push(a) })
            return (
              <section key={s.season_year}>
                <SectionBanner title={s.season_label} kicker="Season awards" color="flood" />
                <div className="space-y-6">
                  {world.map((a) => <Podium key={a.key} award={a} />)}
                  {club.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-xl text-club-1">Your club</h3>
                      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{club.map((a) => <AwardCard key={a.key} a={a} />)}</ul>
                    </div>
                  )}
                  {Object.entries(leagues).map(([comp, list]) => (
                    <div key={comp}>
                      <h3 className="mb-2 text-xl">{comp}</h3>
                      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{list.map((a) => <AwardCard key={a.key} a={a} />)}</ul>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
          <p className="text-sm text-chalk-dim">
            <Icon name="info" className="align-middle text-base" /> FC 26 doesn’t save its award winners, so FC Universe decides them from each season’s numbers: Golden Boot, Playmaker and Golden Glove go to the league leaders, Player of the Season to the best league rating, and the Ballon d’Or weighs goals, assists, clean sheets, rating and the trophies a player won.
          </p>
        </div>
      )}
    </Async>
  )
}

function Tables({ careerId, myClubId }) {
  const [season, setSeason] = useState(null)
  const [competition, setCompetition] = useState(null)
  const state = useApi(`/careers/${careerId}/tables${qs({ season, competition_id: competition })}`)
  return (
    <Async state={state} loadingLabel="Printing the tables">
      {(t) => !t.seasons.length ? (
        <EmptyState icon="table_chart" title="No tables on file yet">
          Sync after the last matchday of a season (before you advance to the next one) to keep the full final table — EA wipes it when the new season starts.
        </EmptyState>
      ) : (
        <div>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <PillGroup label="Season" value={t.season} onChange={(v) => { setSeason(v); setCompetition(null) }}
              options={t.seasons.map((y) => ({ value: y, label: seasonLabel(y) }))} />
            <label className="flex items-center gap-2">
              <span className="label">League</span>
              <select value={t.competition_id ?? ''} onChange={(e) => setCompetition(Number(e.target.value))}
                className="rounded-lg bg-night-800 px-3 py-2 font-head font-bold uppercase ring-1 ring-white/10">
                {t.competitions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          </div>
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left">
              <thead className="bg-black/40 font-head text-sm uppercase text-chalk-dim">
                <tr>
                  <th scope="col" className="px-4 py-2">#</th>
                  <th scope="col" className="px-2 py-2">Club</th>
                  {!t.final_positions_only && ['P', 'W', 'D', 'L', 'GD', 'Pts'].map((h) => <th key={h} scope="col" className="px-2 py-2 text-right">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {t.rows.map((r) => (
                  <tr key={r.club.id} className={`border-t border-white/5 ${r.club.id === myClubId ? 'bg-club-1/25 font-bold' : ''}`}>
                    <td className="num px-4 py-2 text-xl">{r.position ?? '—'}</td>
                    <td className="px-2 py-2">
                      <Link to={`/clubs/${r.club.id}`} className="flex items-center gap-2 hover:underline"><ClubCrest club={r.club} className="h-6 w-6" />{r.club.name}</Link>
                    </td>
                    {!t.final_positions_only && (
                      <>
                        <td className="num px-2 py-2 text-right">{r.played}</td>
                        <td className="num px-2 py-2 text-right">{r.wins}</td>
                        <td className="num px-2 py-2 text-right">{r.draws}</td>
                        <td className="num px-2 py-2 text-right">{r.losses}</td>
                        <td className="num px-2 py-2 text-right">{(r.goals_for || 0) - (r.goals_against || 0)}</td>
                        <td className="num px-2 py-2 text-right text-xl text-flood">{r.points}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {t.final_positions_only && (
            <p className="mt-3 text-sm text-chalk-dim">
              <Icon name="info" className="align-middle text-base" /> Only final positions survived for {t.season_label} — this save was synced after EA reset the table. Sync right after the last matchday to keep points, wins and goals too.
            </p>
          )}
        </div>
      )}
    </Async>
  )
}

export default function Stats() {
  const { career } = useOutletContext()
  const [tab, setTab] = useState('leaders')
  if (!career) return <EmptyState icon="public" title="No universe selected" />
  return (
    <div>
      <PageHeader kicker="Every season, on the record" title="Stats centre" accent="pitch">
        <p className="max-w-2xl text-lg text-chalk-dim">Goals, assists, clean sheets and ratings for every season of {career.name} — plus the awards EA never kept.</p>
      </PageHeader>
      <Tabs
        label="Stats sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'leaders', label: 'Leaderboards', icon: 'leaderboard' },
          { id: 'tables', label: 'Tables', icon: 'table_chart' },
          { id: 'awards', label: 'Awards', icon: 'emoji_events' },
        ]}
      />
      <div className="mt-6">
        {tab === 'leaders' && <Leaderboards careerId={career.id} />}
        {tab === 'tables' && <Tables careerId={career.id} myClubId={career.team?.id} />}
        {tab === 'awards' && <Awards careerId={career.id} />}
      </div>
    </div>
  )
}

