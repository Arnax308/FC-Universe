import { Link, useOutletContext, useParams } from 'react-router-dom'
import { useApi } from './lib/api'
import { formatFee, playerName, seasonLabel, statColor } from './lib/format'
import { FutCard, LowerThird, PitchLines, ThemeScope } from './components/broadcast'
import { ClubCrest, TrophyImage } from './components/media'
import { Async, EmptyState, Flag, Icon, PositionChip, SectionBanner, StatBar } from './components/ui'

const GROUPS = [
  { title: 'Pace', color: 'cyan', keys: [['acceleration', 'Acceleration'], ['sprint_speed', 'Sprint speed']] },
  { title: 'Shooting', color: 'derby', keys: [['positioning', 'Positioning'], ['finishing', 'Finishing'], ['shot_power', 'Shot power'], ['long_shots', 'Long shots'], ['volleys', 'Volleys'], ['penalties', 'Penalties']] },
  { title: 'Passing', color: 'pitch', keys: [['vision', 'Vision'], ['crossing', 'Crossing'], ['free_kick_accuracy', 'FK accuracy'], ['short_passing', 'Short passing'], ['long_passing', 'Long passing'], ['curve', 'Curve']] },
  { title: 'Dribbling', color: 'flood', keys: [['agility', 'Agility'], ['balance', 'Balance'], ['reactions', 'Reactions'], ['ball_control', 'Ball control'], ['dribbling', 'Dribbling'], ['composure', 'Composure']] },
  { title: 'Defending', color: 'violet', keys: [['interceptions', 'Interceptions'], ['heading_accuracy', 'Heading'], ['defensive_awareness', 'Def. awareness'], ['standing_tackle', 'Stand tackle'], ['sliding_tackle', 'Slide tackle']] },
  { title: 'Physical', color: 'tangerine', keys: [['jumping', 'Jumping'], ['stamina', 'Stamina'], ['strength', 'Strength'], ['aggression', 'Aggression']] },
]
const GK_GROUP = { title: 'Goalkeeping', color: 'flood', keys: [['gk_diving', 'Diving'], ['gk_handling', 'Handling'], ['gk_kicking', 'Kicking'], ['gk_positioning', 'Positioning'], ['gk_reflexes', 'Reflexes']] }

const avg = (p, keys) => {
  const vals = keys.map(([k]) => p[k]).filter((v) => v !== null && v !== undefined)
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
}

function Radar({ player }) {
  const axes = GROUPS.map((g) => ({ label: g.title.slice(0, 3).toUpperCase(), value: avg(player, g.keys) }))
  const cx = 110, cy = 110, r = 84
  const pt = (i, v) => {
    const a = (Math.PI * 2 * i) / axes.length - Math.PI / 2
    return [cx + Math.cos(a) * r * (v / 99), cy + Math.sin(a) * r * (v / 99)]
  }
  const poly = axes.map((a, i) => pt(i, a.value).join(',')).join(' ')
  return (
    <svg viewBox="0 0 220 220" className="mx-auto w-full max-w-xs" role="img" aria-label={axes.map((a) => `${a.label} ${a.value}`).join(', ')}>
      {[33, 66, 99].map((ring) => (
        <polygon key={ring} points={axes.map((_, i) => pt(i, ring).join(',')).join(' ')} fill="none" stroke="rgb(255 255 255 / .12)" />
      ))}
      {axes.map((_, i) => <line key={i} x1={cx} y1={cy} x2={pt(i, 99)[0]} y2={pt(i, 99)[1]} stroke="rgb(255 255 255 / .1)" />)}
      <polygon points={poly} fill="rgb(var(--club-1) / .45)" stroke="rgb(var(--club-1))" strokeWidth="3" strokeLinejoin="round" />
      {axes.map((a, i) => {
        const [x, y] = pt(i, 122)
        return (
          <g key={a.label}>
            <text x={x} y={y - 4} textAnchor="middle" fontFamily="Barlow Condensed" fontWeight="800" fontSize="12" fill="rgb(var(--chalk-dim))">{a.label}</text>
            <text x={x} y={y + 11} textAnchor="middle" fontFamily="Anton" fontSize="15" fill={statColor(a.value)}>{a.value}</text>
          </g>
        )
      })}
    </svg>
  )
}

function Stars({ value, label }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="label">{label}</span>
      <span className="flex" aria-label={`${value ?? 0} of 5`}>
        {[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" fill={i <= (value || 0)} className={`text-xl ${i <= (value || 0) ? 'text-flood' : 'text-white/20'}`} />)}
      </span>
    </div>
  )
}

function Profile({ data }) {
  const { player, stats, transfers, awards, trophies, timeline, conversion_plans: plans } = data
  const isGk = player.position === 'GK'
  const groups = isGk ? [GK_GROUP, ...GROUPS.slice(5)] : GROUPS
  const potentialGap = (player.potential || 0) - (player.overall || 0)

  return (
    <ThemeScope club={player.club}>
      <Link to="/players" className="mb-4 inline-flex items-center gap-1 font-head font-bold uppercase text-chalk-dim hover:text-chalk">
        <Icon name="arrow_back" /> Players
      </Link>

      {/* Hero */}
      <section className="relative mb-8 overflow-hidden rounded-3xl border-2 border-club-1 bg-night-800">
        <div className="stripes absolute inset-0 opacity-30" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-r from-night-800 via-night-800/85 to-transparent" aria-hidden="true" />
        <PitchLines />
        <div className="relative grid gap-6 p-5 md:grid-cols-[auto_1fr] md:items-end md:p-8">
          <div className="mx-auto md:mx-0"><FutCard player={player} size="lg" /></div>
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <PositionChip pos={player.position} />
              {player.secondary_positions?.split(', ').map((p) => <PositionChip key={p} pos={p} className="opacity-70" />)}
              {player.nationality && <span className="chip bg-black/60"><Flag code={player.nation_code} className="h-3 w-4" /> {player.nationality}</span>}
              {player.is_retired && <span className="chip bg-derby">Retired</span>}
            </div>
            <LowerThird title={playerName(player)} subtitle={player.club?.name || 'Free agent'} />
            <dl className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {[
                ['Age', player.age ?? '—'],
                ['Height', player.height_cm ? `${player.height_cm}cm` : '—'],
                ['Weight', player.weight_kg ? `${player.weight_kg}kg` : '—'],
                ['Foot', player.foot || '—'],
                ['Shirt', player.jersey_number ? `#${player.jersey_number}` : '—'],
                ['Potential', player.potential ? `${player.potential}${potentialGap > 0 ? ` (+${potentialGap})` : ''}` : '—'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-black/50 px-3 py-2">
                  <dt className="label">{k}</dt>
                  <dd className="num text-xl">{v}</dd>
                </div>
              ))}
            </dl>
            {player.club && (
              <Link to={`/clubs/${player.club.id}`} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-black/50 px-3 py-2 hover:bg-black/70">
                <ClubCrest club={player.club} className="h-7 w-7" />
                <span className="font-head font-bold uppercase">{player.club.name}</span>
                <Icon name="arrow_forward" className="text-chalk-dim" />
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="panel p-5">
            <SectionBanner title="Shape" color="club" />
            <Radar player={player} />
            <div className="mt-4 space-y-2">
              <Stars label="Weak foot" value={player.weak_foot_ability} />
              <Stars label="Skill moves" value={player.skill_moves} />
              <Stars label="Int. reputation" value={player.international_rep} />
            </div>
          </section>

          {plans?.length > 0 && (
            <section className="panel p-5">
              <SectionBanner title="Retrain" kicker="Position switch" color="cyan" />
              <ul className="space-y-2">
                {plans.slice(0, 6).map((p) => (
                  <li key={p.target_position} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
                    <PositionChip pos={p.target_position} />
                    <span className="flex-1 text-sm text-chalk-dim">{p.difficulty}{p.is_secondary ? ' · already listed' : ''}</span>
                    <span className="num text-lg">{p.weeks}<span className="ml-0.5 font-head text-sm text-chalk-dim">wk</span></span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="panel p-5">
            <SectionBanner title="Attributes" color="flood" />
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {groups.map((g, gi) => (
                <div key={g.title}>
                  <div className="mb-2 flex items-baseline justify-between border-b-2 pb-1" style={{ borderColor: `rgb(var(--${g.color}))` }}>
                    <h3 className="text-xl" style={{ color: `rgb(var(--${g.color}))` }}>{g.title}</h3>
                    <span className="num text-2xl" style={{ color: statColor(avg(player, g.keys)) }}>{avg(player, g.keys)}</span>
                  </div>
                  <div className="space-y-2">
                    {g.keys.map(([k, label], i) => <StatBar key={k} label={label} value={player[k]} delay={gi * 60 + i * 30} />)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="p-5 pb-0"><SectionBanner title="Season stats" color="pitch" /></div>
            {stats.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left">
                  <thead className="bg-black/40 font-head text-sm uppercase text-chalk-dim">
                    <tr>
                      <th scope="col" className="px-5 py-2">Season</th>
                      <th scope="col" className="px-3 py-2">Club</th>
                      <th scope="col" className="px-3 py-2 text-right">Goals</th>
                      <th scope="col" className="px-3 py-2 text-right">Yel</th>
                      <th scope="col" className="px-3 py-2 text-right">Red</th>
                      <th scope="col" className="px-5 py-2 text-right" title="Average of recent match ratings">Form</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((s) => (
                      <tr key={`${s.season_year}-${s.club_name}`} className="border-t border-white/5">
                        <td className="num px-5 py-3 text-lg">{seasonLabel(s.season_year)}</td>
                        <td className="px-3 py-3"><span className="flex items-center gap-2"><ClubCrest club={s.club} className="h-6 w-6" />{s.club_name}</span></td>
                        <td className="num px-3 py-3 text-right text-2xl text-pitch">{s.goals ?? 0}</td>
                        <td className="px-3 py-3 text-right"><span className="inline-block h-4 w-3 rounded-sm bg-flood align-middle" aria-hidden="true" /> {s.yellow_cards ?? 0}</td>
                        <td className="px-3 py-3 text-right"><span className="inline-block h-4 w-3 rounded-sm bg-derby align-middle" aria-hidden="true" /> {s.red_cards ?? 0}</td>
                        <td className="num px-5 py-3 text-right text-xl" style={{ color: s.avg_rating ? statColor(s.avg_rating * 10) : undefined }}>{s.avg_rating ? s.avg_rating.toFixed(1) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="p-5 text-chalk-dim">No stats recorded yet.</p>}
          </section>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
            <section className="panel p-5">
              <SectionBanner title="Honours" color="flood" />
              {trophies.length || awards.length ? (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[...trophies.map((t) => ({ ...t, kind: 'Team' })), ...awards.map((a) => ({ name: a.name, icon: a.icon, year: a.season_year, kind: 'Individual' }))].map((t, i) => (
                    <li key={`${t.name}-${t.year}-${i}`} className="flex flex-col items-center rounded-xl bg-gradient-to-b from-flood/15 to-transparent p-3 text-center">
                      <TrophyImage src={t.icon} name={t.name} className="h-14 w-14" />
                      <span className="mt-2 font-head text-sm font-bold uppercase leading-tight">{t.name}</span>
                      <span className="label mt-0.5">{seasonLabel(t.year)} · {t.kind}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-chalk-dim">No silverware yet.</p>}
            </section>

            <section className="panel p-5">
              <SectionBanner title="Transfers" color="tangerine" />
              {transfers.length ? (
                <ul className="space-y-2">
                  {transfers.map((t, i) => (
                    <li key={i} className="flex items-center gap-2 rounded-lg bg-white/5 p-2">
                      <ClubCrest club={t.from_club} name={t.from_club_name} className="h-7 w-7" />
                      <Icon name="double_arrow" className="text-tangerine" />
                      <ClubCrest club={t.to_club} name={t.to_club_name} className="h-7 w-7" />
                      <span className="min-w-0 flex-1 truncate text-sm">{t.to_club_name}</span>
                      <span className="num text-lg text-flood">{t.type === 'loan' ? 'Loan' : formatFee(t.fee)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-chalk-dim">No moves logged in this universe.</p>}
            </section>
          </div>

          {timeline.length > 0 && (
            <section className="panel p-5">
              <SectionBanner title="Storylines" color="violet" />
              <ol className="space-y-2">
                {timeline.map((e, i) => (
                  <li key={i} className="flex gap-3 rounded-lg bg-white/5 p-3">
                    <span className="num text-flood">{seasonLabel(e.season_year)}</span>
                    <span>{e.description}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>
    </ThemeScope>
  )
}

export default function PlayerProfile() {
  const { career } = useOutletContext()
  const { id } = useParams()
  const state = useApi(career ? `/careers/${career.id}/players/${id}/profile` : null)
  if (!career) return <EmptyState icon="public" title="No universe selected" />
  return <Async state={state} loadingLabel="Pulling up the player">{(data) => <Profile data={data} />}</Async>
}
