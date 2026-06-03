import { TeamsView } from "@/components/teams/teams-view"

export default function TeamsPage() {
  return (
    <div className="h-full overflow-auto p-4 md:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            View every workspace you belong to and switch your active team.
          </p>
        </div>
        <TeamsView />
      </div>
    </div>
  )
}
