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
          DEFAULT: "hsl(0 0% 100%)", // Blanc pour le fond
          foreground: "hsl(200 53% 33%)", // Bleu Foncé pour le texte (#255f85)
          primary: {
            DEFAULT: "hsl(205 100% 94%)", // Bleu très clair pour le fond du menu supérieur
            foreground: "hsl(200 53% 33%)", // Bleu Foncé pour le texte sur le primaire (#255f85)
          },
          secondary: {
            DEFAULT: "hsl(200 53% 69%)", // Bleu Clair pour les éléments secondaires
            foreground: "hsl(200 53% 33%)", // Bleu Foncé pour le texte sur le secondaire (#255f85)
          },
          muted: {
            DEFAULT: "hsl(0 0% 95%)", // Gris très clair pour le fond muted
            foreground: "hsl(200 10% 50%)", // Gris plus foncé pour le texte muted
          },
          accent: {
            DEFAULT: "hsl(35 90% 57%)", // Jaune-Orangé pour l'accent
            foreground: "hsl(200 53% 33%)", // Bleu Foncé pour le texte sur l'accent (#255f85)
          },
          destructive: {
            DEFAULT: "hsl(20 90% 52%)", // Orange Vif pour les actions destructives
            foreground: "hsl(0 0% 100%)", // Blanc pour le texte sur le destructif
          },
          border: "hsl(200 10% 90%)", // Gris-bleu clair pour les bordures
          ring: "hsl(35 90% 57%)", // Jaune-Orangé pour l'anneau de focus
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