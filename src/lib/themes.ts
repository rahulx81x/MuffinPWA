export type ThemeId =
  | 'classic'
  | 'blueberry'
  | 'pistachio'
  | 'lavender'
  | 'velvet-light'
  | 'pure-light'
  | 'chocolate'
  | 'midnight'
  | 'emerald'
  | 'lavender-dark'
  | 'velvet'
  | 'obsidian-dark';

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
  // 1. Classic Muffin (Light)
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
  // 2. Blueberry Muffin (Light)
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
  // 3. Pistachio Matcha (Light)
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
  // 4. Lavender Berry (Light)
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
  // 5. Red Velvet (Light)
  {
    id: 'velvet-light',
    name: 'Red Velvet',
    mode: 'light',
    background: '#FDF4F5',
    card: '#FCE7EA',
    accent: '#E11D48',
    text: '#4A0D17',
    border: '#F4B8C3',
    chartColors: [
      '#E11D48',
      '#BE123C',
      '#F43F5E',
      '#FB7185',
      '#047857',
      '#F59E0B',
      '#9F1239',
      '#881337',
    ],
  },
  // 6. Pure Light (Basic White)
  {
    id: 'pure-light',
    name: 'Pure Light',
    mode: 'light',
    background: '#FFFFFF',
    card: '#F4F4F5',
    accent: '#18181B',
    text: '#09090B',
    border: '#E4E4E7',
    chartColors: [
      '#18181B',
      '#3F3F46',
      '#71717A',
      '#047857',
      '#B91C1C',
      '#D97706',
      '#2563EB',
      '#A1A1AA',
    ],
  },
  // 1. Double Chocolate (Dark) — counterpart to Classic
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
  // 2. Midnight Blueberry (Dark) — counterpart to Blueberry
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
  // 3. Midnight Emerald (Dark) — counterpart to Pistachio Matcha
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
  // 4. Midnight Lavender (Dark) — counterpart to Lavender Berry
  {
    id: 'lavender-dark',
    name: 'Midnight Lavender',
    mode: 'dark',
    background: '#110C1D',
    card: '#1B132E',
    accent: '#8B5CF6',
    text: '#F5F3FF',
    border: '#3B2C5C',
    chartColors: [
      '#8B5CF6',
      '#7C3AED',
      '#A78BFA',
      '#C4B5FD',
      '#34D399',
      '#F43F5E',
      '#FBBF24',
      '#38BDF8',
    ],
  },
  // 5. Red Velvet (Dark) — counterpart to Red Velvet (Light)
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
  // 6. Obsidian Dark (Basic Dark) — counterpart to Pure Light
  {
    id: 'obsidian-dark',
    name: 'Obsidian Dark',
    mode: 'dark',
    background: '#09090B',
    card: '#18181B',
    accent: '#A1A1AA',
    text: '#FAFAFA',
    border: '#27272A',
    chartColors: [
      '#A1A1AA',
      '#D4D4D8',
      '#71717A',
      '#34D399',
      '#F87171',
      '#FBBF24',
      '#60A5FA',
      '#52525B',
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
  if (typeof document === 'undefined') return;
  const theme = getTheme(themeId);

  // CSS tokens & body background
  const root = document.documentElement;
  root.setAttribute('data-theme', theme.id);
  root.classList.toggle('dark', theme.mode === 'dark');
  root.style.colorScheme = theme.mode;
  root.style.backgroundColor = theme.background;
  if (document.body) {
    document.body.style.backgroundColor = theme.background;
  }

  // Android Chrome / PWA status bar — mutate ALL existing meta[name="theme-color"]
  // nodes in-place. vite-plugin-pwa injects a second tag from the manifest's
  // theme_color at build/dev time, so we must update every one we find.
  // Chrome's TabThemeColorHelper observes content-attribute mutations on
  // persistent nodes; newly inserted nodes are NOT reliably picked up in a
  // WebAPK context.
  const themeColorMetas = document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]:not([media])'
  );
  if (themeColorMetas.length > 0) {
    themeColorMetas.forEach((m) => m.setAttribute('content', theme.background));
  } else {
    // Fallback: no pre-existing tag — create one at the very top of <head>.
    const newMeta = document.createElement('meta');
    newMeta.name = 'theme-color';
    newMeta.setAttribute('content', theme.background);
    document.head.insertBefore(newMeta, document.head.firstChild);
  }

  // iOS: control status bar icon contrast
  let appleStatusBarMeta = document.querySelector<HTMLMetaElement>(
    'meta[name="apple-mobile-web-app-status-bar-style"]'
  );
  if (!appleStatusBarMeta) {
    appleStatusBarMeta = document.createElement('meta');
    appleStatusBarMeta.name = 'apple-mobile-web-app-status-bar-style';
    document.head.appendChild(appleStatusBarMeta);
  }
  appleStatusBarMeta.content = theme.mode === 'dark' ? 'black-translucent' : 'default';
}


