import { useState } from 'react'
import { Icon } from './ui'

/** Club crest from the image proxy, falling back to a kit-coloured shield with initials. */
export function ClubCrest({ club, gameId, name, className = 'h-10 w-10' }) {
  const [failed, setFailed] = useState(false)
  const id = gameId ?? club?.game_id
  const label = name ?? club?.name ?? 'Club'
  if (failed || id === null || id === undefined) {
    const initials = label.replace(/\(W\)/, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    return (
      <svg viewBox="0 0 40 46" role="img" aria-label={label} className={className}>
        <path d="M20 1 38 7v15c0 12-8 20-18 23C10 42 2 34 2 22V7z" fill={club?.color_primary || 'rgb(var(--night-600))'} stroke={club?.color_secondary || 'rgb(var(--chalk))'} strokeWidth="2.5" />
        <text x="20" y="28" textAnchor="middle" fontFamily="Anton, sans-serif" fontSize="14" fill={club?.color_secondary || '#fff'}>{initials}</text>
      </svg>
    )
  }
  return (
    <img
      src={`/api/images/club/${id}`}
      alt={label}
      loading="lazy"
      className={`object-contain drop-shadow-[0_4px_8px_rgb(0_0_0/.5)] ${className}`}
      onError={() => setFailed(true)}
    />
  )
}

/** Player face, falling back to a silhouette on a club-coloured disc. */
export function PlayerFace({ gameId, name, className = 'h-12 w-12' }) {
  const [failed, setFailed] = useState(false)
  if (failed || !gameId) {
    return (
      <div role="img" aria-label={name} className={`flex items-end justify-center overflow-hidden rounded-full bg-gradient-to-b from-club-1/60 to-night-600 ${className}`}>
        <Icon name="person" fill className="translate-y-[12%] text-[3em] text-chalk/70" />
      </div>
    )
  }
  return (
    <img
      src={`/api/images/player/${gameId}`}
      alt={name}
      loading="lazy"
      className={`object-contain ${className}`}
      onError={() => setFailed(true)}
    />
  )
}

export function TrophyImage({ src, name, className = 'h-16 w-16' }) {
  const [failed, setFailed] = useState(false)
  if (failed || !src) {
    return <Icon name="trophy" fill className={`flex items-center justify-center text-5xl text-flood ${className}`} />
  }
  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      className={`object-contain drop-shadow-[0_8px_16px_rgb(255_230_0/.35)] ${className}`}
      onError={() => setFailed(true)}
    />
  )
}
