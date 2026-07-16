export function XolatLogo({ className = "w-64 h-48" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 300"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d5a7ff" />
          <stop offset="100%" stopColor="#8d739c" />
        </linearGradient>
      </defs>

      {/* X Letter - Left side */}
      <g filter="url(#glow)">
        {/* Top left to bottom right diagonal */}
        <rect
          x="45"
          y="85"
          width="20"
          height="130"
          rx="10"
          fill="url(#purpleGrad)"
          opacity="0.9"
          transform="rotate(-35 55 150)"
        />
        {/* Top right to bottom left diagonal */}
        <rect
          x="75"
          y="85"
          width="20"
          height="130"
          rx="10"
          fill="url(#purpleGrad)"
          opacity="0.9"
          transform="rotate(35 85 150)"
        />

        {/* Decorative circles for X */}
        <circle cx="50" cy="60" r="6" fill="#d5a7ff" opacity="0.8" />
        <circle cx="90" cy="60" r="6" fill="#d5a7ff" opacity="0.8" />
        <circle cx="40" cy="150" r="5" fill="#d5a7ff" opacity="0.7" />
        <circle cx="100" cy="150" r="5" fill="#d5a7ff" opacity="0.7" />
        <circle cx="50" cy="240" r="6" fill="#d5a7ff" opacity="0.8" />
        <circle cx="90" cy="240" r="6" fill="#d5a7ff" opacity="0.8" />
      </g>

      {/* O Letter - Right side (Tech hexagon style) */}
      <g filter="url(#glow)">
        {/* Top horizontal */}
        <rect
          x="180"
          y="90"
          width="120"
          height="16"
          rx="8"
          fill="url(#purpleGrad)"
          opacity="0.9"
        />

        {/* Top right diagonal */}
        <rect
          x="295"
          y="100"
          width="16"
          height="55"
          rx="8"
          fill="url(#purpleGrad)"
          opacity="0.9"
          transform="rotate(30 303 127)"
        />

        {/* Bottom right diagonal */}
        <rect
          x="295"
          y="145"
          width="16"
          height="55"
          rx="8"
          fill="url(#purpleGrad)"
          opacity="0.9"
          transform="rotate(-30 303 173)"
        />

        {/* Bottom horizontal */}
        <rect
          x="180"
          y="194"
          width="120"
          height="16"
          rx="8"
          fill="url(#purpleGrad)"
          opacity="0.9"
        />

        {/* Bottom left diagonal */}
        <rect
          x="170"
          y="145"
          width="16"
          height="55"
          rx="8"
          fill="url(#purpleGrad)"
          opacity="0.9"
          transform="rotate(30 178 173)"
        />

        {/* Top left diagonal */}
        <rect
          x="170"
          y="100"
          width="16"
          height="55"
          rx="8"
          fill="url(#purpleGrad)"
          opacity="0.9"
          transform="rotate(-30 178 127)"
        />

        {/* Decorative circles for O */}
        <circle cx="240" cy="95" r="7" fill="#d5a7ff" opacity="0.9" />
        <circle cx="310" cy="140" r="6" fill="#d5a7ff" opacity="0.8" />
        <circle cx="240" cy="210" r="7" fill="#d5a7ff" opacity="0.9" />
        <circle cx="170" cy="140" r="6" fill="#d5a7ff" opacity="0.8" />

        {/* Inner circle tech detail */}
        <circle cx="240" cy="145" r="25" fill="none" stroke="#d5a7ff" strokeWidth="2" opacity="0.5" />
        <circle cx="240" cy="145" r="35" fill="none" stroke="#d5a7ff" strokeWidth="1.5" opacity="0.3" />
      </g>

      {/* Central tech dots */}
      <g filter="url(#glow)">
        <circle cx="240" cy="120" r="4" fill="#d5a7ff" opacity="0.8" />
        <circle cx="240" cy="145" r="4" fill="#d5a7ff" opacity="0.8" />
        <circle cx="240" cy="170" r="4" fill="#d5a7ff" opacity="0.8" />
        <circle cx="215" cy="145" r="3" fill="#d5a7ff" opacity="0.6" />
        <circle cx="265" cy="145" r="3" fill="#d5a7ff" opacity="0.6" />
      </g>
    </svg>
  );
}
