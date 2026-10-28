import { Link, useOutletContext } from 'react-router-dom'
import { unwrap, useApi } from './lib/api'
import { formatFee, ordinal } from './lib/format'
import { LowerThird, PitchLines, ThemeScope } from './components/broadcast'
import { ClubCrest, TrophyImage } from './components/media'
import { Async, EmptyState, Icon, SectionBanner, StatTile } from './components/ui'

function WdlBar({ w, d, l }) {
  const total = w + d + l || 1
  return (
    <div className="flex h-3 overflow-hidden rounded-sm" role="img" aria-label={`${w} wins, ${d} draws, ${l} losses`}>
      <div className="bg-pitch" style={{ width: `${(w / total) * 100}%` }} />
      <div className="bg-flood" style={{ width: `${(d / total) * 100}%` }} />
      <div className="bg-derby" style={{ width: `${(l / total) * 100}%` }} />
    </div>
  )
}

/** League finish per season — lower is better, so the chart is drawn upside down. */
function FinishChart({ seasons }) {
  // Seasons with no matches carry a placeholder position in the save, so skip them
  const pts = seasons.filter((s) => s.table_position && s.matches > 0)
  if (pts.length < 1) return <p className="text-chalk-dim">League finishes appear once a season has been played.</p>
  const maxPos = Math.max(20, ...pts.map((s) => s.table_position))
  const w = 560, h = 220, pad = 34
  const x = (i) => pad + (pts.length === 1 ? (w - pad * 2) / 2 : (i * (w - pad * 2)) / (pts.length - 1))
  const y = (p) => pad + ((p - 1) * (h - pad * 2)) / (maxPos - 1)
  const color = (p) => (p === 1 ? 'rgb(var(--flood))' : p <= 4 ? 'rgb(var(--cyan))' : p >= maxPos - 2 ? 'rgb(var(--derby))' : 'rgb(var(--chalk))')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={pts.map((s) => `${s.season_label}: ${ordinal(s.table_position)}`).join(', ')}>
      <rect x={pad} y={y(1) - 10} width={w - pad * 2} height={y(4) - y(1) + 20} fill="rgb(var(--cyan) / .08)" />
      {[1, 5, 10, 15, 20].filter((p) => p <= maxPos).map((p) => (
        <g key={p}>
          <line x1={pad} x2={w - pad} y1={y(p)} y2={y(p)} stroke="rgb(255 255 255 / .08)" />
          <text x={pad - 8} y={y(p) + 4} textAnchor="end" fontFamily="Anton" fontSize="12" fill="rgb(var(--chalk-dim))">{p}</text>
        </g>
      ))}
      <polyline points={pts.map((s, i) => `${x(i)},${y(s.table_position)}`).join(' ')} fill="none" stroke="rgb(var(--club-1))" strokeWidth="4" strokeLinejoin="round" />
      {pts.map((s, i) => (
        <g key={`${s.year}-${i}`}>
          <circle cx={x(i)} cy={y(s.table_position)} r="11" fill={color(s.table_position)} stroke="rgb(var(--night))" strokeWidth="3" />
          <text x={x(i)} y={y(s.table_position) + 4} textAnchor="middle" fontFamily="Anton" fontSize="11" fill="rgb(var(--night))">{s.table_position}</text>
          <text x={x(i)} y={h - 6} textAnchor="middle" fontFamily="Barlow Condensed" fontWeight="800" fontSize="13" fill="rgb(var(--chalk-dim))">{s.season_label}</text>
        </g>
      ))}
    </svg>
  )
}

function Legacy({ data }) {
  const tc = data.trophy_counts
  const seasons = data.club_journey.flatMap((t) => t.seasons.map((s) => ({ ...s, club: t.club })))
  const winPct = data.career_win_pct

  return (
    <ThemeScope club={data.team}>
      <section className="relative mb-8 overflow-hidden rounded-3xl border-2 border-club-1 bg-night-800">
        <div className="grass absolute inset-0 opacity-60" aria-hidden="true" />
        <PitchLines />
        <div className="absolute inset-0 bg-gradient-to-t from-night-800 via-night-800/50 to-transparent" aria-hidden="true" />
        <div className="relative p-5 sm:p-8">
          <p className="label mb-3 text-flood">The Legacy Hub · {data.career_start}–{data.current_season}</p>
          <LowerThird title={data.manager_name} subtitle={data.team_name} />
          <div className="mt-6 flex flex-wrap items-end gap-6">
            <div>
              <div className="num text-mega leading-none text-flood">{data.total_trophies}</div>
              <div className="label">Trophies</div>
            </div>
            <div>
              <div className="num text-giant leading-none">{data.career_matches}</div>
              <div className="label">Matches</div>
            </div>
            <div>
              <div className="num text-giant leading-none text-pitch">{winPct}%</div>
              <div className="label">Win rate</div>
            </div>
            <div>
              <div className="num text-giant leading-none text-cyan">{data.total_seasons}</div>
              <div className="label">Seasons</div>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Champions League" value={tc.champions_league} color="cyan" icon="star" />
        <StatTile label="League titles" value={tc.league_title} color="flood" icon="emoji_events" />
        <StatTile label="Domestic cups" value={tc.domestic_cup} color="pitch" icon="trophy" />
        <StatTile label="Europa / Conference" value={tc.europa_league} color="tangerine" icon="workspace_premium" />
      </div>

      <section className="mb-8">
        <SectionBanner title="Trophy wall" color="flood" />
        {data.trophies.length ? (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {data.trophies.map((t, i) => (
              <li key={i} className="relative flex animate-rise flex-col items-center overflow-hidden rounded-2xl bg-gradient-to-b from-flood/25 via-night-800 to-night-800 p-4 text-center ring-1 ring-flood/40" style={{ animationDelay: `${i * 70}ms` }}>
                <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(closest-side,rgb(255_230_0/.35),transparent)]" aria-hidden="true" />
                <TrophyImage src={t.icon} name={t.name} className="relative h-20 w-20" />
                <span className="relative mt-2 font-head text-lg font-extrabold uppercase italic leading-tight">{t.name}</span>
                <span className="relative flex items-center gap-1 text-sm text-chalk-dim"><ClubCrest club={t.club} className="h-4 w-4" />{t.season_label}</span>
              </li>
            ))}
          </ul>
        ) : <EmptyState icon="trophy" title="Silverware loading…">No trophies yet — they appear here as you win them.</EmptyState>}
      </section>

      <section className="mb-8">
        <SectionBanner title="Club journey" color="club" />
        <ol className="relative flex flex-col gap-4 md:flex-row md:overflow-x-auto md:pb-2">
          {data.club_journey.map((t, i) => (
            <li key={`${t.club_game_id}-${i}`} className="relative md:w-80 md:shrink-0">
              <ThemeScope club={t.club} className="h-full">
                <div className={`panel-club h-full p-4 ${t.is_current ? 'ring-4 ring-flood/50' : ''}`}>
                  <div className="stripes absolute inset-x-0 top-0 h-1.5" aria-hidden="true" />
                  <div className="flex items-center gap-3">
                    <ClubCrest club={t.club} className="h-14 w-14" />
                    <div className="min-w-0">
                      <Link to={t.club ? `/clubs/${t.club.id}` : '#'} className="block truncate font-head text-2xl font-black uppercase italic leading-tight hover:underline">{t.club_name}</Link>
                      <div className="label">{t.start_year}–{t.is_current ? 'Present' : t.end_year + 1}</div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div><div className="num text-2xl text-pitch">{t.total_wins}</div><div className="label">W</div></div>
                    <div><div className="num text-2xl text-flood">{t.total_draws}</div><div className="label">D</div></div>
                    <div><div className="num text-2xl text-derby">{t.total_losses}</div><div className="label">L</div></div>
                  </div>
                  <div className="mt-2"><WdlBar w={t.total_wins} d={t.total_draws} l={t.total_losses} /></div>
                  {t.trophies.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {t.trophies.map((tr, j) => <TrophyImage key={j} src={tr.icon} name={`${tr.name} ${tr.season_label}`} className="h-8 w-8" />)}
                    </div>
                  )}
                </div>
              </ThemeScope>
              {i < data.club_journey.length - 1 && <Icon name="double_arrow" className="absolute -right-4 top-1/2 z-10 hidden -translate-y-1/2 text-3xl text-flood md:block" />}
            </li>
          ))}
        </ol>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-2">
        <section className="panel p-5">
          <SectionBanner title="League finishes" color="cyan" />
          <FinishChart seasons={seasons} />
        </section>

        <section className="panel overflow-hidden">
          <div className="p-5 pb-0"><SectionBanner title="Season by season" color="pitch" /></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left">
              <thead className="bg-black/40 font-head text-sm uppercase text-chalk-dim">
                <tr>
                  <th scope="col" className="px-4 py-2">Season</th>
                  <th scope="col" className="px-2 py-2">Club</th>
                  <th scope="col" className="px-2 py-2 text-right">P</th>
                  <th scope="col" className="px-2 py-2">W-D-L</th>
                  <th scope="col" className="px-2 py-2 text-right">GD</th>
                  <th scope="col" className="px-2 py-2 text-right">Pos</th>
                  <th scope="col" className="px-4 py-2">Big signing</th>
                </tr>
              </thead>
              <tbody>
                {[...seasons].reverse().map((s, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="num px-4 py-2 text-lg">{s.season_label}</td>
                    <td className="px-2 py-2"><ClubCrest club={s.club} className="h-6 w-6" /></td>
                    <td className="num px-2 py-2 text-right">{s.matches}</td>
                    <td className="px-2 py-2 font-semibold"><span className="text-pitch">{s.wins}</span>-<span className="text-flood">{s.draws}</span>-<span className="text-derby">{s.losses}</span></td>
                    <td className={`num px-2 py-2 text-right ${s.goals_for - s.goals_against >= 0 ? 'text-pitch' : 'text-derby'}`}>{s.goals_for - s.goals_against > 0 ? '+' : ''}{s.goals_for - s.goals_against}</td>
                    <td className="num px-2 py-2 text-right text-lg">{ordinal(s.table_position)}</td>
                    <td className="px-4 py-2 text-sm">{s.big_buy_player ? <>{s.big_buy_player} <span className="text-flood">{formatFee(s.big_buy_amount)}</span></> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </ThemeScope>
  )
}

export default function CareerProfile() {
  const { career } = useOutletContext()
  const state = useApi(career ? `/careers/${career.id}/profile` : null, { select: unwrap })
  if (!career) return <EmptyState icon="public" title="No universe selected" />
  return <Async state={state} loadingLabel="Polishing the silverware">{(data) => <Legacy data={data} />}</Async>
}
