interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function Logo({ className, size = 32, showText = true }: LogoProps) {
  return (
    <svg
      className={className}
      width={showText ? undefined : size}
      height={size}
      viewBox={showText ? "0 0 190 40" : "0 0 40 40"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 4C11.5 10 7 18 7 24C7 31 13 36 20 36C27 36 33 31 33 24C33 18 28.5 10 20 4Z"
        stroke="var(--color-primary)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M20 36C20 30 14 26 20 20C26 14 20 10 20 6"
        stroke="var(--color-accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 4C23 10 28 13 33 14"
        stroke="var(--color-primary)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {showText && (
        <text
          x="48"
          y="27"
          fontFamily="var(--font-display)"
          fontSize="22"
          fontWeight="800"
          fill="currentColor"
        >
          Campus
          <tspan fill="var(--color-primary)">Path</tspan>
        </text>
      )}
    </svg>
  );
}
