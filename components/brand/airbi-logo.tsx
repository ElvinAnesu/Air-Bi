import { cn } from "@/lib/utils"

type AirbiLogoProps = {
  className?: string
  /** Show the black rounded container behind the mark */
  framed?: boolean
}

export function AirbiLogo({ className, framed = true }: AirbiLogoProps) {
  return (
    <svg
      viewBox="0 0 64 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn(framed && "rounded-xl bg-black", className)}
    >
      <rect x="10" y="28" width="11" height="14" rx="3" fill="#A3A3A3" />
      <rect x="26.5" y="18" width="11" height="24" rx="3" fill="#A3A3A3" />
      <rect x="43" y="8" width="11" height="34" rx="3" fill="#A3A3A3" />
      <path
        d="M15.5 28L32 18L48.5 8"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="15.5" cy="28" r="2.75" fill="white" />
      <circle cx="32" cy="18" r="2.75" fill="white" />
      <circle cx="48.5" cy="8" r="2.75" fill="white" />
    </svg>
  )
}
