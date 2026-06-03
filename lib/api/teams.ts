export type UserTeam = {
  id: string
  name: string
  slug: string
  role: string
  joinedAt: string | null
  memberCount: number
  plan: "free" | "pro" | "enterprise"
  planLabel: string
  subscriptionStatus: string
  isActive: boolean
}

export type TeamsOverview = {
  activeTeamId: string
  teams: UserTeam[]
}

export type TeamMember = {
  id: string
  userId: string
  role: string
  joinedAt: string
  fullName: string | null
  email: string | null
}

export async function fetchTeams(): Promise<TeamsOverview> {
  const res = await fetch("/api/teams")
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? "Failed to load teams")
  }
  return res.json()
}

export async function switchTeam(teamId: string) {
  const res = await fetch("/api/teams/switch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to switch team")
  return data as { ok: true; teamId: string }
}

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const res = await fetch("/api/team/members")
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? "Failed to load team members")
  }
  const data = await res.json()
  return data.members ?? []
}

export async function inviteTeamMember(email: string, role: "member" | "admin" = "member") {
  const res = await fetch("/api/team/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to invite member")
  return data as TeamMember
}
