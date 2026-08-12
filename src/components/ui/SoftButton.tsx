import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';
import { springSoft } from '../../lib/motion';

type SoftButtonProps = HTMLMotionProps<'button'> & {
  children: ReactNode;
  glow?: boolean;
};

/** Tactile pressable control with soft spring scale + optional accent glow. */
export function SoftButton({
  children,
  className = '',
  glow = true,
  disabled,
  ...props
}: SoftButtonProps) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={springSoft}
      className={`${glow ? 'soft-glow' : ''} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
