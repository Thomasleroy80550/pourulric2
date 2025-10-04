import path from "path"
import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"
import dyadComponentTagger from '@dyad-sh/react-vite-component-tagger';

export default defineConfig({
  plugins: [dyadComponentTagger(), react],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || 'https://dkjaejzwmmwwzhokpbgs.supabase.co'),
  },
})