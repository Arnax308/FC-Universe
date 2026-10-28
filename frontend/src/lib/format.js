export function formatFee(fee) {
  if (!fee) return 'Free'
  if (fee >= 1e6) return `€${(fee / 1e6).toFixed(fee >= 1e8 ? 0 : 1)}M`
  if (fee >= 1e3) return `€${Math.round(fee / 1e3)}K`
  return `€${fee}`
}

export function formatMoney(amount) {
  if (amount === null || amount === undefined) return '—'
  const sign = amount < 0 ? '-' : ''
  return sign + formatFee(Math.abs(amount)).replace('Free', '€0')
}

export const playerName = (p) =>
  p?.known_name || [p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'Unknown Player'

export const surname = (name = '') => {
  const parts = name.trim().split(/\s+/)
  return parts.length > 1 ? parts.slice(1).join(' ') : name
}

export const seasonLabel = (year) => (year ? `${year}/${String((year + 1) % 100).padStart(2, '0')}` : '—')

export function ordinal(n) {
  if (!n) return '—'
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export const POSITION_GROUP = {
  GK: 'gk',
  CB: 'def', LB: 'def', RB: 'def', LWB: 'def', RWB: 'def',
  CDM: 'mid', CM: 'mid', CAM: 'mid', LM: 'mid', RM: 'mid',
  ST: 'att', CF: 'att', LW: 'att', RW: 'att',
}

/** FUT-style card tier for a rating. */
export function ratingTier(ovr = 0) {
  if (ovr >= 88) return 'elite'
  if (ovr >= 75) return 'gold'
  if (ovr >= 65) return 'silver'
  return 'bronze'
}

/** Colour for an attribute value (0-99). */
export function statColor(v = 0) {
  if (v >= 85) return 'rgb(var(--pitch))'
  if (v >= 75) return '#9be15d'
  if (v >= 65) return 'rgb(var(--flood))'
  if (v >= 50) return 'rgb(var(--tangerine))'
  return 'rgb(var(--derby))'
}
