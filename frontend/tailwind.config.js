/** @type {import('tailwindcss').Config} */

// Colours are CSS variables (src/index.css) so club pages can re-skin themselves at runtime.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        night: { DEFAULT: v('night'), 800: v('night-800'), 700: v('night-700'), 600: v('night-600') },
        chalk: { DEFAULT: v('chalk'), dim: v('chalk-dim') },
        pitch: v('pitch'),
        flood: v('flood'),
        derby: v('derby'),
        cyan: v('cyan'),
        violet: v('violet'),
        tangerine: v('tangerine'),
        pink: v('pink'),
        club: { 1: v('club-1'), 2: v('club-2'), 3: v('club-3'), ink: v('club-ink') },
        pos: { gk: v('pos-gk'), def: v('pos-def'), mid: v('pos-mid'), att: v('pos-att') },
      },
      fontFamily: {
        display: ['Anton', 'Impact', 'sans-serif'],
        head: ['"Barlow Condensed"', '"Arial Narrow"', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        micro: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.08em' }],
        mega: ['clamp(3rem, 9vw, 7.5rem)', { lineHeight: '0.85' }],
        giant: ['clamp(2.25rem, 5vw, 4.5rem)', { lineHeight: '0.9' }],
      },
      keyframes: {
        ticker: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        rise: { from: { opacity: 0, transform: 'translateY(14px)' }, to: { opacity: 1, transform: 'none' } },
        sweep: { from: { transform: 'translateX(-120%) skewX(-20deg)' }, to: { transform: 'translateX(320%) skewX(-20deg)' } },
        fill: { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
        bounceball: {
          '0%,100%': { transform: 'translateY(0) scale(1.1, 0.9)' },
          '50%': { transform: 'translateY(-28px) scale(1)' },
        },
      },
      animation: {
        ticker: 'ticker 60s linear infinite',
        rise: 'rise .45s cubic-bezier(.2,.8,.2,1) both',
        sweep: 'sweep 2.8s ease-in-out infinite',
        fill: 'fill .9s cubic-bezier(.2,.8,.2,1) both',
        bounceball: 'bounceball .7s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
