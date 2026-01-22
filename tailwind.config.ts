import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    ...defaultTheme,
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px"
    },
    extend: {
      colors: {
        surface: "rgb(var(--surface) / <alpha-value>)",
        base: "rgb(var(--base) / <alpha-value>)",
        text: "rgb(var(--text) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        accentSoft: "rgb(var(--accent-soft) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)"
      },
      boxShadow: {
        card: "0 18px 40px -28px rgba(0, 0, 0, 0.45)"
      }
    }
  },
  plugins: []
};

export default config;
