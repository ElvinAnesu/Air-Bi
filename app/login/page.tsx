"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AirbiLogo } from "@/components/brand/airbi-logo"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type Mode = "sign-in" | "sign-up" | "forgot-password"

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") ?? "/workspace"

  const [mode, setMode] = useState<Mode>("sign-in")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)

    try {
      if (mode === "forgot-password") {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        })
        const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
        if (!res.ok) {
          setError(data.error ?? "Could not send reset email.")
          return
        }
        setInfo(
          data.message ??
            "If an account exists for that email, we sent a password reset link."
        )
        return
      }

      const endpoint = mode === "sign-in" ? "/api/auth/sign-in" : "/api/auth/sign-up"
      const body =
        mode === "sign-in"
          ? { email, password }
          : { email, password, fullName }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        requiresEmailConfirmation?: boolean
        message?: string
      }
      if (!res.ok) {
        setError(data.error ?? `Request failed (${res.status})`)
        return
      }

      if (data.requiresEmailConfirmation) {
        setInfo(
          data.message ??
            "Check your email for a confirmation link before signing in."
        )
        setMode("sign-in")
        return
      }

      router.replace(redirectTo)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const title =
    mode === "sign-in"
      ? "Sign in to your account"
      : mode === "sign-up"
        ? "Create your account"
        : "Reset your password"

  const subtitle =
    mode === "sign-in"
      ? "Welcome back! Enter your credentials to continue."
      : mode === "sign-up"
        ? "Start talking to your database in seconds."
        : "Enter your email and we will send you a reset link."

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-black p-2 ring-1 ring-border">
            <AirbiLogo framed={false} className="size-full" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AirBI</h1>
            <p className="text-sm text-muted-foreground">Enterprise intelligence</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "sign-up" && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Jordan Lee"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-10 rounded-xl"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-10 rounded-xl"
              />
            </div>

            {mode !== "forgot-password" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "sign-in" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot-password")
                        setError(null)
                        setInfo(null)
                      }}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={mode === "sign-up" ? "At least 8 characters" : "••••••••"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={mode === "sign-up" ? 8 : undefined}
                    autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                    className="h-10 rounded-xl pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            {info && (
              <p className="rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary">
                {info}
              </p>
            )}

            <Button type="submit" className="h-10 w-full rounded-xl" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {mode === "sign-in"
                ? "Sign in"
                : mode === "sign-up"
                  ? "Create account"
                  : "Send reset link"}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "forgot-password" ? (
            <>
              Remember your password?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("sign-in")
                  setError(null)
                  setInfo(null)
                }}
                className={cn("font-medium text-primary hover:underline")}
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              {mode === "sign-in" ? "Do not have an account" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "sign-in" ? "sign-up" : "sign-in")
                  setError(null)
                  setInfo(null)
                }}
                className={cn("font-medium text-primary hover:underline")}
              >
                {mode === "sign-in" ? "Sign up" : "Sign in"}
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}

function LoginPageFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <Loader2 className="text-muted-foreground size-8 animate-spin" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  )
}
