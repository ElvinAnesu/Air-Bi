import type { Metadata } from "next"
import { PricingPageContent } from "@/components/marketing/pricing-page-content"

export const metadata: Metadata = {
  title: "Pricing — AirBI",
  description: "Simple pricing for AirBI. Start free, upgrade to Pro or Enterprise for teams and unlimited reports.",
}

export default function PricingPage() {
  return <PricingPageContent />
}
