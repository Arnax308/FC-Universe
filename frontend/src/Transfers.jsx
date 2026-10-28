import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { qs, useApi } from './lib/api'
import { formatFee, formatMoney, seasonLabel } from './lib/format'
import { ThemeScope } from './components/broadcast'
import { ClubCrest, PlayerFace } from './components/media'
import { Async, EmptyState, Icon, PageHeader, PillGroup, PositionChip, RatingBadge, StatTile } from './components/ui'

const TYPE_STYLE = {
  buy: { label: 'Signed', cls: 'bg-pitch text-night' },
  loan: { label: 'Loan', cls: 'bg-cyan text-night' },
  free: { label: 'Free', cls: 'bg-violet text-chalk' },
  release: { label: 'Released', cls: 'bg-derby text-chalk' },
}

function Deal({ t, i }) {
  const style = TYPE_STYLE[t.type] || { label: t.type, cls: 'bg-night-600' }
  return (
    <li className="animate-rise" style={{ animationDelay: `${Math.min(i, 20) * 30}ms` }}>
      <ThemeScope club={t.to_club}>
        <div className="relative overflow-hidden rounded-xl bg-night-800 ring-1 ring-white/10">
          <div className="stripes absolute inset-y-0 right-0 w-2" aria-hidden="true" />
          <div className="grid grid-cols-[auto_1fr] items-center gap-3 p-3 sm:grid-cols-[auto_1fr_auto_auto] sm:gap-5 sm:p-4">
            <div className="relative">
              <PlayerFace gameId={t.player_game_id} name={t.player_name} className="h-14 w-14 rounded-full bg-night-700" />
              <span className="absolute -bottom-1 -right-1"><RatingBadge value={t.player_overall} size="sm" /></span>
            </div>
            <div className="min-w-0">
              <Link to={`/players/${t.player_id}`} className="block truncate font-head text-xl font-black uppercase italic hover:underline">{t.player_name}</Link>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                <PositionChip pos={t.player_position} />
                <span className={`chip ${style.cls}`}>{style.label}</span>
                <span className="text-chalk-dim">{seasonLabel(t.season_year)}</span>
              </div>
            </div>
            <div className="col-span-2 flex items-center justify-center gap-2 sm:col-span-1">
              <Link to={t.from_club ? `/clubs/${t.from_club.id}` : '#'} className="flex items-center gap-2" title={t.from_club_name}>
                <ClubCrest club={t.from_club} name={t.from_club_name} className="h-10 w-10" />
              </Link>
              <Icon name="keyboard_double_arrow_right" className="text-4xl text-flood" />
              <Link to={t.to_club ? `/clubs/${t.to_club.id}` : '#'} className="flex items-center gap-2" title={t.to_club_name}>
                <ClubCrest club={t.to_club} name={t.to_club_name} className="h-10 w-10" />
              </Link>
            </div>
            <div className="col-span-2 text-right sm:col-span-1">
              <div className="num text-3xl text-flood">{t.type === 'loan' ? 'LOAN' : formatFee(t.fee)}</div>
              <div className="label truncate">to {t.to_club_name || '—'}</div>
            </div>
          </div>
        </div>
      </ThemeScope>
    </li>
  )
}

export default function Transfers() {
  const { career } = useOutletContext()
  const [type, setType] = useState('')
  const state = useApi(career ? `/careers/${career.id}/transfers${qs({ limit: 300, type })}` : null)
  if (!career) return <EmptyState icon="public" title="No universe selected" />

  return (
    <div>
      <div className="hazard -mx-4 mb-6 h-3 sm:-mx-6" aria-hidden="true" />
      <PageHeader kicker="Deadline day · live" title="Transfer centre" accent="tangerine" />

      <Async state={state} loadingLabel="Ringing agents">
        {(list) => {
          const fees = list.filter((t) => t.type === 'buy').map((t) => t.fee || 0)
          const record = list.reduce((best, t) => (t.type === 'buy' && (t.fee || 0) > (best?.fee || 0) ? t : best), null)
          return (
            <>
              <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile label="Deals" value={list.length} color="tangerine" icon="handshake" />
                <StatTile label="Total fees" value={formatMoney(fees.reduce((a, b) => a + b, 0))} color="flood" icon="payments" />
                <StatTile label="Loans" value={list.filter((t) => t.type === 'loan').length} color="cyan" icon="sync_alt" />
                <StatTile label="Record deal" value={record ? formatFee(record.fee) : '—'} sub={record?.player_name} color="derby" icon="local_fire_department" />
              </div>
              <div className="mb-6">
                <PillGroup label="Deal type" value={type} onChange={setType} options={[
                  { value: '', label: 'All deals' },
                  { value: 'buy', label: 'Signings', activeClass: 'bg-pitch text-night' },
                  { value: 'loan', label: 'Loans', activeClass: 'bg-cyan text-night' },
                  { value: 'free', label: 'Free agents', activeClass: 'bg-violet text-chalk' },
                  { value: 'release', label: 'Releases', activeClass: 'bg-derby text-chalk' },
                ]} />
              </div>
              {list.length ? (
                <ul className="space-y-3">{list.map((t, i) => <Deal key={t.id} t={t} i={i} />)}</ul>
              ) : (
                <EmptyState icon="swap_horiz" title="The window is quiet">
                  Moves are spotted by comparing saves — play on, save, and re-sync this universe to see who changed clubs.
                </EmptyState>
              )}
            </>
          )
        }}
      </Async>
    </div>
  )
}
