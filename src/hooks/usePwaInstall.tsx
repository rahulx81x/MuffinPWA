import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const media = window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone =
    'standalone' in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return media || iosStandalone;
}

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export type PwaInstallState =
  | 'unavailable'
  | 'available'
  | 'installed'
  | 'ios-hint';

export function usePwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [installed, setInstalled] = useState(() => isStandaloneDisplay());

  useEffect(() => {
    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    }

    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const state: PwaInstallState = installed
    ? 'installed'
    : deferred
      ? 'available'
      : isIosDevice()
        ? 'ios-hint'
        : 'unavailable';

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable' | 'ios-hint' | 'installed'> => {
    if (installed) return 'installed';
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      setDeferred(null);
      if (outcome === 'accepted') setInstalled(true);
      return outcome;
    }
    if (isIosDevice()) return 'ios-hint';
    return 'unavailable';
  }, [deferred, installed]);

  return { state, install, canPrompt: Boolean(deferred) };
}
