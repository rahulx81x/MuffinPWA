/**
 * Apply the app's selected muffin theme on static external pages.
 * Reads the same localStorage key as the React ThemeProvider.
 * Default: Classic Muffin.
 */
(function applyMuffinTheme() {
  var STORAGE_KEY = 'muffinTheme';
  var LEGACY_KEY = 'themeMode';
  var DEFAULT_LIGHT = 'classic';
  var DEFAULT_DARK = 'chocolate';
  var VALID = {
    classic: true,
    blueberry: true,
    pistachio: true,
    lavender: true,
    'velvet-light': true,
    'pure-light': true,
    chocolate: true,
    midnight: true,
    emerald: true,
    'lavender-dark': true,
    velvet: true,
    'obsidian-dark': true,
  };

  var THEMES = {
    classic: {
      background: '#FAF5EF',
      accent: '#D97706',
      chip: '#fffaf5',
      dark: false,
    },
    blueberry: {
      background: '#F5F6FA',
      accent: '#4F46E5',
      chip: '#fbfcfe',
      dark: false,
    },
    pistachio: {
      background: '#F6F8F3',
      accent: '#65A30D',
      chip: '#fbfcfa',
      dark: false,
    },
    lavender: {
      background: '#F8F6FC',
      accent: '#7C3AED',
      chip: '#f5f0fb',
      dark: false,
    },
    'velvet-light': {
      background: '#FDF4F5',
      accent: '#E11D48',
      chip: '#fff7f8',
      dark: false,
    },
    'pure-light': {
      background: '#FFFFFF',
      accent: '#18181B',
      chip: '#f4f4f5',
      dark: false,
    },
    chocolate: {
      background: '#1C130D',
      accent: '#F59E0B',
      chip: '#34261c',
      dark: true,
    },
    midnight: {
      background: '#0B1120',
      accent: '#3B82F6',
      chip: '#1e293b',
      dark: true,
    },
    emerald: {
      background: '#0B1612',
      accent: '#10B981',
      chip: '#173024',
      dark: true,
    },
    'lavender-dark': {
      background: '#110C1D',
      accent: '#8B5CF6',
      chip: '#241b3b',
      dark: true,
    },
    velvet: {
      background: '#1A0C0E',
      accent: '#E11D48',
      chip: '#351a1e',
      dark: true,
    },
    'obsidian-dark': {
      background: '#09090B',
      accent: '#A1A1AA',
      chip: '#27272a',
      dark: true,
    },
  };

  var id = DEFAULT_LIGHT;
  try {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'caramel') {
      id = 'midnight';
    } else if (stored && VALID[stored]) {
      id = stored;
    } else {
      var legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy === 'dark') id = DEFAULT_DARK;
      else if (legacy === 'light') id = DEFAULT_LIGHT;
    }
  } catch (_) {
    /* private mode / blocked storage */
  }

  var theme = THEMES[id] || THEMES.classic;
  var root = document.documentElement;
  root.setAttribute('data-theme', id);
  root.classList.toggle('dark', !!theme.dark);
  root.style.colorScheme = theme.dark ? 'dark' : 'light';
  root.style.backgroundColor = theme.background;
  if (document.body) {
    document.body.style.backgroundColor = theme.background;
  }

  var themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute('content', theme.background);
  } else {
    var newMeta = document.createElement('meta');
    newMeta.name = 'theme-color';
    newMeta.content = theme.background;
    document.head.appendChild(newMeta);
  }

  var appleStatusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (!appleStatusBarMeta) {
    appleStatusBarMeta = document.createElement('meta');
    appleStatusBarMeta.name = 'apple-mobile-web-app-status-bar-style';
    document.head.appendChild(appleStatusBarMeta);
  }
  appleStatusBarMeta.setAttribute('content', theme.dark ? 'black-translucent' : 'default');

  var muffin =
    '<path d="M6.5 10.5c0-1.2.7-2.3 1.8-2.8.4-1.6 1.9-2.7 3.7-2.7s3.3 1.1 3.7 2.7c1.1.5 1.8 1.6 1.8 2.8 0 .4-.1.8-.2 1.1H6.7c-.1-.3-.2-.7-.2-1.1Z" fill="' +
    theme.accent +
    '" opacity="0.92"/>' +
    '<circle cx="9.2" cy="9.2" r="0.7" fill="' +
    theme.chip +
    '"/>' +
    '<circle cx="12" cy="8.4" r="0.65" fill="' +
    theme.chip +
    '"/>' +
    '<circle cx="14.6" cy="9.4" r="0.55" fill="' +
    theme.chip +
    '"/>' +
    '<path d="M7 11.8h10l-.9 6.2a2.2 2.2 0 0 1-2.2 1.8H10.1a2.2 2.2 0 0 1-2.2-1.8L7 11.8Z" fill="' +
    theme.accent +
    '"/>' +
    '<path d="M8.4 14.2h7.2M8.7 16.4h6.6" stroke="' +
    theme.chip +
    '" stroke-width="1.1" stroke-linecap="round" opacity="0.35"/>';

  var svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img">' +
    '<rect width="512" height="512" rx="96" fill="' +
    theme.background +
    '"/>' +
    '<g transform="translate(64 64) scale(16)">' +
    muffin +
    '</g></svg>';

  var href =
    'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

  function setLink(rel, type) {
    var el = document.querySelector('link[rel="' + rel + '"]');
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      document.head.appendChild(el);
    }
    if (type) el.setAttribute('type', type);
    el.setAttribute('href', href);
  }

  setLink('icon', 'image/svg+xml');
  setLink('apple-touch-icon');
})();
