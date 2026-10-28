// Club kit colours -> CSS variables, with guards so near-black/near-white kits stay visible.

const hexToRgb = (hex) => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '')
  return m ? m.slice(1).map((x) => parseInt(x, 16)) : null
}

const luminance = ([r, g, b]) => {
  const c = [r, g, b].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

const FALLBACK = { 1: [0, 200, 83], 2: [255, 230, 0], 3: [124, 77, 255] }

/** Pick the kit colour that pops most on the dark night background as --club-1. */
export function clubVars(club) {
  const colors = [club?.color_primary, club?.color_secondary, club?.color_tertiary].map(hexToRgb)
  if (!colors[0]) {
    return { '--club-1': FALLBACK[1].join(' '), '--club-2': FALLBACK[2].join(' '), '--club-3': FALLBACK[3].join(' '), '--club-ink': '7 11 31' }
  }
  const usable = colors.filter(Boolean)
  // Prefer a colour that isn't almost black (invisible on navy) for the accent
  const ordered = [...usable].sort((a, b) => {
    const score = (c) => (luminance(c) < 0.03 ? -1 : 0)
    return score(b) - score(a)
  })
  const c1 = ordered[0]
  const c2 = ordered.find((c) => c !== c1) || FALLBACK[2]
  const c3 = ordered.find((c) => c !== c1 && c !== c2) || FALLBACK[3]
  return {
    '--club-1': c1.join(' '),
    '--club-2': c2.join(' '),
    '--club-3': c3.join(' '),
    '--club-ink': luminance(c1) > 0.4 ? '7 11 31' : '248 249 255',
  }
}
