export function XolatLogoSmall({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 80"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id="glow-small">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="purpleGrad-small" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d5a7ff" />
          <stop offset="100%" stopColor="#8d739c" />
        </linearGradient>
      </defs>

      {/* Compact X */}
      <g filter="url(#glow-small)">
        <rect x="8" y="18" width="5" height="35" rx="2.5" fill="url(#purpleGrad-small)" transform="rotate(-35 10.5 35.5)" />
        <rect x="16" y="18" width="5" height="35" rx="2.5" fill="url(#purpleGrad-small)" transform="rotate(35 18.5 35.5)" />
        <circle cx="10" cy="15" r="1.5" fill="#d5a7ff" opacity="0.8" />
        <circle cx="20" cy="15" r="1.5" fill="#d5a7ff" opacity="0.8" />
      </g>

      {/* Compact O */}
      <g filter="url(#glow-small)">
        <rect x="38" y="20" width="26" height="4" rx="2" fill="url(#purpleGrad-small)" />
        <rect x="66" y="22" width="4" height="16" rx="2" fill="url(#purpleGrad-small)" transform="rotate(30 68 30)" />
        <rect x="66" y="38" width="4" height="16" rx="2" fill="url(#purpleGrad-small)" transform="rotate(-30 68 46)" />
        <rect x="38" y="52" width="26" height="4" rx="2" fill="url(#purpleGrad-small)" />
        <rect x="36" y="38" width="4" height="16" rx="2" fill="url(#purpleGrad-small)" transform="rotate(30 38 46)" />
        <rect x="36" y="22" width="4" height="16" rx="2" fill="url(#purpleGrad-small)" transform="rotate(-30 38 30)" />
      </g>
    </svg>
  );
}
