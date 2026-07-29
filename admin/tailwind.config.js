/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Derived from the Conveyor Group logo (black arc, grey arc, red core)
        brand: {
          50: "#fdeceb",
          100: "#fad0cd",
          200: "#f4a29c",
          300: "#ee746a",
          400: "#e94a3d",
          500: "#eb2a2d", // logo red
          600: "#c81f22",
          700: "#a1191c",
          800: "#7a1315",
          900: "#530d0e",
          950: "#2b0607",
        },
        ink: {
          50: "#f5f5f6",
          100: "#e6e7e8",
          200: "#c7c9cb",
          300: "#98999b", // logo grey
          400: "#7a7b7d",
          500: "#5c5d5f",
          600: "#434446",
          700: "#2e2f30",
          800: "#1c1c1d",
          900: "#0d0d0e",
          950: "#000000", // logo black
        },
      },
      fontFamily: {
        display: ["Oswald", "Segoe UI", "sans-serif"],
        body: ["Inter", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      screens: {
        xs: "420px",
        board: "1600px", // large kitchen / conference display
      },
    },
  },
  plugins: [],
};
