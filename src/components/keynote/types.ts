import type { ComponentType } from "react";

export interface KeynoteCheatSheetRow {
  capacity: string;
  source: string;
  say: string;
}

export interface KeynoteSlide {
  id: string;
  label: string;
  Component: ComponentType;
  notes: string[];
  transition: string;
  cheatSheet?: KeynoteCheatSheetRow[];
}
