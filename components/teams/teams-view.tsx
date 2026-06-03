"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  fetchTeamMembers,
  fetchTeams,
  inviteTeamMember,
  switchTeam,
  type TeamMember,
  type TeamsOverview,
} from "@/lib/api/teams"
import { useAuth } from "@/lib/context/auth-context"
import { useActiveConnection } from "@/lib/context/active-connection"
import { cn } from "@/lib/utils"
import { Check, Loader2, Users } from "lucide-react"

export function TeamsView() {
  const router = useRouter()
  const { refreshAuth, role } = useAuth()
  const { refreshConnections } = useActiveConnection()

  const [overview, setOverview] = useState<TeamsOverview | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [switchingTeamId, setSwitchingTeamId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canManageMembers = role === "owner" || role === "admin"
  const activeTeam = overview?.teams.find((team) => team.isActive) ?? null

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [teamsData, memberData] = await Promise.all([fetchTeams(), fetchTeamMembers()])
      setOverview(teamsData)
      setMembers(memberData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleSwitchTeam(teamId: string) {
    if (teamId === overview?.activeTeamId) return

    setSwitchingTeamId(teamId)
    setError(null)
    setMessage(null)
    try {
      await switchTeam(teamId)
      await refreshAuth()
      await refreshConnections()
      await load()
      setMessage("Active workspace switched.")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch team")
    } finally {
      setSwitchingTeamId(null)
    }
  }

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault()
    setInviting(true)
    setError(null)
    setMessage(null)
    try {
      const member = await inviteTeamMember(inviteEmail.trim())
      setMembers((prev) => [...prev, member])
      setInviteEmail("")
      setMessage(`${member.email ?? "Member"} added to ${activeTeam?.name ?? "your team"}.`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite member")
    } finally {
      setInviting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading teams...
      </div>
    )
  }

  if (!overview) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {error ?? "Unable to load teams."}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card className="rounded-2xl border-white/10 bg-white/[0.03] shadow-none backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-primary" />
            Your teams
          </CardTitle>
          <CardDescription>
            All workspaces you belong to. Switch the active team to change which data you see across AirBI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {overview.teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">You are not a member of any teams yet.</p>
          ) : (
            overview.teams.map((team) => (
              <div
                key={team.id}
                className={cn(
                  "flex flex-col gap-4 rounded-xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
                  team.isActive
                    ? "border-primary/30 bg-primary/10"
                    : "border-white/10 bg-black/20"
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{team.name}</p>
                    {team.isActive && (
                      <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                        Active
                      </Badge>
                    )}
                    <Badge variant="outline" className="capitalize">
                      {team.role}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {team.planLabel} plan · {team.memberCount} member{team.memberCount === 1 ? "" : "s"}
                  </p>
                </div>

                {!team.isActive && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={switchingTeamId !== null}
                    onClick={() => handleSwitchTeam(team.id)}
                    className="rounded-xl sm:shrink-0"
                  >
                    {switchingTeamId === team.id ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    Switch to this team
                  </Button>
                )}

                {team.isActive && (
                  <div className="flex items-center gap-2 text-sm text-primary sm:shrink-0">
                    <Check className="size-4" />
                    Current workspace
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {activeTeam && (
        <Card className="rounded-2xl border-white/10 bg-white/[0.03] shadow-none backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base">Members of {activeTeam.name}</CardTitle>
            <CardDescription>
              Manage members for your active workspace. Billing for this team is managed separately under Billing
              &amp; usage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{member.fullName ?? member.email ?? "Member"}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {member.role}
                  </Badge>
                </div>
              ))}
            </div>

            {canManageMembers && (
              <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                  <Label htmlFor="invite-email" className="sr-only">
                    Email
                  </Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="teammate@company.com"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    className="rounded-xl border-white/10 bg-white/[0.04]"
                    required
                  />
                </div>
                <Button type="submit" disabled={inviting} className="rounded-xl sm:w-auto">
                  {inviting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Add member
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
