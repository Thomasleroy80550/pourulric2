import path from "path"
import fs from "fs"
import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"
import dyadComponentTagger from '@dyad-sh/react-vite-component-tagger';
import { VitePWA } from 'vite-plugin-pwa';

// Génère l'icône PWA à partir du favicon (le .ico contient un PNG 256x256 embarqué),
// pour que l'icône de l'app installée soit identique au favicon du site.
function extractPwaIconFromFavicon() {
  try {
    const ico = fs.readFileSync(path.resolve(__dirname, "public/favicon.ico"));
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const offset = ico.indexOf(pngSignature);
    if (offset >= 0) {
      const out = path.resolve(__dirname, "public/icons/pwa-icon.png");
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, ico.subarray(offset));
    }
  } catch (e) {
    console.warn("Could not extract PWA icon from favicon.ico", e);
  }
}
extractPwaIconFromFavicon();

export default defineConfig({
  plugins: [
    dyadComponentTagger(),
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'logo.png', 'icons/pwa-icon.png'],
      manifest: {
        name: 'Portail propriétaire Hello Keys',
        short_name: 'Hello Keys',
        description: 'Portail propriétaire Hello Keys : réservations, finances, performances et notifications.',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#255f85',
        icons: [
          {
            src: '/icons/pwa-icon.png',
            sizes: '256x256',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/pwa-icon.png',
            sizes: '256x256',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        importScripts: ['push-sw.js'],
        navigateFallbackDenylist: [/^\/functions\//],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || 'https://dkjaejzwmmwwzhokpbgs.supabase.co'),
  },
})
