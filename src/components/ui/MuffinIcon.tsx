interface MuffinIconProps {
  className?: string;
}

/** Theme-aware neon muffin mark — clean vector illustration without background graining. */
export function MuffinIcon({
  className = 'muffin-icon h-6 w-6 text-primary',
}: MuffinIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox="0 0 500 500"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <style>{`
          :root, svg {
            --bg-color: transparent;
            --top-light: var(--color-primary, #ffecb3);
            --top-dark: var(--color-primary-muted, #d87c4b);
            --cup-light: var(--color-surface-muted, #e69a5e);
            --cup-dark: var(--color-canvas-alt, #5e2b15);
            --cup-highlight: rgba(255, 235, 180, 0.25);
            --glow-color: var(--color-primary, #ffca28);
            --line-color: var(--color-text, #3a1e12);
            --chip-color: var(--color-text, #3a1e12);
          }
        `}</style>

        <linearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--top-light)" />
          <stop offset="100%" stopColor="var(--top-dark)" />
        </linearGradient>

        <linearGradient id="cupGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--cup-light)" />
          <stop offset="100%" stopColor="var(--cup-dark)" />
        </linearGradient>

        <linearGradient id="cupHighlight" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="50%" stopColor="var(--cup-highlight)" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>

        <filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <path
          id="cup-fill"
          d="M 145 275 L 175 410 C 195 430, 305 430, 325 410 L 355 275 Z"
        />
        <path
          id="cup-outline"
          d="M 145 275 L 175 410 C 195 430, 305 430, 325 410 L 355 275"
        />
        <path
          id="top-shape"
          d="M 130 270 C 105 245, 110 195, 145 175 C 175 140, 205 125, 250 125 C 295 125, 325 140, 355 175 C 390 195, 395 245, 370 270 C 345 285, 305 282, 285 273 C 265 284, 235 284, 215 273 C 195 282, 155 285, 130 270 Z"
        />
      </defs>

      {/* Outer Blurred Glow */}
      <g filter="url(#neon-glow)">
        <use
          href="#cup-outline"
          xlinkHref="#cup-outline"
          stroke="var(--glow-color)"
          strokeWidth="26"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />
        <use
          href="#top-shape"
          xlinkHref="#top-shape"
          stroke="var(--glow-color)"
          strokeWidth="26"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      {/* Crisp Outer Neon Border */}
      <use
        href="#cup-outline"
        xlinkHref="#cup-outline"
        stroke="var(--glow-color)"
        strokeWidth="18"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      <use
        href="#top-shape"
        xlinkHref="#top-shape"
        stroke="var(--glow-color)"
        strokeWidth="18"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Cup Base & Fill */}
      <use href="#cup-fill" xlinkHref="#cup-fill" fill="url(#cupGrad)" />
      <use href="#cup-fill" xlinkHref="#cup-fill" fill="url(#cupHighlight)" />
      <use
        href="#cup-outline"
        xlinkHref="#cup-outline"
        stroke="var(--line-color)"
        strokeWidth="12"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />

      {/* Cup Folds / Lines */}
      <g
        fill="none"
        stroke="var(--line-color)"
        strokeWidth="7"
        strokeLinecap="round"
      >
        <path d="M 185 285 L 205 410" />
        <path d="M 225 290 L 235 418" />
        <path d="M 275 290 L 265 418" />
        <path d="M 315 285 L 295 410" />
      </g>

      {/* Muffin Top */}
      <use
        href="#top-shape"
        xlinkHref="#top-shape"
        stroke="var(--line-color)"
        strokeWidth="12"
        strokeLinejoin="round"
        fill="url(#topGrad)"
      />

      {/* Scattered Chocolate Chips */}
      <g fill="var(--chip-color)">
        <path d="M 235 160 C 242 154, 252 162, 242 170 C 232 168, 230 164, 235 160 Z" />
        <path d="M 185 185 C 192 180, 198 188, 185 192 C 180 190, 178 186, 185 185 Z" />
        <path d="M 295 175 C 305 170, 310 180, 300 185 C 290 185, 288 180, 295 175 Z" />
        <path d="M 160 220 C 168 212, 175 220, 162 228 C 156 226, 155 222, 160 220 Z" />
        <path d="M 330 215 C 338 208, 345 216, 332 222 C 326 220, 325 216, 330 215 Z" />
        <path d="M 245 220 C 252 214, 258 222, 248 228 C 242 226, 240 222, 245 220 Z" />
        <path d="M 285 215 C 292 208, 298 216, 288 222 C 282 220, 280 216, 285 215 Z" />
        <path d="M 205 225 C 212 218, 218 226, 208 232 C 202 230, 200 226, 205 225 Z" />
      </g>
    </svg>
  );
}
