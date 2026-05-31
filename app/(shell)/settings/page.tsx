import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"

export default function SettingsPage() {
  return (
    <div className="h-full overflow-auto p-4 md:p-6">
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Workspace preferences (mock UI only).</p>
      </div>
      <Card className="rounded-2xl border-white/10 bg-white/[0.03] shadow-none backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-base">AI behavior</CardTitle>
          <CardDescription>Control how AirBI surfaces SQL and explanations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="sql-default">Show SQL by default</Label>
              <p className="text-muted-foreground text-xs">Builds trust with finance reviewers.</p>
            </div>
            <Switch id="sql-default" defaultChecked />
          </div>
          <Separator className="bg-white/10" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="stream">Streaming responses</Label>
              <p className="text-muted-foreground text-xs">Animate tokens as they arrive (mock).</p>
            </div>
            <Switch id="stream" defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  )
}
