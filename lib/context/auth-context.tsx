"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type AuthUser = {
  id: string
  email: string
  fullName: string
}

type AuthSubscription = {
  plan: string
  status: string
}

type AuthContextValue = {
  user: AuthUser | null
  teamId: string | null
  teamName: string | null
  role: string | null
  subscription: AuthSubscription | null
  loading: boolean
  signOut: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  teamId: null,
  teamName: null,
  role: null,
  subscription: null,
  loading: true,
  signOut: async () => {},
  refreshAuth: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [teamName, setTeamName] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<AuthSubscription | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me")
      const data = await res.json()
      if (data.user) {
        setUser(data.user)
        setTeamId(data.teamId)
        setTeamName(data.teamName)
        setRole(data.role ?? null)
        setSubscription(data.subscription ?? null)
      } else {
        setUser(null)
        setTeamId(null)
        setTeamName(null)
        setRole(null)
        setSubscription(null)
      }
    } catch {
      setUser(null)
      setTeamId(null)
      setTeamName(null)
      setRole(null)
      setSubscription(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshAuth()
  }, [refreshAuth])

  const signOut = async () => {
    await fetch("/api/auth/sign-out", { method: "POST" })
    router.replace("/login")
  }

  return (
    <AuthContext.Provider
      value={{ user, teamId, teamName, role, subscription, loading, signOut, refreshAuth }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
