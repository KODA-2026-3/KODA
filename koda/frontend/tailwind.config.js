/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        // Azul institucional KODA (barra lateral, botones primarios, titulos)
        navy: {
          50: '#F2F6FB',
          100: '#E3ECF6',
          200: '#C2D5E9',
          300: '#93B2D3',
          400: '#5A82B0',
          500: '#33608F',
          600: '#234A73',
          700: '#1E3A5F',
          800: '#183050',
          900: '#132741',
          950: '#0D1B2E'
        },
        // Fondo de la aplicacion y bordes neutros
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F5F7FA',
          border: '#E2E8F0'
        },
        // Escala Kellgren-Lawrence (G0 normal -> G4 severo)
        kl: {
          0: '#16A34A',
          1: '#65A30D',
          2: '#D97706',
          3: '#EA580C',
          4: '#DC2626'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.06)',
        modal: '0 20px 45px -10px rgba(15, 23, 42, 0.35)'
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'scale-in': 'scale-in 180ms ease-out'
      }
    }
  },
  plugins: []
};
