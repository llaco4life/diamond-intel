interface LogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
}

export function Logo({ size = "md", showWordmark = true, className = "" }: LogoProps) {
  const dimensions = {
    sm: { icon: 18, text: "text-base" },
    md: { icon: 24, text: "text-xl" },
    lg: { icon: 36, text: "text-3xl" },
  }[size];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={dimensions.icon}
        height={dimensions.icon}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M12 2L22 12L12 22L2 12L12 2Z"
          fill="var(--color-primary)"
          stroke="var(--color-primary)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M12 7L17 12L12 17L7 12L12 7Z"
          fill="var(--color-primary-foreground)"
          opacity="0.85"
        />
      </svg>
      {showWordmark && (
        <span className={`font-bold tracking-tight text-foreground ${dimensions.text}`}>
          Diamond <span className="text-primary">Intel</span>
        </span>
      )}
    </div>
  );
}
