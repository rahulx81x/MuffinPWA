import type { Transition } from 'framer-motion';

/** Soft organic spring — primary tactile feedback. */
export const springSoft: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
};

/** Slightly snappier spring for small controls. */
export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 28,
};

/** Gentle layout glide for tab pills. */
export const springLayout: Transition = {
  type: 'spring',
  stiffness: 340,
  damping: 32,
};

/** Page / panel enter-exit. */
export const pageTransition: Transition = {
  type: 'spring',
  stiffness: 280,
  damping: 28,
};

export const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const popoverVariants = {
  initial: { opacity: 0, scale: 0.95, y: -8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: -6 },
};

export const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const sheetVariants = {
  initial: { opacity: 0.6, y: '100%' },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0.85, y: '100%' },
};

export const sheetTransition: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 32,
};
