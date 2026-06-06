import { redirect } from "next/navigation"

export default function LegacySourcePage() {
  redirect("/data-sources?new=1")
}
