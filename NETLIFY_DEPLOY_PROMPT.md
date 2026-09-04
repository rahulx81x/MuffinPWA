# Prompt for Live Web Branch (Netlify Deployment)

> **Instructions for AI or Developer**:
> Apply the following changes to the **live website branch** so that:
> 1. The deployed Netlify site supports Capacitor Android apps seamlessly.
> 2. The native Android status bar dynamically syncs its color and icon contrast with the user's active theme.
> 3. Standard web and desktop users are completely unaffected (`isNative()` guard ensures native plugins only run inside the Android app).

---

### Step 1: Install Required Capacitor Packages

Run this command in the project root:
```bash
npm install @capacitor/core @capacitor/status-bar @capacitor/keyboard
```

---

### Step 2: Create Native Helper Utility (`src/lib/capacitor.ts`)

Create a new file `src/lib/capacitor.ts`:

```typescript
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';

export const isNative = (): boolean => Capacitor.isNativePlatform();

export async function syncStatusBarWithTheme(_themeId: string, background: string, isDark: boolean): Promise<void> {
  if (!isNative()) return;

  try {
    await StatusBar.setStyle({
      // Style.Dark: white icons (for dark backgrounds)
      // Style.Light: dark icons (for light backgrounds)
      style: isDark ? Style.Dark : Style.Light,
    });
    await StatusBar.setBackgroundColor({
      color: background,
    });
  } catch (err) {
    console.warn('[capacitor] Could not sync StatusBar with theme:', err);
  }
}

export async function initNativePlugins(): Promise<void> {
  if (!isNative()) return;

  try {
    Keyboard.addListener('keyboardWillShow', (info) => {
      document.body.classList.add('keyboard-open');
      document.documentElement.style.setProperty(
        '--keyboard-height',
        `${info.keyboardHeight}px`
      );
    });

    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open');
      document.documentElement.style.removeProperty('--keyboard-height');
    });
  } catch (err) {
    console.warn('[capacitor] Could not initialize Keyboard listeners:', err);
  }
}
```

---

### Step 3: Initialize Native Plugins on App Boot (`src/main.tsx`)

In `src/main.tsx`, import `initNativePlugins` and call it inside the pre-paint initialization block:

```typescript
// Add this import near the top:
import { initNativePlugins } from './lib/capacitor';

// Call it inside the pre-paint IIFE block:
(() => {
  const themeId = resolveInitialThemeId();
  applyThemeToDocument(themeId);
  applyMuffinIconsToDocument(themeId);
  applyFontToDocument(resolveInitialFontId());
  void initNativePlugins();
})();
```

---

### Step 4: Hook Dynamic Status Bar Sync into Themes (`src/lib/themes.ts`)

In `src/lib/themes.ts`:

1. Import `syncStatusBarWithTheme` at the top:
```typescript
import { syncStatusBarWithTheme } from './capacitor';
```

2. In the `applyThemeToDocument(themeId: ThemeId)` function, update the `theme-color` meta update and trigger the native status bar sync:

```typescript
// Replace the hardcoded '#000000' theme-color block with:
const themeColorMetas = document.querySelectorAll<HTMLMetaElement>(
  'meta[name="theme-color"]'
);
if (themeColorMetas.length > 0) {
  themeColorMetas.forEach((m) => {
    m.setAttribute('content', theme.background);
    m.removeAttribute('media');
  });
} else {
  const newMeta = document.createElement('meta');
  newMeta.name = 'theme-color';
  newMeta.setAttribute('content', theme.background);
  document.head.insertBefore(newMeta, document.head.firstChild);
}

// Keep iOS appleStatusBarMeta as 'black-translucent'
let appleStatusBarMeta = document.querySelector<HTMLMetaElement>(
  'meta[name="apple-mobile-web-app-status-bar-style"]'
);
if (!appleStatusBarMeta) {
  appleStatusBarMeta = document.createElement('meta');
  appleStatusBarMeta.name = 'apple-mobile-web-app-status-bar-style';
  document.head.appendChild(appleStatusBarMeta);
}
appleStatusBarMeta.content = 'black-translucent';

// Android Capacitor: sync native status bar background and icons
void syncStatusBarWithTheme(theme.id, theme.background, theme.mode === 'dark');
```

---

### Step 5: Update Top Notch/Status-Bar Safe Area CSS (`src/index.css`)

In `src/index.css`:

1. Update `html::before` to use `var(--color-canvas)` dynamically instead of fixed `#000000`:
```css
html::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: env(safe-area-inset-top, 0px);
  background-color: var(--color-canvas);
  z-index: 9999;
  pointer-events: none;
}
```

2. Add mobile interaction overrides at the bottom of `src/index.css`:
```css
/* ── Native Android & Capacitor UX Tweaks ──────────────────────── */
html, body {
  overscroll-behavior-y: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
```

---

### Step 6: Update `index.html` Pre-paint Theme Script

In `index.html`:

1. Add telephone format detection meta tag in `<head>`:
```html
<meta name="format-detection" content="telephone=no" />
```

2. In the inline `<script>` inside `<head>`, update the status bar color setter:
```javascript
// Replace hardcoded '#000000':
var themeMetaTags = document.querySelectorAll('meta[name="theme-color"]');
themeMetaTags.forEach(function(m) { m.setAttribute('content', themeColor); });
```

---

### Step 7: API Endpoint Base URL Support (`src/api/client.ts`)

In `src/api/client.ts`, make endpoints prefix with `VITE_API_BASE_URL` so mobile environments can reach the live Netlify backend:

```typescript
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

const TRANSACTIONS = `${API_BASE_URL}/.netlify/functions/transactions`;
const HEALTH = `${API_BASE_URL}/.netlify/functions/health`;
const AUTH_ME = `${API_BASE_URL}/.netlify/functions/auth-me`;
const AUTH_LOGOUT = `${API_BASE_URL}/.netlify/functions/auth-logout`;
const SHEET_LINK = `${API_BASE_URL}/.netlify/functions/sheet-link`;
const SHEET_CREATE = `${API_BASE_URL}/.netlify/functions/sheet-create`;
const SHEET_UNLINK = `${API_BASE_URL}/.netlify/functions/sheet-unlink`;
const RECIPE = `${API_BASE_URL}/.netlify/functions/recipe`;
const TOUR_COMPLETE = `${API_BASE_URL}/.netlify/functions/tour-complete`;

export const AUTH_START_URL = `${API_BASE_URL}/.netlify/functions/auth-start`;
```

---

### Verification:

Run:
```bash
npm run build
```
Ensure TypeScript compiles cleanly without errors. Then commit and push to the live website branch to trigger the Netlify deployment.
