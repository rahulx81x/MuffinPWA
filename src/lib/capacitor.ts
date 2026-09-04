import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';

export const isNative = (): boolean => Capacitor.isNativePlatform();

export async function syncStatusBarWithTheme(_themeId: string, background: string, isDark: boolean): Promise<void> {
  if (!isNative()) return;

  try {
    await StatusBar.setStyle({
      // Style.Dark has white text/icons (for dark themes)
      // Style.Light has dark text/icons (for light themes)
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
    // Set up keyboard listeners if needed for layout shifts
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
