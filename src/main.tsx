import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { MaskProvider } from './hooks/useMask';
import './index.css';

(() => {
  const stored = localStorage.getItem('themeMode');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const useDark = stored === 'dark' || (stored === null && prefersDark);
  document.documentElement.classList.toggle('dark', useDark);
})();

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MaskProvider>
      <App />
    </MaskProvider>
  </StrictMode>
);
