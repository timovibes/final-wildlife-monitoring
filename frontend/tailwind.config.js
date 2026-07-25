/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bush: {
          DEFAULT: '#1B2318', // base bg
          surface: '#242D1F', // card/surface
          line: '#3A4433',    // borders/dividers
        },
        bone: '#EDE6D3',      // primary text
        ochre: {
          DEFAULT: '#C98A3E', // primary accent
          dim: '#8C6229',
        },
        teal: {
          DEFAULT: '#4A7C7C', // secondary accent / info / online status
        },
        rust: {
          DEFAULT: '#B5432F', // critical alerts only
          dim: '#4A2620',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '2px', // this system does not use rounded-everything
      },
    },
  },
  plugins: [],
}