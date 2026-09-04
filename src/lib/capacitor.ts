import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';

export const isNative = (): boolean => Capacitor.isNativePlatform();

export async function initNativePlugins(): Promise<void> {
  if (!isNative()) return;

  try {
    // Configure Android status bar to match AMOLED theme
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#000000' });
  } catch (err) {
    console.warn('[capacitor] Could not initialize StatusBar:', err);
  }

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
