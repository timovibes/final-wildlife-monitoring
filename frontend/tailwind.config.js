/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ops: {
          DEFAULT: '#0B0D10',   // base bg, near-black
          surface: '#14171B',   // card/surface
          raised: '#1C2126',    // elevated panel
          line: '#2A3036',      // borders/dividers
        },
        steel: '#C7CDD4',        // primary text
        cyan: {
          DEFAULT: '#3FB8C4',    // primary accent
          dim: '#245F66',
        },
        amber: {
          DEFAULT: '#E0A94C',    // secondary accent / pending
        },
        signal: {
          DEFAULT: '#E4463F',    // critical alerts only
          dim: '#4A1D1B',
        },
        online: '#3FCF8E',        // status-online
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '2px',
      },
    },
  },
  plugins: [],
}