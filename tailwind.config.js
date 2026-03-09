/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      /* ── Color System ── */
      colors: {
        // Brand
        'deep-navy': '#0F172A',

        // Primary (Verde Reparto)
        primary: {
          50:  '#ECFDF7',
          100: '#D1FAF0',
          200: '#A7F3E0',
          300: '#6EE7C7',
          400: '#34D3A9',
          500: '#00E8A2',
          600: '#00C98A',
          700: '#009E6C',
          800: '#007A54',
          900: '#005C3F',
          DEFAULT: '#00E8A2',
        },

        // Accent (Coral urgente)
        accent: {
          50:  '#FFF1F2',
          100: '#FFE4E5',
          200: '#FECDD0',
          300: '#FCA5A8',
          400: '#F87175',
          500: '#FF5A5F',
          600: '#E84449',
          700: '#C0303A',
          800: '#9F1E28',
          900: '#7F1523',
          DEFAULT: '#FF5A5F',
        },

        // Success
        success: {
          50:  '#F0FDF4',
          100: '#DCFCE7',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          DEFAULT: '#22C55E',
        },

        // Danger
        danger: {
          50:  '#FEF2F2',
          100: '#FEE2E2',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          DEFAULT: '#EF4444',
        },

        // Surface (Glass card backgrounds)
        surface: {
          light: 'rgba(255, 255, 255, 0.92)',
          dark:  'rgba(15, 23, 42, 0.92)',
        },
      },

      /* ── Typography ── */
      fontFamily: {
        sans:    ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
      },
      fontSize: {
        'xxs': ['0.625rem', { lineHeight: '0.875rem' }],  // 10px
      },

      /* ── Shadows ── */
      boxShadow: {
        'glass':    '0 4px 24px -1px rgba(0, 0, 0, 0.06), 0 2px 8px -2px rgba(0, 0, 0, 0.04)',
        'glass-lg': '0 8px 40px -4px rgba(0, 0, 0, 0.08), 0 4px 16px -4px rgba(0, 0, 0, 0.04)',
        'card':     '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 10px 30px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
        'btn':      '0 1px 2px rgba(0, 0, 0, 0.05)',
        'btn-primary': '0 4px 14px -2px rgba(0, 232, 162, 0.35)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      },

      /* ── Border Radius ── */
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },

      /* ── Animations ── */
      animation: {
        'fade-in':      'fadeIn 0.4s ease-out',
        'fade-in-up':   'fadeInUp 0.5s ease-out',
        'slide-up':     'slideUp 0.35s ease-out',
        'slide-down':   'slideDown 0.35s ease-out',
        'scale-in':     'scaleIn 0.25s ease-out',
        'pulse-soft':   'pulseSoft 2s ease-in-out infinite',
        'shimmer':      'shimmer 2s linear infinite',
        'bounce-in':    'bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%':   { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%':   { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.7' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceIn: {
          '0%':   { transform: 'scale(0.9)', opacity: '0' },
          '50%':  { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },

      /* ── Transitions ── */
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'smooth':    'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      /* ── Spacing ── */
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
