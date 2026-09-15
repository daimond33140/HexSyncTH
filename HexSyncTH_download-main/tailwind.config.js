/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0B0F19',
          800: '#111827',
          700: '#1F2937',
          600: '#374151',
        },
        brand: {
          cyan: '#00f0ff',
          purple: '#7000ff',
          green: '#10b981',
          red: '#ef4444',
          amber: '#f59e0b',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-pattern': 'radial-gradient(circle at 50% 0%, rgba(112, 0, 255, 0.15), transparent 70%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-green': 'glowGreen 2s ease-in-out infinite alternate',
        'glow-red': 'glowRed 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glowGreen: {
          '0%': { boxShadow: '0 0 5px rgba(16, 185, 129, 0.4), 0 0 10px rgba(16, 185, 129, 0.2)' },
          '100%': { boxShadow: '0 0 15px rgba(16, 185, 129, 0.8), 0 0 25px rgba(16, 185, 129, 0.4)' },
        },
        glowRed: {
          '0%': { boxShadow: '0 0 5px rgba(239, 68, 68, 0.4), 0 0 10px rgba(239, 68, 68, 0.2)' },
          '100%': { boxShadow: '0 0 15px rgba(239, 68, 68, 0.8), 0 0 25px rgba(239, 68, 68, 0.4)' },
        }
      }
    },
  },
  plugins: [],
};
