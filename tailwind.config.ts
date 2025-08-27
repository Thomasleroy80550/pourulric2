import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1600px", // Increased from 1400px
        "3xl": "1920px", // Added new breakpoint
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(210 30% 98%)", // Very light grey (for user interface)
          foreground: "hsl(222.2 47.4% 11.2%)", // Dark grey
          primary: "hsl(200 70% 30%)", // Main brand blue
          "primary-foreground": "hsl(0 0% 100%)", // White
          accent: "hsl(210 40% 96.1%)", // Slightly darker grey for hover/active
          "accent-foreground": "hsl(222.2 47.4% 11.2%)", // Dark grey
          border: "hsl(214.3 31.8% 91.4%)", // Light grey border
          ring: "hsl(222.2 84% 4.9%)", // Consistent with main ring
        },
        "admin-panel": { // Nouvelle palette pour l'interface d'administration
          DEFAULT: "hsl(220 10% 12%)", // Gris très foncé, presque noir
          foreground: "hsl(210 20% 90%)", // Blanc cassé pour le texte
          primary: "hsl(200 70% 50%)", // Bleu vif pour les accents et éléments principaux
          "primary-foreground": "hsl(0 0% 100%)", // Texte blanc sur le primaire
          secondary: {
            DEFAULT: "hsl(217.2 32.6% 17.5%)", // Gris foncé légèrement plus clair pour les éléments secondaires
            foreground: "hsl(210 20% 90%)", // Texte blanc cassé
          },
          muted: {
            DEFAULT: "hsl(217.2 32.6% 17.5%)",
            foreground: "hsl(215 20.2% 65.1%)",
          },
          accent: {
            DEFAULT: "hsl(217.2 32.6% 25%)", // Gris foncé plus clair pour les états de survol/actif
            foreground: "hsl(210 20% 90%)", // Texte blanc cassé
          },
          border: "hsl(217.2 32.6% 20%)", // Bordure subtile
          ring: "hsl(200 70% 60%)", // Anneau de focus bleu plus lumineux
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;