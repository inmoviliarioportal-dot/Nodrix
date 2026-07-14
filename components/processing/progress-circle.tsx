"use client";

/**
 * Circular progress indicator, cyan neon, branded (not a generic spinner).
 * Renders an SVG ring whose stroke-dashoffset animates with `percent`.
 */
export function ProgressCircle({ percent }: { percent: number }) {
  const size = 220;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center glow-cyan rounded-full">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--glass-border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--neon-cyan)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 200ms linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-5xl font-semibold text-glow-cyan tabular-nums"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {Math.round(clamped)}%
        </span>
      </div>
    </div>
  );
}
