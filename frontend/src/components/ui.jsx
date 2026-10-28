import { POSITION_GROUP, ratingTier, statColor } from '../lib/format'

export function Icon({ name, className = '', fill = false }) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined select-none leading-none ${className}`}
      style={fill ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  )
}

/** Slanted broadcast banner used as a section heading. */
export function SectionBanner({ kicker, title, color = 'flood', right, as: Tag = 'h2' }) {
  const bg = { flood: 'bg-flood text-night', pitch: 'bg-pitch text-night', derby: 'bg-derby text-chalk', cyan: 'bg-cyan text-night', violet: 'bg-violet text-chalk', tangerine: 'bg-tangerine text-night', club: 'bg-club-1 text-club-ink', pink: 'bg-pink text-night' }[color]
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-stretch">
        <div className={`skew-plate px-4 py-1.5 ${bg}`}>
          <Tag className="unskew text-2xl leading-none sm:text-3xl">{title}</Tag>
        </div>
        {kicker && (
          <div className="skew-plate -ml-1 hidden bg-night-700 px-3 py-1.5 sm:block">
            <span className="unskew label block pt-1 text-chalk">{kicker}</span>
          </div>
        )}
      </div>
      {right}
    </div>
  )
}

/** Big page header: outlined echo text behind a solid title. */
export function PageHeader({ kicker, title, children, accent = 'flood' }) {
  const accentText = { flood: 'text-flood', pitch: 'text-pitch', derby: 'text-derby', cyan: 'text-cyan', violet: 'text-violet', club: 'text-club-1', tangerine: 'text-tangerine', pink: 'text-pink' }[accent]
  return (
    <header className="relative mb-8 animate-rise">
      <p className={`label mb-2 flex items-center gap-2 ${accentText}`}>
        <span className="inline-block h-2 w-8 bg-current" /> {kicker}
      </p>
      <div className="relative overflow-x-clip">
        <span aria-hidden="true" className="text-outline pointer-events-none absolute -top-5 left-1 hidden select-none whitespace-nowrap font-display text-mega uppercase opacity-20 md:block">
          {title}
        </span>
        <h1 className="relative font-display text-giant font-normal not-italic uppercase">{title}</h1>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </header>
  )
}

export function PillGroup({ label, options, value, onChange }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-lg bg-night-800 p-1 ring-1 ring-white/10">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`rounded-md px-3 py-1.5 font-head text-sm font-bold uppercase tracking-wide transition ${
              active ? `${o.activeClass || 'bg-flood text-night'} shadow` : 'text-chalk-dim hover:bg-white/5 hover:text-chalk'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Tabs({ tabs, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {tabs.map((t) => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={`skew-plate shrink-0 px-5 py-2 transition ${active ? 'bg-club-1 text-club-ink' : 'bg-night-700 text-chalk-dim hover:bg-night-600 hover:text-chalk'}`}
          >
            <span className="unskew flex items-center gap-2 font-head text-base font-extrabold uppercase italic">
              {t.icon && <Icon name={t.icon} className="text-lg" />} {t.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function RatingBadge({ value, size = 'md', label }) {
  const tier = ratingTier(value)
  const styles = {
    elite: 'bg-gradient-to-br from-[#2b1055] via-[#7c4dff] to-[#00e5ff] text-chalk ring-cyan/60',
    gold: 'bg-gradient-to-br from-[#fff3a0] via-[#ffd23f] to-[#c8961e] text-night ring-flood/60',
    silver: 'bg-gradient-to-br from-[#f2f4f8] via-[#c4cad6] to-[#8a93a6] text-night ring-white/40',
    bronze: 'bg-gradient-to-br from-[#f3c08b] via-[#c6814a] to-[#7d4a24] text-night ring-tangerine/40',
  }[tier]
  const dims = { sm: 'h-8 w-8 text-lg', md: 'h-11 w-11 text-2xl', lg: 'h-16 w-16 text-4xl' }[size]
  return (
    <span className={`num inline-flex shrink-0 items-center justify-center rounded-lg ring-2 ${styles} ${dims}`} title={label || `${tier} rating`}>
      {value ?? '–'}
    </span>
  )
}

const POS_STYLE = {
  gk: 'bg-pos-gk text-night',
  def: 'bg-pos-def text-chalk',
  mid: 'bg-pos-mid text-night',
  att: 'bg-pos-att text-chalk',
}

export function PositionChip({ pos, className = '' }) {
  if (!pos) return null
  return <span className={`chip ${POS_STYLE[POSITION_GROUP[pos]] || 'bg-night-600 text-chalk'} ${className}`}>{pos}</span>
}

export function StatBar({ label, value, max = 99, delay = 0 }) {
  const pct = Math.max(0, Math.min(100, ((value || 0) / max) * 100))
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-head text-sm font-bold uppercase tracking-wide text-chalk-dim">{label}</span>
        <span className="num text-lg" style={{ color: statColor(value) }}>{value ?? '–'}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-sm bg-white/10">
        <div
          className="h-full origin-left animate-fill rounded-sm"
          style={{ width: `${pct}%`, background: statColor(value), animationDelay: `${delay}ms` }}
        />
      </div>
    </div>
  )
}

/** Stat tile: label + huge number, coloured top edge. */
export function StatTile({ label, value, sub, color = 'flood', icon }) {
  const edge = { flood: 'border-flood', pitch: 'border-pitch', derby: 'border-derby', cyan: 'border-cyan', violet: 'border-violet', tangerine: 'border-tangerine', club: 'border-club-1', pink: 'border-pink' }[color]
  const text = { flood: 'text-flood', pitch: 'text-pitch', derby: 'text-derby', cyan: 'text-cyan', violet: 'text-violet', tangerine: 'text-tangerine', club: 'text-club-1', pink: 'text-pink' }[color]
  return (
    <div className={`panel overflow-hidden border-t-4 p-4 ${edge}`}>
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        {icon && <Icon name={icon} className={`text-2xl ${text}`} />}
      </div>
      <div className={`num mt-1 text-4xl ${text}`}>{value ?? '—'}</div>
      {sub && <div className="mt-1 text-sm text-chalk-dim">{sub}</div>}
    </div>
  )
}

export function Flag({ code, title, className = 'h-4 w-6' }) {
  if (!code) return null
  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      alt={title || code}
      title={title}
      loading="lazy"
      className={`inline-block rounded-sm object-cover ring-1 ring-black/30 ${className}`}
      onError={(e) => { e.currentTarget.style.display = 'none' }}
    />
  )
}

export function Loader({ label = 'Loading' }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-24">
      <div className="relative h-14 w-14">
        <div className="absolute left-1/2 top-0 h-9 w-9 -translate-x-1/2 animate-bounceball rounded-full bg-chalk shadow-[inset_-6px_-6px_0_rgb(0_0_0/.25)]">
          <Icon name="sports_soccer" className="text-[36px] text-night" />
        </div>
        <div className="absolute bottom-0 left-1/2 h-1.5 w-8 -translate-x-1/2 rounded-full bg-black/50 blur-[1px]" />
      </div>
      <span className="label">{label}…</span>
    </div>
  )
}

export function EmptyState({ icon = 'sports', title, children }) {
  return (
    <div className="panel halftone flex flex-col items-center gap-2 px-6 py-14 text-center">
      <Icon name={icon} className="text-5xl text-chalk-dim" />
      <p className="font-head text-2xl font-extrabold uppercase italic">{title}</p>
      {children && <div className="max-w-md text-chalk-dim">{children}</div>}
    </div>
  )
}

export function ErrorState({ error, title = 'Red card!' }) {
  return (
    <div role="alert" className="panel flex items-start gap-4 border-l-8 border-derby p-5">
      <div className="h-12 w-9 shrink-0 rotate-6 rounded-sm bg-derby shadow-lg" aria-hidden="true" />
      <div>
        <p className="font-head text-2xl font-extrabold uppercase italic text-derby">{title}</p>
        <p className="text-chalk-dim">{error?.message || String(error)}</p>
      </div>
    </div>
  )
}

/** Renders loading / error states for a useApi result, otherwise children(data). */
export function Async({ state, children, loadingLabel }) {
  if (state.loading && !state.data) return <Loader label={loadingLabel} />
  if (state.error) return <ErrorState error={state.error} />
  if (!state.data) return null
  return children(state.data)
}
