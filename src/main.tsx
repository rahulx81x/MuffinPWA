import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { MaskProvider } from './hooks/useMask';
import { RecipeConfigProvider } from './hooks/useRecipeConfig';
import { ThemeProvider } from './hooks/useTheme';
import {
  applyThemeToDocument,
  resolveInitialThemeId,
} from './lib/themes';
import './index.css';

/* Apply theme before paint to avoid a light/dark flash. */
(() => {
  applyThemeToDocument(resolveInitialThemeId());
})();

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <MaskProvider>
        <RecipeConfigProvider>
          <App />
        </RecipeConfigProvider>
      </MaskProvider>
    </ThemeProvider>
  </StrictMode>
);
