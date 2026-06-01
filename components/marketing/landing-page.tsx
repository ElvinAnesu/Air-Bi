import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { AirbiLogo } from "@/components/brand/airbi-logo"
import { cn } from "@/lib/utils"
import { BarChart2, Database, MessagesSquare } from "lucide-react"

const features = [
  {
    icon: MessagesSquare,
    title: "Ask in plain language",
    description: "Describe what you need. AirBI turns it into SQL and runs it against your ERP database.",
  },
  {
    icon: BarChart2,
    title: "Reports in seconds",
    description: "Get tables, charts, and insights without writing queries or waiting on BI teams.",
  },
  {
    icon: Database,
    title: "Built for enterprise data",
    description: "Connect SAP B1 MSSQL, pick your tables, and keep everything in your team workspace.",
  },
] as const

export function LandingPage() {
  return (
    <div className="bg-background text-foreground min-h-dvh">
      <header className="border-border/60 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 md:px-6">
        <div className="flex items-center gap-2.5">
          <AirbiLogo className="size-9 shrink-0 p-1.5" />
          <div>
            <p className="text-sm font-semibold tracking-tight">AirBI</p>
            <p className="text-muted-foreground text-[11px]">Enterprise intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-xl")}>
            Sign in
          </Link>
          <Link href="/login" className={cn(buttonVariants({ size: "sm" }), "rounded-xl")}>
            Get started
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col px-4 md:px-6">
        <section className="flex flex-col items-center py-16 text-center md:py-24">
          <div className="bg-primary/10 text-primary mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
            Pilot release
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl md:leading-[1.05]">
            Talk to your database.
          </h1>
          <p className="text-muted-foreground mt-5 max-w-2xl text-base leading-relaxed md:text-lg">
            AirBI is an AI workspace for enterprise teams. Connect your ERP, ask questions in natural language,
            and get live reports from your data.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-xl px-6")}>
              Get started
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 rounded-xl px-6")}
            >
              Sign in
            </Link>
          </div>
        </section>

        <section className="border-border/60 grid gap-4 border-t py-14 md:grid-cols-3 md:py-16">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="border-border/60 bg-card rounded-2xl border p-5 shadow-sm"
              >
                <div className="bg-primary/10 text-primary mb-4 flex size-10 items-center justify-center rounded-xl">
                  <Icon className="size-4" />
                </div>
                <h2 className="text-sm font-semibold">{feature.title}</h2>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{feature.description}</p>
              </div>
            )
          })}
        </section>
      </main>

      <footer className="border-border/60 mt-auto border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs md:flex-row md:px-6">
          <p>AirBI &copy; {new Date().getFullYear()}</p>
          <p>Enterprise intelligence for modern teams.</p>
        </div>
      </footer>
    </div>
  )
}
