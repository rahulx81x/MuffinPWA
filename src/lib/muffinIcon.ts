import type { ThemeDefinition, ThemeId } from './themes';
import { getTheme } from './themes';

/** Speckle / groove color — matches surface-strong per theme. */
const SURFACE_STRONG: Record<ThemeId, string> = {
  classic: '#fffaf5',
  blueberry: '#fbfcfe',
  pistachio: '#fbfcfa',
  chocolate: '#34261c',
  velvet: '#351a1e',
  caramel: '#322617',
};

function muffinPaths(fill: string, chip: string): string {
  return [
    `<path d="M6.5 10.5c0-1.2.7-2.3 1.8-2.8.4-1.6 1.9-2.7 3.7-2.7s3.3 1.1 3.7 2.7c1.1.5 1.8 1.6 1.8 2.8 0 .4-.1.8-.2 1.1H6.7c-.1-.3-.2-.7-.2-1.1Z" fill="${fill}" opacity="0.92"/>`,
    `<circle cx="9.2" cy="9.2" r="0.7" fill="${chip}"/>`,
    `<circle cx="12" cy="8.4" r="0.65" fill="${chip}"/>`,
    `<circle cx="14.6" cy="9.4" r="0.55" fill="${chip}"/>`,
    `<path d="M7 11.8h10l-.9 6.2a2.2 2.2 0 0 1-2.2 1.8H10.1a2.2 2.2 0 0 1-2.2-1.8L7 11.8Z" fill="${fill}"/>`,
    `<path d="M8.4 14.2h7.2M8.7 16.4h6.6" stroke="${chip}" stroke-width="1.1" stroke-linecap="round" opacity="0.35"/>`,
  ].join('');
}

/** App-icon / favicon SVG with padded background (maskable-safe). */
export function buildMuffinAppIconSvg(theme: ThemeDefinition): string {
  const chip = SURFACE_STRONG[theme.id] ?? theme.card;
  const muffin = muffinPaths(theme.accent, chip);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img"><rect width="512" height="512" rx="96" fill="${theme.background}"/><g transform="translate(64 64) scale(16)">${muffin}</g></svg>`;
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
