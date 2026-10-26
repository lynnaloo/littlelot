import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink:      '#1C2B1E',
        'ink-2':  '#4A5C4D',
        'ink-3':  '#7A8C7D',
        accent:   '#4A7C59',
        'accent-lt': '#EAF2EC',
        'accent-mid': '#6B9E78',
        tan:      '#C8B89A',
        'tan-lt': '#F0EDE6',
        surface:  '#F7F4EF',
        border:   '#DDD8CF',
        amber:    '#C47D2A',
        'amber-lt': '#FDF4E7',
        danger:   '#E8422A',
        'danger-lt': '#FDF0EE',
      },
      fontFamily: {
        sans:   ['Inter', 'system-ui', 'sans-serif'],
        serif:  ['DM Serif Display', 'Georgia', 'serif'],
      },
      borderRadius: {
        DEFAULT: '6px',
      },
    },
  },
  plugins: [],
}

export default config
