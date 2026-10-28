import { Link } from 'react-router-dom'
import { clubVars } from '../lib/theme'
import { playerName } from '../lib/format'
import { ClubCrest, PlayerFace } from './media'
import { Flag, Icon, PositionChip, RatingBadge } from './ui'

/** Re-skins everything inside with a club's kit colours (via --club-* variables). */
export function ThemeScope({ club, className = '', children }) {
  return (
    <div className={className} style={clubVars(club)}>
      {children}
    </div>
  )
}

/** LED advertising-board ticker. Items are duplicated so the loop is seamless. */
export function Ticker({ items }) {
  if (!items?.length) return null
  const row = items.map((it, i) => (
    <span key={i} className="flex shrink-0 items-center gap-3 px-6">
      <span className="h-2 w-2 rotate-45 bg-flood" aria-hidden="true" />
      <span className="font-head text-sm font-bold uppercase tracking-wide">{it}</span>
    </span>
  ))
  return (
    <div className="relative flex h-8 items-center overflow-hidden border-y border-flood/40 bg-black/60" aria-label="Latest headlines">
      <div className="z-10 flex h-full shrink-0 items-center bg-derby px-3 font-head text-sm font-black uppercase italic">
        Latest
      </div>
      <div className="mask-fade-r flex min-w-0 flex-1 overflow-hidden">
        <div className="flex w-max animate-ticker hover:[animation-play-state:paused]">
          {row}
          <span aria-hidden="true" className="flex">{row}</span>
        </div>
      </div>
    </div>
  )
}

/** TV lower-third name strap. */
export function LowerThird({ title, subtitle, className = '' }) {
  return (
    <div className={`flex items-stretch ${className}`}>
      <div className="skew-plate bg-club-1 px-5 py-2 text-club-ink shadow-xl">
        <div className="unskew font-display text-3xl uppercase leading-none sm:text-5xl">{title}</div>
      </div>
      {subtitle && (
        <div className="skew-plate -ml-1 hidden items-center bg-chalk px-4 text-night sm:flex">
          <div className="unskew font-head text-lg font-extrabold uppercase italic">{subtitle}</div>
        </div>
      )}
    </div>
  )
}

/** Faint pitch markings for hero backgrounds. */
export function PitchLines({ className = '' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}>
      <g fill="none" stroke="rgb(255 255 255 / .14)" strokeWidth="2">
        <rect x="8" y="8" width="384" height="244" />
        <line x1="200" y1="8" x2="200" y2="252" />
        <circle cx="200" cy="130" r="38" />
        <rect x="8" y="70" width="58" height="120" />
        <rect x="334" y="70" width="58" height="120" />
        <rect x="8" y="104" width="20" height="52" />
        <rect x="372" y="104" width="20" height="52" />
      </g>
    </svg>
  )
}

const TIER_BG = {
  elite: 'from-[#1a0b3d] via-[#5b2bd6] to-[#00b8d4] text-chalk',
  gold: 'from-[#fff6b5] via-[#f4c430] to-[#b8860b] text-night',
  silver: 'from-[#ffffff] via-[#cfd5df] to-[#8b95a7] text-night',
  bronze: 'from-[#f7c99b] via-[#c98552] to-[#7a4520] text-night',
}

/** FUT-style player card. */
export function FutCard({ player, to, size = 'md' }) {
  const ovr = player.overall ?? 0
  const tier = ovr >= 88 ? 'elite' : ovr >= 75 ? 'gold' : ovr >= 65 ? 'silver' : 'bronze'
  const big = size === 'lg'
  const body = (
    <div className={`group relative overflow-hidden rounded-[18px] bg-gradient-to-b p-[3px] shadow-[0_18px_40px_-14px_rgb(0_0_0/.8)] transition duration-200 hover:-translate-y-1 hover:rotate-[-1deg] ${TIER_BG[tier]} ${big ? 'w-64' : ''}`}>
      <div className={`relative overflow-hidden rounded-[15px] bg-gradient-to-b ${TIER_BG[tier]}`}>
        <div className="halftone absolute inset-0 opacity-40" aria-hidden="true" />
        <div aria-hidden="true" className="absolute inset-y-0 -left-1/2 w-1/3 animate-sweep bg-white/30 opacity-0 group-hover:opacity-100" />
        <div className={`relative flex ${big ? 'h-56' : 'h-40'}`}>
          <div className="z-10 flex flex-col items-center gap-1 pl-3 pt-3">
            <span className={`num leading-none ${big ? 'text-6xl' : 'text-4xl'}`}>{ovr || '–'}</span>
            <span className="font-head text-lg font-black uppercase leading-none">{player.position || '—'}</span>
            <Flag code={player.nation_code} title={player.nationality} className="mt-1 h-3.5 w-5" />
            {player.club && <ClubCrest club={player.club} className="h-6 w-6" />}
          </div>
          <PlayerFace gameId={player.game_id} name={playerName(player)} className={`absolute bottom-0 right-0 ${big ? 'h-52 w-52' : 'h-36 w-36'}`} />
        </div>
        <div className="relative bg-black/15 px-3 pb-3 pt-2 text-center">
          <div className={`truncate font-head font-black uppercase italic leading-tight ${big ? 'text-3xl' : 'text-xl'}`}>{playerName(player)}</div>
          <div className="mt-1 flex items-center justify-center gap-2 text-xs font-bold uppercase opacity-80">
            <span>POT {player.potential ?? '–'}</span>
            {player.age && <span>· {player.age} yrs</span>}
            {player.player_type === 'youth' && <span className="rounded bg-pitch px-1 text-night">Academy</span>}
            {player.player_type === 'regen' && <span className="rounded bg-violet px-1 text-chalk">Regen</span>}
          </div>
        </div>
      </div>
    </div>
  )
  return to ? <Link to={to} className="block rounded-[18px]" aria-label={`${playerName(player)}, ${ovr} rated ${player.position || ''}`}>{body}</Link> : body
}

/** Compact player row for lists. */
export function PlayerRow({ player, to }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-white/5">
      <RatingBadge value={player.overall} size="sm" />
      <PlayerFace gameId={player.game_id} name={playerName(player)} className="h-10 w-10" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{playerName(player)}</div>
        <div className="flex items-center gap-2 text-xs text-chalk-dim">
          <Flag code={player.nation_code} title={player.nationality} className="h-3 w-4" />
          {player.age ? `${player.age} yrs` : null}
        </div>
      </div>
      <PositionChip pos={player.position} />
      <Icon name="chevron_right" className="text-chalk-dim" />
    </Link>
  )
}
