/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        jellyfin: {
          purple: "#AA5CC3",
          blue: "#00A4DC",
          dark: "#020617"
        }
      }
    }
  },
  plugins: []
};
