import { motion } from 'framer-motion';
import { pageTransition } from '../../lib/motion';
import { MuffinIcon } from './MuffinIcon';

/** Full-viewport boot splash while the session is resolving. */
export function LoadingScreen() {
  return (
    <div
      className="relative min-h-dvh overflow-hidden bg-canvas text-text transition-theme"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading Muffin"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -left-24 top-0 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(var(--accent-rgb),0.22),transparent_68%)] blur-2xl"
          animate={{ opacity: [0.55, 0.9, 0.55], scale: [1, 1.06, 1] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -right-16 bottom-24 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,rgba(var(--accent-rgb),0.14),transparent_70%)] blur-2xl"
          animate={{ opacity: [0.4, 0.75, 0.4], scale: [1.04, 1, 1.04] }}
          transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-canvas-alt/70 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={pageTransition}
        className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 text-center"
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="relative"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 scale-150 rounded-full bg-primary/15 blur-2xl"
          />
          <MuffinIcon className="muffin-icon relative h-16 w-16 text-primary sm:h-[4.5rem] sm:w-[4.5rem]" />
        </motion.div>

        <h1 className="mt-5 font-display text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
          <span className="bg-gradient-to-br from-primary-muted via-primary to-primary-muted bg-clip-text text-transparent">
            Muffin
          </span>
        </h1>
        <p className="mt-2 text-sm text-text-secondary">Warming the oven…</p>

        <div
          className="mt-6 flex items-center gap-1.5"
          aria-hidden="true"
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-primary"
              animate={{ opacity: [0.25, 1, 0.25], scale: [0.85, 1.15, 0.85] }}
              transition={{
                duration: 1.1,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.18,
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
