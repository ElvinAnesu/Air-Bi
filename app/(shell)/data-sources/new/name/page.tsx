import { redirect } from "next/navigation"

export default function LegacyNamePage() {
  redirect("/data-sources?new=1")
}
