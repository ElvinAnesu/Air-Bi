import { redirect } from "next/navigation"

export default function LegacyTypePage() {
  redirect("/data-sources?new=1")
}
