interface SparkleProps {
  className?: string
}

/**
 * Decoración "sparkle" dorada puntual (✦) — usar con moderación, solo como
 * acento junto a badges/títulos, nunca como iconografía funcional.
 */
function Sparkle({ className = "" }: SparkleProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={`text-gold ${className}`}
    >
      <path d="M12 0c.9 5.7 2.3 8.1 8 9-5.7.9-7.1 3.3-8 9-.9-5.7-2.3-8.1-8-9 5.7-.9 7.1-3.3 8-9z" />
    </svg>
  )
}

export { Sparkle }
