import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';
import { springSoft } from '../../lib/motion';

type SoftButtonProps = HTMLMotionProps<'button'> & {
  children: ReactNode;
  glow?: boolean;
  loading?: boolean;
};

/** Tactile pressable control with soft spring scale + optional accent glow & loading spinner. */
export function SoftButton({
  children,
  className = '',
  glow = true,
  loading = false,
  disabled,
  ...props
}: SoftButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type="button"
      disabled={isDisabled}
      aria-busy={loading ? 'true' : undefined}
      whileHover={isDisabled ? undefined : { scale: 1.02 }}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      transition={springSoft}
      className={`relative ${glow ? 'soft-glow' : ''} ${className}`}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg
            className="h-4 w-4 animate-spin text-current"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3.5"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        </span>
      )}
      <span className={`inline-flex items-center justify-center gap-1.5 ${loading ? 'opacity-0' : ''}`}>
        {children}
      </span>
    </motion.button>
  );
}

