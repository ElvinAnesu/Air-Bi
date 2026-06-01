import Link from "next/link"
import { Instrument_Serif } from "next/font/google"
import { buttonVariants } from "@/components/ui/button"
import { LandingHeroDemo } from "@/components/marketing/landing-hero-demo"
import { MarketingBackground, MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell"
import { cn } from "@/lib/utils"
import { ArrowRight, BarChart2, Database, MessagesSquare, Shield } from "lucide-react"

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
})

const features = [
  {
    icon: MessagesSquare,
    title: "Natural language to SQL",
    description: "Ask business questions in plain English. AirBI writes the query and runs it on your database.",
  },
  {
    icon: BarChart2,
    title: "Live reports and charts",
    description: "Generate any chart type the data calls for — bar, line, pie, area, and more — plus tables and exports.",
  },
  {
    icon: Database,
    title: "Connect your data sources",
    description: "MySQL, Excel, Smartsheets, ERP databases, and more — select the tables that matter and keep everything team-scoped.",
  },
  {
    icon: Shield,
    title: "Built for teams",
    description: "Secure workspaces, saved chats, published reports, and collaboration out of the box.",
  },
] as const

export function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#09090b] text-white">
      <MarketingBackground />

      <MarketingHeader activePath="home" />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-8">
        <section
          id="product"
          className="grid items-center gap-12 py-10 md:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:py-20"
        >
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/65">
              AI workspace for enterprise data
            </div>
            <h1
              className={cn(
                display.className,
                "text-5xl leading-[1.02] tracking-tight text-white md:text-6xl lg:text-7xl"
              )}
            >
              Ask questions.
              <br />
              Get reports.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/55 md:text-lg">
              Talk to your data in natural language. Whether it lives in an ERP, Excel, Smartsheet, or any database, AirBI generates SQL and turns answers into polished reports
            </p>

            <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 shadow-xl shadow-black/20 backdrop-blur-sm">
              <p className="mb-4 text-sm text-white/70">Start building with your team workspace.</p>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-11 w-full rounded-xl bg-white text-black hover:bg-white/90"
                )}
              >
                Continue with email
                <ArrowRight className="ml-2 size-4" />
              </Link>
              <p className="mt-3 text-center text-[11px] text-white/35">
                Secure sign-in. Your data stays in your team workspace.
              </p>
            </div>
          </div>

          <LandingHeroDemo />
        </section>

        <section id="features" className="border-t border-white/8 py-16 md:py-20">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-medium text-primary">Why AirBI</p>
            <h2 className={cn(display.className, "mt-2 text-3xl text-white md:text-4xl")}>
              From question to insight in one flow
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/50 md:text-base">
              Connect your database, ask a question, and iterate in chat until the report is exactly what you need.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 transition hover:border-white/12 hover:bg-white/[0.05]"
                >
                  <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/45">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="border-t border-white/8 py-16 md:py-20">
          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] px-6 py-10 text-center md:px-12 md:py-14">
            <h2 className={cn(display.className, "text-3xl text-white md:text-4xl")}>
              Ready to talk to your database?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/50 md:text-base">
              Sign up and start generating live ERP reports from natural language in minutes.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-full bg-white px-6 text-black hover:bg-white/90")}
              >
                Get started
              </Link>
              <Link
                href="/pricing"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-11 rounded-full border-white/15 bg-transparent px-6 text-white hover:bg-white/8"
                )}
              >
                View pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  )
}
