import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        apple: {
          blue: "#0071e3",
          hover: "#0077ed",
          dark: "#1d1d1f",
          gray: "#86868b",
          light: "#f5f5f7",
          border: "#e2e8f0",
        },
      },
    },
  },
  plugins: [],
};
export default config;
