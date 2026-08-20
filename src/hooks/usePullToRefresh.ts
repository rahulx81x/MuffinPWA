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
  const isPullingRef = useRef(false);
  const prevDistanceRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || disabled) return;

    function getScrollTop(node: HTMLElement): number {
      if (node === document.body || node === document.documentElement) {
        return window.scrollY || document.documentElement.scrollTop;
      }
      return node.scrollTop;
    }

    function onTouchStart(e: TouchEvent) {
      if (refreshing) return;
      if (getScrollTop(el!) <= 0) {
        startYRef.current = e.touches[0].clientY;
        isPullingRef.current = true;
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (!isPullingRef.current || refreshing) return;
      const currentY = e.touches[0].clientY;
      const dy = currentY - startYRef.current;

      if (dy > 0 && getScrollTop(el!) <= 0) {
        // Apply friction dampening
        const dampened = Math.min(dy * 0.45, threshold * 1.5);
        setPullDistance(dampened);
        if (dampened >= threshold && prevDistanceRef.current < threshold) {
          navigator.vibrate?.(8);
        }
        prevDistanceRef.current = dampened;
      } else {
        isPullingRef.current = false;
        setPullDistance(0);
      }
    }

    async function onTouchEnd() {
      if (!isPullingRef.current || refreshing) return;
      isPullingRef.current = false;

      if (pullDistance >= threshold) {
        setRefreshing(true);
        setPullDistance(threshold * 0.75);
        navigator.vibrate?.(12);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPullDistance(0);
        }
      } else {
        prevDistanceRef.current = 0;
        setPullDistance(0);
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [onRefresh, threshold, disabled, refreshing]);

  return {
    containerRef: containerRef as RefObject<T | null>,
    pullDistance,
    refreshing,
    isTriggered: pullDistance >= threshold,
  };
}
