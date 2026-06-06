import { redirect } from "next/navigation"

export default function NewDataSourcePage() {
  redirect("/data-sources/new/tables")
}
