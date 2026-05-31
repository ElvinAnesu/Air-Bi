"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type AuthUser = {
  id: string
  email: string
  fullName: string
}

type AuthContextValue = {
  user: AuthUser | null
  teamId: string | null
  teamName: string | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  teamId: null,
  teamName: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [teamName, setTeamName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user)
          setTeamId(data.teamId)
          setTeamName(data.teamName)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const signOut = async () => {
    await fetch("/api/auth/sign-out", { method: "POST" })
    router.replace("/login")
  }

  return (
    <AuthContext.Provider value={{ user, teamId, teamName, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
