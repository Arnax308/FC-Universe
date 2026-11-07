import { useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { useApi } from './lib/api'
import { formatFee, formatMoney, ordinal, POSITION_GROUP, surname } from './lib/format'
import { LowerThird, PitchLines, PlayerRow, ThemeScope } from './components/broadcast'
import { ClubCrest, PlayerFace, TrophyImage } from './components/media'
import { Async, EmptyState, Icon, RatingBadge, SectionBanner, StatTile, Tabs } from './components/ui'

const FORMATION = [
  { group: 'att', count: 3 },
  { group: 'mid', count: 3 },
  { group: 'def', count: 4 },
  { group: 'gk', count: 1 },
]

function pickXI(squad) {
  const pool = [...squad].sort((a, b) => (b.overall || 0) - (a.overall || 0))
  const used = new Set()
  const lines = FORMATION.map(({ group, count }) => {
    const line = pool.filter((p) => POSITION_GROUP[p.position] === group && !used.has(p.id)).slice(0, count)
    line.forEach((p) => used.add(p.id))
    return { group, count, line }
  })
  // Top up short lines with the best remaining outfielders
  for (const l of lines) {
    while (l.line.length < l.count) {
      const next = pool.find((p) => !used.has(p.id) && p.position && (l.group === 'gk' || p.position !== 'GK'))
      if (!next) break
      used.add(next.id)
      l.line.push(next)
    }
  }
  return lines
}

function Formation({ squad }) {
  const lines = pickXI(squad)
  return (
    <div className="grass relative overflow-hidden rounded-2xl border-4 border-white/20 px-2 py-6">
      <PitchLines className="rotate-0" />
      <div className="relative flex flex-col gap-6">
        {lines.map(({ group, line }) => (
          <div key={group} className="flex justify-center gap-2 sm:gap-6">
            {line.map((p) => (
              <Link key={p.id} to={`/players/${p.id}`} className="group flex w-16 flex-col items-center text-center sm:w-24">
                <div className="relative">
                  <PlayerFace gameId={p.game_id} name={p.known_name} className="h-12 w-12 rounded-full bg-club-1 ring-4 ring-club-2 transition group-hover:scale-110 sm:h-16 sm:w-16" />
                  <span className="num absolute -right-2 -top-1 rounded bg-night px-1 text-sm text-flood">{p.overall}</span>
                </div>
                <span className="mt-1 w-full truncate rounded bg-black/70 px-1 font-head text-xs font-bold uppercase sm:text-sm">{surname(p.known_name)}</span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function LeagueTable({ careerId, competitionId, clubId }) {
  const state = useApi(competitionId ? `/careers/${careerId}/competitions/${competitionId}/table` : null)
  if (!competitionId) return <EmptyState icon="table_chart" title="No league table for this club" />
  return (
    <Async state={state} loadingLabel="Fetching the table">
      {(t) => (
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between bg-black/40 px-4 py-3">
            <h3 className="text-2xl">{t.competition.name}</h3>
            <span className="label">{t.season_label}{t.rows.some((r) => r.played) ? ' · positions' : ' · final positions'}</span>
          </div>
          <ol>
            {t.rows.map((r) => {
              const mine = r.club.id === clubId
              const move = r.previous_position && r.position ? r.previous_position - r.position : 0
              return (
                <li key={r.club.id} className={`flex items-center gap-3 border-t border-white/5 px-4 py-2 ${mine ? 'bg-club-1/25' : ''}`}>
                  <span className={`num w-8 text-center text-xl ${r.position <= 4 ? 'text-cyan' : r.position > t.rows.length - 3 ? 'text-derby' : ''}`}>{r.position ?? '–'}</span>
                  <ClubCrest club={r.club} className="h-7 w-7" />
                  <Link to={`/clubs/${r.club.id}`} className={`min-w-0 flex-1 truncate hover:underline ${mine ? 'font-bold' : ''}`}>{r.club.name}</Link>
                  <span className="label hidden sm:inline">Last yr {ordinal(r.previous_position)}</span>
                  {move !== 0 && <Icon name={move > 0 ? 'arrow_drop_up' : 'arrow_drop_down'} className={`text-3xl ${move > 0 ? 'text-pitch' : 'text-derby'}`} />}
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </Async>
  )
}

const dash = (v) => (v === null || v === undefined ? '—' : v)

function SeasonHistory({ careerId, clubId }) {
  const state = useApi(`/careers/${careerId}/clubs/${clubId}/seasons`)
  const [open, setOpen] = useState(null)
  return (
    <Async state={state} loadingLabel="Opening the archives">
      {({ seasons }) => seasons.length ? (
        <div className="space-y-4">
          {seasons.map((s, i) => {
            const expanded = open === s.season_year || (open === null && i === 0)
            const lg = s.league
            return (
              <section key={s.season_year} className="panel overflow-hidden">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? -1 : s.season_year)}
                  className="flex w-full flex-wrap items-center gap-3 bg-black/40 px-4 py-3 text-left hover:bg-black/60"
                >
                  <span className="num text-2xl text-flood">{s.season_label}</span>
                  {lg?.position && <span className="chip bg-club-1 text-club-ink">{ordinal(lg.position)} · {lg.competition}</span>}
                  {s.trophies.map((t, j) => (
                    <span key={j} className="chip bg-flood/20 text-flood"><Icon name="trophy" fill className="text-base" /> {t.name}</span>
                  ))}
                  <span className="ml-auto flex items-center gap-4 text-sm text-chalk-dim">
                    {s.top_scorer && <span>Top scorer <b className="text-chalk">{s.top_scorer.player?.name}</b> {s.top_scorer.value}</span>}
                    <Icon name={expanded ? 'expand_less' : 'expand_more'} className="text-2xl" />
                  </span>
                </button>
                {expanded && (
                  <div className="p-4">
                    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                      {[['Pos', lg?.position ? ordinal(lg.position) : '—'], ['P', lg?.played], ['W', lg?.wins], ['D', lg?.draws], ['L', lg?.losses],
                        ['GD', lg && lg.played ? (lg.goals_for || 0) - (lg.goals_against || 0) : null], ['Pts', lg?.played ? lg.points : null]].map(([k, v]) => (
                        <div key={k} className="rounded-lg bg-white/5 px-3 py-2">
                          <div className="label">{k}</div>
                          <div className="num text-2xl">{dash(v)}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mb-4 grid gap-2 sm:grid-cols-3">
                      {[['Top scorer', s.top_scorer, 'goals', 'text-pitch'], ['Top assists', s.top_assister, 'assists', 'text-cyan'], ['Clean sheets', s.top_keeper, 'clean sheets', 'text-violet']].map(([k, e, unit, c]) => (
                        <div key={k} className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
                          <PlayerFace gameId={e?.player?.game_id} name={e?.player?.name} className="h-10 w-10 rounded-full bg-night-700" />
                          <div className="min-w-0 flex-1">
                            <div className="label">{k}</div>
                            {e ? <Link to={`/players/${e.player?.id}`} className="block truncate font-semibold hover:underline">{e.player?.name}</Link> : <span className="text-chalk-dim">—</span>}
                          </div>
                          {e && <span className={`num text-2xl ${c}`} title={unit}>{e.value}</span>}
                        </div>
                      ))}
                    </div>
                    {s.squad.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[30rem] text-left text-sm">
                          <thead className="font-head uppercase text-chalk-dim">
                            <tr>
                              <th scope="col" className="px-2 py-1">Player</th>
                              <th scope="col" className="px-2 py-1 text-right">Apps</th>
                              <th scope="col" className="px-2 py-1 text-right">G</th>
                              <th scope="col" className="px-2 py-1 text-right">A</th>
                              <th scope="col" className="px-2 py-1 text-right">CS</th>
                              <th scope="col" className="px-2 py-1 text-right">Rating</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.squad.map((p) => (
                              <tr key={p.player?.id} className="border-t border-white/5">
                                <td className="px-2 py-1.5"><Link to={`/players/${p.player?.id}`} className="font-semibold hover:underline">{p.player?.name}</Link> <span className="text-chalk-dim">{p.player?.position}</span></td>
                                <td className="num px-2 py-1.5 text-right text-lg">{dash(p.appearances)}</td>
                                <td className="num px-2 py-1.5 text-right text-lg text-pitch">{dash(p.goals)}</td>
                                <td className="num px-2 py-1.5 text-right text-lg text-cyan">{dash(p.assists)}</td>
                                <td className="num px-2 py-1.5 text-right text-lg text-violet">{dash(p.clean_sheets)}</td>
                                <td className="num px-2 py-1.5 text-right text-lg">{p.avg_rating ? p.avg_rating.toFixed(2) : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p className="mt-2 text-xs text-chalk-dim">Players who made EA’s competition leaderboards that season.</p>
                      </div>
                    ) : <p className="text-chalk-dim">No player numbers were tracked for this season.</p>}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      ) : (
        <EmptyState icon="calendar_month" title="No seasons on file yet">
          Seasons are recorded each time you sync the save — FC 26 itself forgets them.
        </EmptyState>
      )}
    </Async>
  )
}

function Club({ club, careerId }) {
  const [tab, setTab] = useState('overview')
  const squad = useApi(`/careers/${careerId}/players?club_id=${club.id}&limit=80`)
  const transfers = useApi(tab === 'transfers' ? `/careers/${careerId}/transfers?club_id=${club.id}&limit=200` : null)

  return (
    <ThemeScope club={club}>
      <Link to="/clubs" className="mb-4 inline-flex items-center gap-1 font-head font-bold uppercase text-chalk-dim hover:text-chalk">
        <Icon name="arrow_back" /> Clubs
      </Link>

      <section className="relative mb-6 overflow-hidden rounded-3xl border-2 border-club-1">
        <div className="stripes absolute inset-0" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-r from-night via-night/80 to-night/20" aria-hidden="true" />
        <ClubCrest club={club} className="pointer-events-none absolute -right-10 -top-10 h-72 w-72 opacity-20 blur-[1px]" />
        <div className="relative flex flex-col gap-5 p-5 sm:p-8 md:flex-row md:items-end">
          <ClubCrest club={club} className="h-28 w-28 sm:h-36 sm:w-36" />
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap gap-2">
              {club.league && <span className="chip bg-chalk text-night">{club.league}</span>}
              {club.stadium_name && <span className="chip bg-black/60"><Icon name="stadium" className="text-base" /> {club.stadium_name}</span>}
              {club.is_user_club && <span className="chip bg-flood text-night">Your club</span>}
              {club.league_position && <span className="chip bg-club-1 text-club-ink">{ordinal(club.league_position)} in league</span>}
            </div>
            <LowerThird title={club.name} subtitle={club.manager_name ? `Boss · ${club.manager_name}` : null} />
          </div>
          <div className="flex gap-2">
            <RatingBadge value={club.overall_rating} size="lg" label="Team overall" />
          </div>
        </div>
      </section>

      <Tabs
        label="Club sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Overview', icon: 'dashboard' },
          { id: 'squad', label: 'Squad', icon: 'groups' },
          { id: 'seasons', label: 'Seasons', icon: 'calendar_month' },
          { id: 'table', label: 'Table', icon: 'leaderboard' },
          { id: 'honours', label: 'Honours', icon: 'trophy' },
          { id: 'transfers', label: 'Transfers', icon: 'swap_horiz' },
        ]}
      />

      <div className="mt-6">
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="Attack" value={club.attack_rating} color="derby" icon="sports_soccer" />
              <StatTile label="Midfield" value={club.midfield_rating} color="pitch" icon="hub" />
              <StatTile label="Defence" value={club.defense_rating} color="cyan" icon="shield" />
              <StatTile label="Squad size" value={club.squad_count} color="flood" icon="groups" />
            </div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <Async state={squad} loadingLabel="Naming the XI">
                {(list) => list.length ? (
                  <div>
                    <SectionBanner title="Best XI" kicker="4-3-3" color="club" />
                    <Formation squad={list} />
                  </div>
                ) : <EmptyState icon="groups" title="No registered players" />}
              </Async>
              <div className="space-y-3">
                <StatTile label="Net spend" value={formatMoney(club.net_spend)} color={club.net_spend > 0 ? 'derby' : 'pitch'} icon="payments"
                  sub={`${formatFee(club.total_spent)} in · ${formatFee(club.total_received)} out`} />
                <StatTile label="Domestic prestige" value={club.domestic_prestige ? `${club.domestic_prestige}/10` : '—'} color="violet" icon="workspace_premium" />
                <StatTile label="Int'l prestige" value={club.international_prestige ? `${club.international_prestige}/10` : '—'} color="tangerine" icon="public" />
                {club.rival && (
                  <Link to={`/clubs/${club.rival.id}`} className="panel flex items-center gap-3 border-l-4 border-derby p-4 hover:bg-white/5">
                    <ClubCrest club={club.rival} className="h-10 w-10" />
                    <div><div className="label text-derby">Rival</div><div className="font-head text-lg font-bold uppercase">{club.rival.name}</div></div>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'squad' && (
          <Async state={squad} loadingLabel="Checking the squad list">
            {(list) => list.length ? (
              <div className="panel grid gap-x-6 p-3 md:grid-cols-2">
                {list.map((p) => <PlayerRow key={p.id} player={p} to={`/players/${p.id}`} />)}
              </div>
            ) : <EmptyState icon="groups" title="No registered players" />}
          </Async>
        )}

        {tab === 'seasons' && <SeasonHistory careerId={careerId} clubId={club.id} />}

        {tab === 'table' && <LeagueTable careerId={careerId} competitionId={club.competition_id} clubId={club.id} />}

        {tab === 'honours' && (
          <div className="space-y-8">
            <section>
              <SectionBanner title="Won in this universe" color="flood" />
              {club.universe_trophies?.length ? (
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  {club.universe_trophies.map((t, i) => (
                    <li key={i} className="relative flex flex-col items-center overflow-hidden rounded-2xl bg-gradient-to-b from-flood/25 via-night-800 to-night-800 p-4 text-center ring-1 ring-flood/40">
                      <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(closest-side,rgb(255_230_0/.35),transparent)]" aria-hidden="true" />
                      <TrophyImage src={t.icon} name={t.name} className="relative h-20 w-20" />
                      <span className="relative mt-2 font-head text-lg font-extrabold uppercase italic leading-tight">{t.name}</span>
                      <span className="num relative text-flood">{t.season_label}</span>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState icon="trophy" title="Cabinet’s empty — for now" />}
            </section>
            {club.historical_trophies?.length > 0 && (
              <section>
                <SectionBanner title="Real-world history" kicker="Before the save began" color="violet" />
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {club.historical_trophies.map((t) => (
                    <li key={t.name} className="panel flex items-center gap-3 p-3">
                      <TrophyImage src={t.icon} name={t.name} className="h-12 w-12" />
                      <div>
                        <div className="num text-3xl text-flood">{t.count}×</div>
                        <div className="font-head text-sm font-bold uppercase leading-tight">{t.name}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {tab === 'transfers' && (
          <Async state={transfers} loadingLabel="Checking the ledger">
            {(list) => list.length ? (
              <ul className="space-y-2">
                {list.map((t) => {
                  const incoming = t.to_club_id === club.id
                  return (
                    <li key={t.id} className={`panel flex items-center gap-3 border-l-8 p-3 ${incoming ? 'border-pitch' : 'border-derby'}`}>
                      <span className={`chip ${incoming ? 'bg-pitch text-night' : 'bg-derby'}`}>{incoming ? 'In' : 'Out'}</span>
                      <PlayerFace gameId={t.player_game_id} name={t.player_name} className="h-10 w-10" />
                      <Link to={`/players/${t.player_id}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">{t.player_name}</Link>
                      <ClubCrest club={incoming ? t.from_club : t.to_club} className="h-7 w-7" />
                      <span className="num text-lg text-flood">{t.type === 'loan' ? 'Loan' : formatFee(t.fee)}</span>
                    </li>
                  )
                })}
              </ul>
            ) : <EmptyState icon="swap_horiz" title="No transfers logged yet">Moves show up as you sync the save after players change clubs.</EmptyState>}
          </Async>
        )}
      </div>
    </ThemeScope>
  )
}

export default function ClubProfile() {
  const { career } = useOutletContext()
  const { id } = useParams()
  const state = useApi(career ? `/careers/${career.id}/clubs/${id}` : null)
  if (!career) return <EmptyState icon="public" title="No universe selected" />
  return <Async state={state} loadingLabel="Opening the club">{(club) => <Club club={club} careerId={career.id} />}</Async>
}
