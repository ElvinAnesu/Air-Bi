import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { AirbiLogo } from "@/components/brand/airbi-logo"
import { cn } from "@/lib/utils"

export function MarketingHeader({ activePath }: { activePath?: "home" | "pricing" }) {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 md:px-8">
      <Link href="/" className="flex items-center gap-3">
        <AirbiLogo className="size-10 shrink-0 p-1.5" />
        <div>
          <p className="text-sm font-semibold tracking-tight">AirBI</p>
          <p className="text-[11px] text-white/45">Enterprise intelligence</p>
        </div>
      </Link>
      <nav className="hidden items-center gap-8 text-sm text-white/55 md:flex">
        <Link
          href="/#product"
          className={cn("transition hover:text-white", activePath === "home" && "text-white")}
        >
          Product
        </Link>
        <Link href="/#features" className="transition hover:text-white">
          Features
        </Link>
        <Link
          href="/pricing"
          className={cn("transition hover:text-white", activePath === "pricing" && "text-white")}
        >
          Pricing
        </Link>
      </nav>
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className={cn(buttonVariants({ size: "sm" }), "rounded-full bg-white text-black hover:bg-white/90")}
        >
          Sign in
        </Link>
      </div>
    </header>
  )
}

export function MarketingFooter() {
  return (
    <footer className="relative z-10 border-t border-white/8">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-white/40 md:flex-row md:px-8">
        <p>AirBI &copy; {new Date().getFullYear()}</p>
        <p>Enterprise intelligence for modern teams.</p>
      </div>
    </footer>
  )
}

export function MarketingBackground() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute top-0 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute right-0 bottom-0 h-[360px] w-[360px] rounded-full bg-white/[0.03] blur-[100px]" />
    </div>
  )
}
