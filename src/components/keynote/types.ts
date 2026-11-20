import type { ComponentType, ReactNode } from "react";

/** Contenu de la version mobile : une mise en page native portrait, pensée slide par slide. */
export interface KeynoteMobileSlide {
  kicker: string;
  title: ReactNode;
  lead?: string;
  figure?: { value: string; caption?: string };
  bullets?: string[];
  chips?: string[];
  footnote?: string;
  align?: "center";
  signature?: { thanks: string; names: string[] };
  /** Affiche le bouton « Donnez-nous votre avis » (ouvre le formulaire). */
  feedback?: boolean;
}

export interface KeynoteSlide {
  id: string;
  label: string;
  Component: ComponentType;
  mobile: KeynoteMobileSlide;
}
