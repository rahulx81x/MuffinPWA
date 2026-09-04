import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { FontProvider } from './hooks/useFont';
import { MaskProvider } from './hooks/useMask';
import { RecipeConfigProvider } from './hooks/useRecipeConfig';
import { ThemeProvider } from './hooks/useTheme';
import {
  applyFontToDocument,
  resolveInitialFontId,
} from './lib/fonts';
import {
  applyThemeToDocument,
  resolveInitialThemeId,
} from './lib/themes';
import { applyMuffinIconsToDocument } from './lib/muffinIcon';
import { initNativePlugins } from './lib/capacitor';
import './index.css';

/* Apply theme + font before paint to avoid a flash. */
(() => {
  const themeId = resolveInitialThemeId();
  applyThemeToDocument(themeId);
  applyMuffinIconsToDocument(themeId);
  applyFontToDocument(resolveInitialFontId());
  void initNativePlugins();
})();

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <FontProvider>
        <MaskProvider>
          <RecipeConfigProvider>
            <App />
          </RecipeConfigProvider>
        </MaskProvider>
      </FontProvider>
    </ThemeProvider>
  </StrictMode>
);
