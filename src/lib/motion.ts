import type { Transition, Variants } from 'framer-motion';

/** Snappy tactile spring for buttons and taps (~150-180ms). */
export const springSoft: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
  mass: 0.8,
};

/** High-responsiveness spring for small chips & toggles. */
export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 550,
  damping: 32,
  mass: 0.7,
};

/** Quick layout glide for tab pills. */
export const springLayout: Transition = {
  type: 'spring',
  stiffness: 480,
  damping: 34,
  mass: 0.8,
};

/** Snappy page / tab enter-exit transition (~180ms). */
export const pageTransition: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 32,
  mass: 0.8,
};

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.1, ease: 'easeIn' },
  },
};

export const popoverVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: -4 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.15, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: -3,
    transition: { duration: 0.1, ease: 'easeIn' },
  },
};

export const backdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

export const sheetVariants: Variants = {
  initial: { opacity: 0.7, y: '100%' },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0.85, y: '100%' },
};

export const sheetTransition: Transition = {
  type: 'spring',
  stiffness: 450,
  damping: 36,
  mass: 0.85,
};
