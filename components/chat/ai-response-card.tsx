import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function AIResponseCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card
      className={cn(
        "rounded-2xl border-white/10 bg-white/[0.03] shadow-none backdrop-blur-md",
        className
      )}
    >
      <CardContent className="space-y-3 px-4 py-3">{children}</CardContent>
    </Card>
  )
}
