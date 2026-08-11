export type FontId =
  | 'muffin'
  | 'josefin'
  | 'fredoka'
  | 'exo'
  | 'atkinson'
  | 'syne'
  | 'bricolage';

export interface FontDefinition {
  id: FontId;
  name: string;
  /** CSS font-family for body / UI text */
  body: string;
  /** CSS font-family for headings / .font-display */
  display: string;
}

export const FONT_STORAGE_KEY = 'muffinFont';

export const FONTS: FontDefinition[] = [
  {
    id: 'muffin',
    name: 'Muffin (Default)',
    body: "'Plus Jakarta Sans', 'Outfit', 'DM Sans', ui-sans-serif, system-ui, sans-serif",
    display: "'Outfit', 'Plus Jakarta Sans', sans-serif",
  },
  {
    id: 'josefin',
    name: 'Josefin — Elegant',
    body: "'Josefin Sans', ui-sans-serif, system-ui, sans-serif",
    display: "'Josefin Sans', ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: 'fredoka',
    name: 'Fredoka — Playful',
    body: "'Fredoka', ui-sans-serif, system-ui, sans-serif",
    display: "'Fredoka', ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: 'exo',
    name: 'Exo 2 — Futuristic',
    body: "'Exo 2', ui-sans-serif, system-ui, sans-serif",
    display: "'Exo 2', ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: 'atkinson',
    name: 'Atkinson — Clear',
    body: "'Atkinson Hyperlegible', ui-sans-serif, system-ui, sans-serif",
    display: "'Atkinson Hyperlegible', ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: 'syne',
    name: 'Syne — Bold',
    body: "'Syne', ui-sans-serif, system-ui, sans-serif",
    display: "'Syne', ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: 'bricolage',
    name: 'Bricolage — Quirky',
    body: "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif",
    display: "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif",
  },
];

export const DEFAULT_FONT: FontId = 'muffin';

const FONT_IDS = new Set<string>(FONTS.map((f) => f.id));

export function isFontId(value: string | null | undefined): value is FontId {
  return !!value && FONT_IDS.has(value);
}

export function getFont(id: FontId): FontDefinition {
  return FONTS.find((f) => f.id === id) ?? FONTS[0];
}

export function resolveInitialFontId(): FontId {
  if (typeof window === 'undefined') return DEFAULT_FONT;
  const stored = localStorage.getItem(FONT_STORAGE_KEY);
  if (isFontId(stored)) return stored;
  return DEFAULT_FONT;
}

export function applyFontToDocument(fontId: FontId): void {
  const font = getFont(fontId);
  const root = document.documentElement;
  root.setAttribute('data-font', font.id);
  root.style.setProperty('--font-body', font.body);
  root.style.setProperty('--font-display', font.display);
  root.style.fontFamily = font.body;
  if (document.body) {
    document.body.style.fontFamily = font.body;
  }
}
