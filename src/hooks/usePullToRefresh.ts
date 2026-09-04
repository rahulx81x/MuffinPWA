import { useEffect, useRef, useState, type RefObject } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<unknown> | void;
  threshold?: number;
  disabled?: boolean;
}

export function usePullToRefresh<T extends HTMLElement = HTMLDivElement>({
  onRefresh,
  threshold = 64,
  disabled = false,
}: UsePullToRefreshOptions) {
  const containerRef = useRef<T>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isPullingRef = useRef(false);
  const prevDistanceRef = useRef(0);

  useEffect(() => {
    if (disabled) return;

    function getScrollTop(): number {
      return (
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0
      );
    }

    function onTouchStart(e: TouchEvent) {
      if (refreshing || e.touches.length !== 1) return;
      if (getScrollTop() <= 0) {
        startYRef.current = e.touches[0].clientY;
        startXRef.current = e.touches[0].clientX;
        isPullingRef.current = true;
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (!isPullingRef.current || refreshing || e.touches.length !== 1) return;
      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const dy = currentY - startYRef.current;
      const dx = currentX - startXRef.current;

      // Only handle downward vertical pulls when at the top of the viewport
      if (dy > 0 && Math.abs(dy) > Math.abs(dx) && getScrollTop() <= 0) {
        if (e.cancelable) {
          e.preventDefault(); // Stop Android Chrome from locking or cancelling the gesture
        }
        const dampened = Math.min(dy * 0.45, threshold * 1.6);
        setPullDistance(dampened);

        if (dampened >= threshold && prevDistanceRef.current < threshold) {
          navigator.vibrate?.(8);
        }
        prevDistanceRef.current = dampened;
      } else if (dy < 0) {
        isPullingRef.current = false;
        setPullDistance(0);
      }
    }

    async function onTouchEnd() {
      if (!isPullingRef.current || refreshing) return;
      isPullingRef.current = false;

      if (prevDistanceRef.current >= threshold) {
        setRefreshing(true);
        setPullDistance(threshold * 0.75);
        navigator.vibrate?.(12);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPullDistance(0);
          prevDistanceRef.current = 0;
        }
      } else {
        prevDistanceRef.current = 0;
        setPullDistance(0);
      }
    }

    function onTouchCancel() {
      isPullingRef.current = false;
      prevDistanceRef.current = 0;
      setPullDistance(0);
    }

    // Listen on window with non-passive touchmove to reliably intercept pull-to-refresh
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [onRefresh, threshold, disabled, refreshing]);

  return {
    containerRef: containerRef as RefObject<T | null>,
    pullDistance,
    refreshing,
    isTriggered: pullDistance >= threshold,
  };
}
