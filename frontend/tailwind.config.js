/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: "#0f172a",
          sun: "#f59e0b",
          mint: "#14b8a6",
          fog: "#e2e8f0",
        },
      },
      boxShadow: {
        panel: "0 15px 40px rgba(15, 23, 42, 0.15)",
      },
    },
  },
  plugins: [],
};
