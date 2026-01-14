import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./index.html",
    "./popup.html", 
    "./sidepanel.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  },
  plugins: [],
}

export default config