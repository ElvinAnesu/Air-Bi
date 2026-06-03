export type PricingPlanId = "basic" | "pro" | "enterprise"

export type PricingPlan = {
  id: PricingPlanId
  name: string
  price: string
  period: string
  description: string
  highlighted?: boolean
  cta: string
  features: string[]
  limitations?: string[]
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "basic",
    name: "Basic",
    price: "Free",
    period: "forever",
    description: "Try AirBI on a single database and prove value before you scale.",
    cta: "Get started free",
    features: [
      "1 database connection",
      "Up to 5 data sources",
      "Solo workspace (1 user)",
      "AI chat and report generation",
      "All chart types — bar, line, pie, area, and more",
      "Saved chats, reports, and queries (up to 10 each)",
      "CSV export",
      "1 public published report",
      "Resume and edit reports in chat",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$25",
    period: "per month",
    description: "For teams that run live ERP reports every week.",
    highlighted: true,
    cta: "Get started",
    features: [
      "Up to 3 database connections",
      "Up to 15 data sources",
      "Teams up to 5 members",
      "Unlimited saved chats, reports, and queries",
      "All chart types with no visualization limits",
      "Unlimited public report sharing",
      "Connection sync and schema explorer",
      "Report edit and re-save workflow",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$95",
    period: "per month",
    description: "For organizations running AirBI across multiple databases and teams.",
    cta: "Get started",
    features: [
      "Unlimited database connections",
      "Up to 25 data sources",
      "Teams up to 25 members",
      "Unlimited saved chats, reports, and queries",
      "All chart types with no visualization limits",
      "Unlimited public report sharing",
      "Connection sync and schema explorer",
      "Report edit and re-save workflow",
      "Role-based access (owner, admin, member)",
      "Configurable data retention",
    ],
  },
]

export const DATA_SOURCES_NOTE =
  "MySQL, Excel, Smartsheets, ERP databases, and more — connect your sources and start turning questions into live reports in minutes."

export const CHART_TYPES_NOTE =
  "AirBI supports all chart types. The AI picks the best visualization for your data — not just bar, line, and pie."
