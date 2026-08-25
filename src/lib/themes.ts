export type ThemeId =
  | 'classic'
  | 'blueberry'
  | 'pistachio'
  | 'lavender'
  | 'chocolate'
  | 'velvet'
  | 'midnight'
  | 'emerald';

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
    id: 'lavender',
    name: 'Lavender Berry',
    mode: 'light',
    background: '#F8F6FC',
    card: '#EFEBF8',
    accent: '#7C3AED',
    text: '#24183E',
    border: '#D8CEF0',
    chartColors: [
      '#7C3AED',
      '#6D28D9',
      '#8B5CF6',
      '#A78BFA',
      '#047857',
      '#E11D48',
      '#D97706',
      '#0284C7',
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
    id: 'midnight',
    name: 'Midnight Blueberry',
    mode: 'dark',
    background: '#0B1120',
    card: '#131C31',
    accent: '#3B82F6',
    text: '#EFF6FF',
    border: '#223254',
    chartColors: [
      '#3B82F6',
      '#2563EB',
      '#60A5FA',
      '#93C5FD',
      '#34D399',
      '#F87171',
      '#FBBF24',
      '#A78BFA',
    ],
  },
  {
    id: 'emerald',
    name: 'Midnight Emerald',
    mode: 'dark',
    background: '#0B1612',
    card: '#13241D',
    accent: '#10B981',
    text: '#ECFDF5',
    border: '#234638',
    chartColors: [
      '#10B981',
      '#059669',
      '#34D399',
      '#6EE7B7',
      '#38BDF8',
      '#F59E0B',
      '#F43F5E',
      '#A78BFA',
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
  if (stored === 'caramel') return 'midnight';
  if (isThemeId(stored)) return stored;

  const legacy = localStorage.getItem(LEGACY_THEME_KEY);
  if (legacy === 'dark') return DEFAULT_DARK_THEME;
  if (legacy === 'light') return DEFAULT_LIGHT_THEME;

  return DEFAULT_LIGHT_THEME;
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
