import type { Config } from 'tailwindcss'

export default {
  prefix: 'tw-',
  corePlugins: {
    preflight: false
  },
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        space: {
          black: '#020617',
          navy: '#0f172a',
          cyan: '#22d3ee',
          purple: '#581c87',
          gold: '#facc15'
        }
      }
    }
  },
  plugins: []
} satisfies Config
