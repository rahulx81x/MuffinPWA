import { motion } from 'framer-motion';
import { BarChart3, Sparkles } from 'lucide-react';
import { springSoft } from '../../lib/motion';

interface SuperDashboardFABProps {
  onClick: () => void;
}

export function SuperDashboardFAB({ onClick }: SuperDashboardFABProps) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0, y: 12 }}
      transition={springSoft}
      className="fixed bottom-[96px] right-5 z-40 mb-safe sm:bottom-[108px] sm:right-8 pointer-events-auto"
    >
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        transition={springSoft}
        className="group relative flex h-[52px] w-[52px] sm:h-14 sm:w-14 items-center justify-center rounded-full p-[2.5px] outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-elevate"
        aria-label="Open Super Dashboard"
        title="Open Super Dashboard"
      >
        {/* Multicolour Outer Aura Glow (Blurs outward like Gemini elements) */}
        <div
          className="gemini-aura-glow absolute -inset-1.5 rounded-full opacity-70 group-hover:opacity-95 transition-opacity duration-300"
          aria-hidden="true"
        />

        {/* Multicolour Spinning Aura Ring (Crisp border) */}
        <div
          className="gemini-aura-ring absolute inset-0 rounded-full"
          aria-hidden="true"
        />

        {/* Inner Surface Disc */}
        <div className="relative z-10 flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-surface-strong transition-colors duration-200 border border-black/5 dark:border-white/10 shadow-sm">
          <div className="relative flex items-center justify-center">
            {/* Gradient-tinted icon */}
            <BarChart3
              className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110"
              strokeWidth={2.4}
            />
            <Sparkles
              className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 text-amber-400 animate-pulse"
              strokeWidth={2.2}
            />
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
}

