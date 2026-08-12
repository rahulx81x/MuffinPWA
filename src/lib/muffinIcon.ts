import type { ThemeDefinition, ThemeId } from './themes';
import { getTheme } from './themes';

/** App-icon / favicon SVG with padded background (maskable-safe). */
export function buildMuffinAppIconSvg(theme: ThemeDefinition): string {
  const bg = theme.background;
  const topLight = theme.mode === 'dark' ? '#ffecb3' : theme.accent;
  const topDark = theme.accent;
  const cupLight = theme.card;
  const cupDark = theme.mode === 'dark' ? '#291d15' : '#7c5a43';
  const glow = theme.accent;
  const line = theme.text;
  const chip = theme.text;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 500 500" role="img">
  <defs>
    <style>
      :root, svg {
        --bg-color: ${bg};
        --top-light: ${topLight};
        --top-dark: ${topDark};
        --cup-light: ${cupLight};
        --cup-dark: ${cupDark};
        --cup-highlight: rgba(255, 235, 180, 0.25);
        --glow-color: ${glow};
        --line-color: ${line};
        --chip-color: ${chip};
      }
    </style>
    <linearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--top-light)" />
      <stop offset="100%" stop-color="var(--top-dark)" />
    </linearGradient>
    <linearGradient id="cupGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--cup-light)" />
      <stop offset="100%" stop-color="var(--cup-dark)" />
    </linearGradient>
    <linearGradient id="cupHighlight" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="transparent" />
      <stop offset="50%" stop-color="var(--cup-highlight)" />
      <stop offset="100%" stop-color="transparent" />
    </linearGradient>
    <filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <path id="cup-fill" d="M 145 275 L 175 410 C 195 430, 305 430, 325 410 L 355 275 Z" />
    <path id="cup-outline" d="M 145 275 L 175 410 C 195 430, 305 430, 325 410 L 355 275" />
    <path id="top-shape" d="M 130 270 C 105 245, 110 195, 145 175 C 175 140, 205 125, 250 125 C 295 125, 325 140, 355 175 C 390 195, 395 245, 370 270 C 345 285, 305 282, 285 273 C 265 284, 235 284, 215 273 C 195 282, 155 285, 130 270 Z" />
  </defs>
  <rect width="100%" height="100%" rx="96" fill="var(--bg-color)" />
  <g filter="url(#neon-glow)">
    <use href="#cup-outline" xlink:href="#cup-outline" stroke="var(--glow-color)" stroke-width="26" stroke-linejoin="round" stroke-linecap="round" fill="none" />
    <use href="#top-shape" xlink:href="#top-shape" stroke="var(--glow-color)" stroke-width="26" stroke-linejoin="round" fill="none" />
  </g>
  <use href="#cup-outline" xlink:href="#cup-outline" stroke="var(--glow-color)" stroke-width="18" stroke-linejoin="round" stroke-linecap="round" fill="none" />
  <use href="#top-shape" xlink:href="#top-shape" stroke="var(--glow-color)" stroke-width="18" stroke-linejoin="round" fill="none" />
  <use href="#cup-fill" xlink:href="#cup-fill" fill="url(#cupGrad)" />
  <use href="#cup-fill" xlink:href="#cup-fill" fill="url(#cupHighlight)" />
  <use href="#cup-outline" xlink:href="#cup-outline" stroke="var(--line-color)" stroke-width="12" stroke-linejoin="round" stroke-linecap="round" fill="none" />
  <g fill="none" stroke="var(--line-color)" stroke-width="7" stroke-linecap="round">
    <path d="M 185 285 L 205 410" />
    <path d="M 225 290 L 235 418" />
    <path d="M 275 290 L 265 418" />
    <path d="M 315 285 L 295 410" />
  </g>
  <use href="#top-shape" xlink:href="#top-shape" stroke="var(--line-color)" stroke-width="12" stroke-linejoin="round" fill="url(#topGrad)" />
  <g fill="var(--chip-color)">
    <path d="M 235 160 C 242 154, 252 162, 242 170 C 232 168, 230 164, 235 160 Z" />
    <path d="M 185 185 C 192 180, 198 188, 185 192 C 180 190, 178 186, 185 185 Z" />
    <path d="M 295 175 C 305 170, 310 180, 300 185 C 290 185, 288 180, 295 175 Z" />
    <path d="M 160 220 C 168 212, 175 220, 162 228 C 156 226, 155 222, 160 220 Z" />
    <path d="M 330 215 C 338 208, 345 216, 332 222 C 326 220, 325 216, 330 215 Z" />
    <path d="M 245 220 C 252 214, 258 222, 248 228 C 242 226, 240 222, 245 220 Z" />
    <path d="M 285 215 C 292 208, 298 216, 288 222 C 282 220, 280 216, 285 215 Z" />
    <path d="M 205 225 C 212 218, 218 226, 208 232 C 202 230, 200 226, 205 225 Z" />
  </g>
</svg>`;
}

export function muffinIconDataUrl(themeId: ThemeId): string {
  const svg = buildMuffinAppIconSvg(getTheme(themeId));
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

let currentManifestBlobUrl: string | null = null;

/** Swap favicon, apple-touch-icon, theme-color meta tags, and PWA manifest icon dynamically with theme. */
export function applyMuffinIconsToDocument(themeId: ThemeId): void {
  if (typeof document === 'undefined') return;
  const theme = getTheme(themeId);
  const href = muffinIconDataUrl(themeId);

  // 1. Favicon SVG
  let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    document.head.appendChild(favicon);
  }
  favicon.type = 'image/svg+xml';
  favicon.href = href;

  // 2. Apple touch icon SVG
  let apple = document.querySelector<HTMLLinkElement>(
    'link[rel="apple-touch-icon"]'
  );
  if (!apple) {
    apple = document.createElement('link');
    apple.rel = 'apple-touch-icon';
    document.head.appendChild(apple);
  }
  apple.href = href;

  // 3. Theme color meta tag
  let themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!themeColorMeta) {
    themeColorMeta = document.createElement('meta');
    themeColorMeta.name = 'theme-color';
    document.head.appendChild(themeColorMeta);
  }
  themeColorMeta.content = theme.background;

  let appleStatusBarMeta = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-status-bar"]');
  if (appleStatusBarMeta) {
    appleStatusBarMeta.content = theme.background;
  }

  // 4. Dynamic Manifest theme + SVG icon sync
  try {
    const dynamicManifest = {
      id: '/',
      name: 'Muffin',
      short_name: 'Muffin',
      description:
        'Muffin — track income, expenses, and investments from a Google Sheet on your phone',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: theme.background,
      theme_color: theme.accent,
      icons: [
        {
          src: '/icons/icon_192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icons/icon_512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
        {
          src: href,
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any maskable',
        },
      ],
    };

    if (currentManifestBlobUrl) {
      URL.revokeObjectURL(currentManifestBlobUrl);
    }
    const blob = new Blob([JSON.stringify(dynamicManifest, null, 2)], {
      type: 'application/manifest+json',
    });
    currentManifestBlobUrl = URL.createObjectURL(blob);

    let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = currentManifestBlobUrl;
  } catch (err) {
    console.warn('Could not update dynamic manifest theme:', err);
  }
}
