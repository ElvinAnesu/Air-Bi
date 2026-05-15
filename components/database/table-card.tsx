import type { ErpTable } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function TableCard({ table }: { table: ErpTable }) {
  return (
    <Card className="rounded-2xl border-white/10 bg-white/[0.03] shadow-none backdrop-blur-md">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="font-mono text-sm">{table.name}</CardTitle>
        {table.favorite && (
          <Badge variant="outline" className="text-[10px]">
            Favorite
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">{table.description}</p>
        <p className="text-muted-foreground mt-2 text-xs">{table.columns.length} columns</p>
      </CardContent>
    </Card>
  )
}
