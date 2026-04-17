/***** Tailwind Config for TPPRover *****/
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'sans-serif'],
      },
      screens: {
        'xs': '475px',
      },
      keyframes: {
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-10px)', opacity: '0' },
        },
        'slide-right': {
          '0%': { transform: 'translateX(10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-left': {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(10px)', opacity: '0' },
        },
        'fadeIn': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scaleIn': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'fab-dial-in': {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.7)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'fab-dial-out': {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(12px) scale(0.7)' },
        },
        'wave': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'scale-needle': {
          '0%': { transform: 'rotate(-30deg)' },
          '60%': { transform: 'rotate(calc(var(--needle-deg) + 4deg))' },
          '80%': { transform: 'rotate(calc(var(--needle-deg) - 2deg))' },
          '100%': { transform: 'rotate(var(--needle-deg))' },
        },
        'digit-tick': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-down': 'slide-down 0.2s ease-out',
        'slide-up': 'slide-up 0.2s ease-in',
        'slide-right': 'slide-right 0.2s ease-out',
        'slide-left': 'slide-left 0.2s ease-in',
        'fadeIn': 'fadeIn 0.2s ease-out',
        'scaleIn': 'scaleIn 0.3s ease-out',
        'fab-dial-in': 'fab-dial-in 0.22s ease-out forwards',
        'fab-dial-out': 'fab-dial-out 0.18s ease-in forwards',
        'wave': 'wave 3s linear infinite',
        'scale-needle': 'scale-needle 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'digit-tick': 'digit-tick 0.25s ease-out forwards',
      }
    }
  },
  plugins: []
}