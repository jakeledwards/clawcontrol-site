/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,njk,md}"],
  theme: {
    extend: {
      colors: {
        deep: '#06080a',
        primary: '#0d1117',
        elevated: '#161b22',
        hovbg: '#21262d',
        active: '#30363d',
        cyan: { DEFAULT: '#00d9ff', dim: '#00a3bf' },
        purple: { DEFAULT: '#a855f7' },
        tprimary: '#e6edf3',
        tsecondary: '#8b949e',
        tmuted: '#484f58',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
