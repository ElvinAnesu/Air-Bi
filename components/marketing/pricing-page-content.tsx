import Link from "next/link"
import { Instrument_Serif } from "next/font/google"
import { buttonVariants } from "@/components/ui/button"
import {
  CHART_TYPES_NOTE,
  DATA_SOURCES_NOTE,
  PRICING_PLANS,
} from "@/lib/marketing/pricing-plans"
import { MarketingBackground, MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell"
import { cn } from "@/lib/utils"
import { Check, Database, BarChart3 } from "lucide-react"

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
})

export function PricingPageContent() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#09090b] text-white">
      <MarketingBackground />
      <MarketingHeader activePath="pricing" />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-16 md:px-8">
        <section className="py-12 text-center md:py-16">
          <p className="text-sm font-medium text-primary">Pricing</p>
          <h1 className={cn(display.className, "mt-3 text-4xl text-white md:text-6xl")}>
            Simple plans for every stage
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/50 md:text-lg">
            Start free on your own database. Upgrade when you need teams, unlimited saves,
            and production-scale collaboration.
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col rounded-[1.75rem] border p-6 md:p-7",
                plan.highlighted
                  ? "border-primary/40 bg-gradient-to-b from-primary/10 to-white/[0.03] shadow-xl shadow-primary/10 ring-1 ring-primary/20"
                  : "border-white/10 bg-white/[0.03]"
              )}
            >
              {plan.highlighted && (
                <div className="mb-4 inline-flex w-fit rounded-full bg-primary/20 px-3 py-1 text-[11px] font-medium text-primary">
                  Most popular
                </div>
              )}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">{plan.name}</h2>
                <div className="mt-3 flex items-end gap-2">
                  <span className={cn(display.className, "text-4xl text-white md:text-5xl")}>
                    {plan.price}
                  </span>
                  <span className="pb-1 text-sm text-white/45">{plan.period}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-white/50">{plan.description}</p>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-white/75">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
                {plan.limitations?.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-white/40">
                    <span className="mt-0.5 size-4 shrink-0 text-center text-xs">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/login"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-11 w-full rounded-xl",
                  plan.highlighted
                    ? "bg-white text-black hover:bg-white/90"
                    : "border border-white/15 bg-transparent text-white hover:bg-white/8"
                )}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Database className="size-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Connect the data you already use</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/50">{DATA_SOURCES_NOTE}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <BarChart3 className="size-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">All chart types included</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/50">{CHART_TYPES_NOTE}</p>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  )
}
