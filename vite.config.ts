import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import dyadComponentTagger from '@dyad-sh/react-vite-component-tagger';

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), dyadComponentTagger()], // Ordre des plugins inversé
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));