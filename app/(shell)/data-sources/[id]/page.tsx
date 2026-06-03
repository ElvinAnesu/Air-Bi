import { DataSourceDetailView } from "@/components/data-sources/data-source-detail"

type PageProps = { params: Promise<{ id: string }> }

export default async function DataSourceDetailPage({ params }: PageProps) {
  const { id } = await params
  return <DataSourceDetailView dataSourceId={id} />
}
