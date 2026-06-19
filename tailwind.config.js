/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Outfit"', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          pink: '#ec4899',
          purple: '#a855f7',
          emerald: '#059669',
          dark: '#0f0f14',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.42s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-out-right': 'slideOutRight 0.38s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'fade-out': 'fadeOut 0.38s ease-in forwards',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'splash-fade': 'splashFade 0.9s ease-out both',
        'splash-scale': 'splashScale 1s cubic-bezier(0.16, 1, 0.3, 1) both',
        'splash-reveal': 'splashReveal 0.85s cubic-bezier(0.16, 1, 0.3, 1) both',
        'splash-bar-shine': 'splashBarShine 2.4s ease-in-out infinite',
        'luxury-float-a': 'luxuryFloatA 9s ease-in-out infinite',
        'luxury-float-b': 'luxuryFloatB 11s ease-in-out infinite alternate',
        'luxury-float-c': 'luxuryFloatC 13s ease-in-out infinite',
        'luxury-shimmer': 'luxuryShimmer 5.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideOutRight: {
          '0%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(100%)' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        splashFade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        splashScale: {
          '0%': { opacity: '0', transform: 'scale(0.86) translateY(18px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        splashReveal: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        splashBarShine: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(220%)' },
        },
        luxuryFloatA: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(10%, -12%) scale(1.1)' },
          '66%': { transform: 'translate(-8%, 8%) scale(0.92)' },
        },
        luxuryFloatB: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-12%, 10%) scale(1.14)' },
        },
        luxuryFloatC: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1) rotate(0deg)' },
          '40%': { transform: 'translate(8%, 6%) scale(1.08) rotate(6deg)' },
          '70%': { transform: 'translate(-6%, -4%) scale(0.96) rotate(-4deg)' },
        },
        luxuryShimmer: {
          '0%': { transform: 'translateX(-120%) skewX(-12deg)', opacity: '0' },
          '18%': { opacity: '1' },
          '55%': { opacity: '0.85' },
          '100%': { transform: 'translateX(280%) skewX(-12deg)', opacity: '0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
