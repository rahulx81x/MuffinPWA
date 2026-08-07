export type ThemeId =
  | 'classic'
  | 'blueberry'
  | 'pistachio'
  | 'chocolate'
  | 'velvet'
  | 'caramel';

export type ThemeMode = 'light' | 'dark';

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  mode: ThemeMode;
  /** Canvas / page background */
  background: string;
  /** Card / surface */
  card: string;
  accent: string;
  text: string;
  border: string;
  /** Pie / series colors for charts */
  chartColors: string[];
}

export const THEME_STORAGE_KEY = 'muffinTheme';
/** Legacy light/dark toggle key — migrated on first read. */
export const LEGACY_THEME_KEY = 'themeMode';

export const THEMES: ThemeDefinition[] = [
  {
    id: 'classic',
    name: 'Classic Muffin',
    mode: 'light',
    background: '#FAF5EF',
    card: '#F3E8DC',
    accent: '#D97706',
    text: '#3D2314',
    border: '#E5D3B3',
    chartColors: [
      '#D97706',
      '#B45309',
      '#F59E0B',
      '#8C6D53',
      '#047857',
      '#B91C1C',
      '#7C5A43',
      '#C2410C',
    ],
  },
  {
    id: 'blueberry',
    name: 'Blueberry Muffin',
    mode: 'light',
    background: '#F5F6FA',
    card: '#EAEFF8',
    accent: '#4F46E5',
    text: '#1E1B4B',
    border: '#C7D2FE',
    chartColors: [
      '#4F46E5',
      '#4338CA',
      '#6366F1',
      '#818CF8',
      '#047857',
      '#BE123C',
      '#3730A3',
      '#312E81',
    ],
  },
  {
    id: 'pistachio',
    name: 'Pistachio Matcha',
    mode: 'light',
    background: '#F6F8F3',
    card: '#EAF0E4',
    accent: '#65A30D',
    text: '#1A2E05',
    border: '#D1E2C4',
    chartColors: [
      '#65A30D',
      '#4D7C0F',
      '#84CC16',
      '#A3E635',
      '#047857',
      '#B91C1C',
      '#3F6212',
      '#365314',
    ],
  },
  {
    id: 'chocolate',
    name: 'Double Chocolate',
    mode: 'dark',
    background: '#1C130D',
    card: '#291D15',
    accent: '#F59E0B',
    text: '#F3E8DC',
    border: '#423024',
    chartColors: [
      '#F59E0B',
      '#D97706',
      '#FBBF24',
      '#B89C88',
      '#34D399',
      '#F87171',
      '#9A7F6A',
      '#EA580C',
    ],
  },
  {
    id: 'velvet',
    name: 'Red Velvet',
    mode: 'dark',
    background: '#1A0C0E',
    card: '#2A1417',
    accent: '#E11D48',
    text: '#FCE7F3',
    border: '#4C1D24',
    chartColors: [
      '#E11D48',
      '#BE123C',
      '#F43F5E',
      '#FB7185',
      '#34D399',
      '#FBBF24',
      '#F9A8D4',
      '#9F1239',
    ],
  },
  {
    id: 'caramel',
    name: 'Salted Caramel',
    mode: 'dark',
    background: '#17120A',
    card: '#261C10',
    accent: '#F97316',
    text: '#FEF3C7',
    border: '#422E19',
    chartColors: [
      '#F97316',
      '#EA580C',
      '#FB923C',
      '#FDBA74',
      '#34D399',
      '#F87171',
      '#FCD34D',
      '#C2410C',
    ],
  },
];

export const LIGHT_THEMES = THEMES.filter((t) => t.mode === 'light');
export const DARK_THEMES = THEMES.filter((t) => t.mode === 'dark');

export const DEFAULT_LIGHT_THEME: ThemeId = 'classic';
export const DEFAULT_DARK_THEME: ThemeId = 'chocolate';

const THEME_IDS = new Set<string>(THEMES.map((t) => t.id));

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return !!value && THEME_IDS.has(value);
}

export function getTheme(id: ThemeId): ThemeDefinition {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function resolveInitialThemeId(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_LIGHT_THEME;

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (isThemeId(stored)) return stored;

  const legacy = localStorage.getItem(LEGACY_THEME_KEY);
  if (legacy === 'dark') return DEFAULT_DARK_THEME;
  if (legacy === 'light') return DEFAULT_LIGHT_THEME;

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? DEFAULT_DARK_THEME
    : DEFAULT_LIGHT_THEME;
}

export function applyThemeToDocument(themeId: ThemeId): void {
  const theme = getTheme(themeId);
  const root = document.documentElement;
  root.setAttribute('data-theme', theme.id);
  root.classList.toggle('dark', theme.mode === 'dark');

  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((el) => el.setAttribute('content', theme.background));
}
