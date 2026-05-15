"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { createConnection, testConnection, type ConnectionCreatePayload } from "@/lib/api/connections"
import type { ErpConnection } from "@/types"
import { Loader2, PlugZap, X } from "lucide-react"
import { cn } from "@/lib/utils"

export function ConnectionForm({
  onCancel,
  onSaved,
  className,
}: {
  onCancel?: () => void
  onSaved?: (connection: ErpConnection) => void
  className?: string
}) {
  const [form, setForm] = useState<ConnectionCreatePayload>({
    name: "",
    server: "",
    database: "",
    user: "",
    password: "",
  })
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [banner, setBanner] = useState<null | { variant: "success" | "error"; title: string; body: string }>(
    null
  )

  const update = (key: keyof ConnectionCreatePayload, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const payload = (): ConnectionCreatePayload => ({
    name: form.name.trim(),
    server: form.server.trim(),
    database: form.database.trim(),
    user: form.user.trim(),
    password: form.password,
  })

  const validate = () => {
    const p = payload()
    if (!p.name || !p.server || !p.database || !p.user || !p.password) {
      setBanner({
        variant: "error",
        title: "Missing fields",
        body: "Connection name, server IP, database name, username, and password are required.",
      })
      return false
    }
    return true
  }

  const handleTest = async () => {
    if (!validate()) return
    setTesting(true)
    setBanner(null)
    try {
      await testConnection(payload())
      setBanner({
        variant: "success",
        title: "Connection successful",
        body: "SQL Server accepted the credentials.",
      })
    } catch (err) {
      setBanner({
        variant: "error",
        title: "Connection failed",
        body: err instanceof Error ? err.message : "Could not reach the database.",
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    setBanner(null)
    try {
      const connection = await createConnection(payload())
      setBanner({
        variant: "success",
        title: "Connection saved",
        body: "Stored in memory for this server session. Restart clears all connections.",
      })
      window.setTimeout(() => onSaved?.(connection), 400)
    } catch (err) {
      setBanner({
        variant: "error",
        title: "Could not save",
        body: err instanceof Error ? err.message : "Failed to save connection.",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/[0.1] bg-zinc-950/70 shadow-none ring-1 ring-white/[0.04] backdrop-blur-md",
        className
      )}
    >
      <CardHeader className="space-y-1 pb-2">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground absolute top-3 right-3 rounded-lg"
            onClick={onCancel}
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
        )}
        <CardTitle className="flex items-center gap-2 pr-10 text-base font-semibold">
          <PlugZap className="size-4 shrink-0" />
          New connection
        </CardTitle>
        <CardDescription>
          Connect to a SAP B1 MSSQL database. Credentials are kept in server memory only until restart.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {banner && (
          <Alert variant={banner.variant === "error" ? "destructive" : "default"}>
            <AlertTitle>{banner.title}</AlertTitle>
            <AlertDescription>{banner.body}</AlertDescription>
          </Alert>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cname">Connection name</Label>
            <Input
              id="cname"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="SAP B1 Production"
              className="h-10 rounded-xl border-white/12 bg-black/30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ds-kind">Data source</Label>
            <Input
              id="ds-kind"
              readOnly
              value="SAP B1 MSSQL"
              className="h-10 rounded-xl border-white/12 bg-black/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ip">Server IP</Label>
            <Input
              id="ip"
              value={form.server}
              onChange={(e) => update("server", e.target.value)}
              placeholder="10.12.4.22"
              className="h-10 rounded-xl border-white/12 bg-black/30 font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="db">Database name</Label>
            <Input
              id="db"
              value={form.database}
              onChange={(e) => update("database", e.target.value)}
              placeholder="SBO_DEMO_US"
              className="h-10 rounded-xl border-white/12 bg-black/30 font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user">Username</Label>
            <Input
              id="user"
              value={form.user}
              onChange={(e) => update("user", e.target.value)}
              autoComplete="username"
              className="h-10 rounded-xl border-white/12 bg-black/30 font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pass">Password</Label>
            <Input
              id="pass"
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              autoComplete="current-password"
              className="h-10 rounded-xl border-white/12 bg-black/30"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-white/15"
            disabled={testing || saving}
            onClick={handleTest}
          >
            {testing && <Loader2 className="mr-2 size-4 animate-spin" />}
            Test connection
          </Button>
          <Button type="button" className="rounded-xl" disabled={testing || saving} onClick={handleSave}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save connection
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" className="rounded-xl" onClick={onCancel} disabled={testing || saving}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
