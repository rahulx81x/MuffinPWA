import { useCallback, useEffect, useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type PwaInstallState =
  | 'available'
  | 'installed'
  | 'ios-hint'
  | 'browser-menu';

type InstallResult =
  | 'accepted'
  | 'dismissed'
  | 'ios-hint'
  | 'installed'
  | 'browser-menu';

type InstallStoreSnapshot = {
  deferred: BeforeInstallPromptEvent | null;
  installed: boolean;
};

/**
 * Keep the deferred prompt outside React state.
 * `beforeinstallprompt` fires once per load; Strict Mode remounts would
 * otherwise drop it while Chrome’s own Install menu still works.
 *
 * Snapshot object is cached — useSyncExternalStore requires getSnapshot to
 * return the same reference when data hasn't changed.
 */
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installedFlag = false;
let snapshot: InstallStoreSnapshot = {
  deferred: null,
  installed: false,
};
const listeners = new Set<() => void>();

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

function refreshSnapshot() {
  snapshot = {
    deferred: deferredPrompt,
    installed: installedFlag,
  };
}

function emit() {
  refreshSnapshot();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): InstallStoreSnapshot {
  return snapshot;
}

const serverSnapshot: InstallStoreSnapshot = {
  deferred: null,
  installed: false,
};

function getServerSnapshot(): InstallStoreSnapshot {
  return serverSnapshot;
}

let listening = false;

function ensureInstallListeners() {
  if (listening || typeof window === 'undefined') return;
  listening = true;

  installedFlag = isStandaloneDisplay();
  if (!deferredPrompt && (window as any).__deferredPwaPrompt) {
    deferredPrompt = (window as any).__deferredPwaPrompt as BeforeInstallPromptEvent;
  }
  refreshSnapshot();

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    (window as any).__deferredPwaPrompt = deferredPrompt;
    emit();
  });

  window.addEventListener('appinstalled', () => {
    installedFlag = true;
    deferredPrompt = null;
    (window as any).__deferredPwaPrompt = null;
    emit();
  });

  window
    .matchMedia('(display-mode: standalone)')
    .addEventListener('change', (event) => {
      if (event.matches) {
        installedFlag = true;
        deferredPrompt = null;
        (window as any).__deferredPwaPrompt = null;
        emit();
      }
    });
}

ensureInstallListeners();

export function usePwaInstall() {
  const { deferred, installed } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  useEffect(() => {
    ensureInstallListeners();
    if (!deferredPrompt && typeof window !== 'undefined' && (window as any).__deferredPwaPrompt) {
      deferredPrompt = (window as any).__deferredPwaPrompt as BeforeInstallPromptEvent;
      emit();
    }
    if (isStandaloneDisplay() && !installedFlag) {
      installedFlag = true;
      deferredPrompt = null;
      (window as any).__deferredPwaPrompt = null;
      emit();
    }
  }, []);

  const state: PwaInstallState = installed
    ? 'installed'
    : deferred
      ? 'available'
      : isIosDevice()
        ? 'ios-hint'
        : 'browser-menu';

  const install = useCallback(async (): Promise<InstallResult> => {
    if (installedFlag) return 'installed';

    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? (window as any).__deferredPwaPrompt : null);

    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        deferredPrompt = null;
        if (typeof window !== 'undefined') {
          (window as any).__deferredPwaPrompt = null;
        }
        if (outcome === 'accepted') {
          installedFlag = true;
        }
        emit();
        return outcome;
      } catch (err) {
        console.warn('PWA install prompt error:', err);
        deferredPrompt = null;
        if (typeof window !== 'undefined') {
          (window as any).__deferredPwaPrompt = null;
        }
        emit();
      }
    }

    if (isIosDevice()) return 'ios-hint';
    return 'browser-menu';
  }, []);

  return {
    state,
    install,
    canPrompt: Boolean(deferred),
  };
}
