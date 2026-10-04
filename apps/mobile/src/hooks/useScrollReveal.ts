import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { Dimensions, type View } from 'react-native';

type Check = () => void;

type ScrollRevealContextValue = {
  register: (check: Check) => () => void;
  notify: () => void;
  /** Run entrances one-after-another with a short gap. */
  enqueueEnter: (play: () => void, staggerMs: number) => void;
  resetQueue: () => void;
};

const ScrollRevealContext = createContext<ScrollRevealContextValue | null>(null);

/** Lets children re-check viewport visibility when the parent ScrollView scrolls. */
export function ScrollRevealProvider({ children }: { children: ReactNode }) {
  const checks = useRef(new Set<Check>());
  const nextAt = useRef(0);

  const register = useCallback((check: Check) => {
    checks.current.add(check);
    return () => {
      checks.current.delete(check);
    };
  }, []);

  const notify = useCallback(() => {
    checks.current.forEach((check) => check());
  }, []);

  const resetQueue = useCallback(() => {
    nextAt.current = 0;
  }, []);

  const enqueueEnter = useCallback((play: () => void, staggerMs: number) => {
    const now = Date.now();
    const start = Math.max(now, nextAt.current);
    const delay = start - now;
    nextAt.current = start + staggerMs;
    if (delay <= 0) {
      play();
      return;
    }
    setTimeout(play, delay);
  }, []);

  const value = useMemo(
    () => ({ register, notify, enqueueEnter, resetQueue }),
    [register, notify, enqueueEnter, resetQueue],
  );
  return createElement(ScrollRevealContext.Provider, { value }, children);
}

export function useScrollRevealNotify() {
  return useContext(ScrollRevealContext)?.notify;
}

export function useScrollRevealQueue() {
  const ctx = useContext(ScrollRevealContext);
  return {
    enqueueEnter: ctx?.enqueueEnter,
    resetQueue: ctx?.resetQueue,
  };
}

/**
 * Calls `onEnter` once when `ref` intersects the viewport (per mount).
 * Set `enabled` false to skip (e.g. first card plays immediately).
 * Returns `onLayout` so callers can re-check after measuring.
 */
export function useScrollRevealEnter(
  ref: RefObject<View | null>,
  onEnter: () => void,
  enabled = true,
  staggerMs = 120,
) {
  const ctx = useContext(ScrollRevealContext);
  const entered = useRef(false);
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;

  const check = useCallback(() => {
    if (!enabled || entered.current) return;
    ref.current?.measureInWindow((_x, y, _w, height) => {
      if (height <= 0) return;
      const windowHeight = Dimensions.get('window').height;
      // Wait until the card has moved well into view (not just peeking at the bottom).
      const inView = y < windowHeight * 0.72 && y + height > 64;
      if (!inView) return;
      entered.current = true;
      if (ctx?.enqueueEnter) {
        ctx.enqueueEnter(() => onEnterRef.current(), staggerMs);
      } else {
        onEnterRef.current();
      }
    });
  }, [ctx, enabled, ref, staggerMs]);

  useEffect(() => {
    if (!enabled) return;
    const frame = requestAnimationFrame(check);
    return () => cancelAnimationFrame(frame);
  }, [check, enabled]);

  useEffect(() => {
    if (!enabled || !ctx) return;
    return ctx.register(check);
  }, [ctx, check, enabled]);

  return { onLayout: enabled ? check : undefined };
}
