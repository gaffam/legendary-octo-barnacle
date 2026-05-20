/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        paper: {
          cream: '#F7F3E9',
          warm: '#EDE4D3',
          toile: '#E8E0D0',
          aged: '#D9CDB8',
          dark: '#C9BEA8',
        },
        ink: {
          primary: '#1C1C28',
          secondary: '#4A4560',
          faded: '#7A7590',
          light: '#A8A5B8',
        },
        leather: {
          darkest: '#1A0F0A',
          dark: '#2C1810',
          medium: '#4A2C1A',
          light: '#6B4226',
          tan: '#8B6B4A',
        },
        pineider: {
          navy: '#1B2B5E',
          bordeaux: '#8B2635',
          gold: '#C4A35A',
          cream: '#F0EBE0',
          'capri-blue': '#2E4B8F',
        },
        crown: {
          blue: '#1B3A6B',
          cream: '#F5F0E4',
        },
        lalo: {
          velin: '#F4F0E6',
          toile: '#EAE4D6',
        }
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Garamond', 'Georgia', 'serif'],
        body: ['EB Garamond', 'Garamond', 'Georgia', 'serif'],
        ui: ['Crimson Pro', 'Crimson Text', 'Georgia', 'serif'],
        mono: ['Courier New', 'monospace'],
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
      },
      boxShadow: {
        'paper': '0 2px 8px rgba(28,28,40,0.08), 0 1px 3px rgba(28,28,40,0.04)',
        'paper-lg': '0 8px 32px rgba(28,28,40,0.12), 0 2px 8px rgba(28,28,40,0.08)',
        'inset-paper': 'inset 0 1px 4px rgba(28,28,40,0.06)',
        'leather': '2px 0 12px rgba(26,15,10,0.4)',
        'glow-amber': '0 0 8px rgba(196,163,90,0.4), 0 0 16px rgba(196,163,90,0.2)',
        'glow-ink': '0 0 4px rgba(28,28,40,0.2)',
      },
      animation: {
        'cursor-blink': 'cursorBlink 1.1s ease-in-out infinite',
        'letter-in': 'letterIn 0.04s ease-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'page-turn': 'pageTurn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'ink-spread': 'inkSpread 0.6s ease-out forwards',
        'dust': 'dustFloat 3s ease-in-out infinite',
      },
      keyframes: {
        cursorBlink: {
          '0%, 45%': { opacity: '1', boxShadow: '0 0 6px rgba(196,163,90,0.6)' },
          '55%, 100%': { opacity: '0', boxShadow: 'none' },
        },
        letterIn: {
          '0%': { opacity: '0.4', transform: 'translateY(0.5px) scale(0.99)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pageTurn: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        inkSpread: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '60%': { opacity: '1', transform: 'scale(1.01)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        dustFloat: {
          '0%, 100%': { transform: 'translateY(0) translateX(0)', opacity: '0.3' },
          '50%': { transform: 'translateY(-4px) translateX(2px)', opacity: '0.6' },
        }
      },
      backgroundImage: {
        'paper-grain': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
        'leather-grain': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E\")",
      }
    },
  },
  plugins: [],
}
