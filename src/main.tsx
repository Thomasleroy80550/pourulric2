import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";

createRoot(document.getElementById("root")!).render(<App />);

// Masque le splash screen natif (index.html) une fois l'app montée,
// en garantissant une durée minimale d'affichage pour un rendu fluide.
const splash = document.getElementById("splash-screen");
if (splash) {
  const shownAt = (window as any).__splashShownAt ?? Date.now();
  const remaining = Math.max(0, 1400 - (Date.now() - shownAt));
  setTimeout(() => {
    splash.style.opacity = "0";
    setTimeout(() => splash.remove(), 450);
  }, remaining);
}
