"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  createConnection,
  testConnection,
  updateConnection,
  type ConnectionCreatePayload,
  type ConnectionUpdatePayload,
} from "@/lib/api/connections"
import type { ConnectionType, ErpConnection } from "@/types"
import { Loader2, PlugZap, X } from "lucide-react"
import { cn } from "@/lib/utils"

type ConnectionFormProps = {
  mode?: "create" | "edit"
  connectionId?: string
  initialValues?: Partial<ConnectionCreatePayload> & { connectionType?: ConnectionType }
  onCancel?: () => void
  onSaved?: (connection: ErpConnection) => void
  className?: string
}

export function ConnectionForm({
  mode = "create",
  connectionId,
  initialValues,
  onCancel,
  onSaved,
  className,
}: ConnectionFormProps) {
  const [connectionType, setConnectionType] = useState<ConnectionType>(
    initialValues?.connectionType ?? "mssql"
  )
  const [form, setForm] = useState<ConnectionCreatePayload>({
    name: initialValues?.name ?? "",
    connectionType: initialValues?.connectionType ?? "mssql",
    server: initialValues?.server ?? "",
    database: initialValues?.database ?? "",
    user: initialValues?.user ?? "",
    password: "",
    apiToken: "",
  })
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [banner, setBanner] = useState<null | { variant: "success" | "error"; title: string; body: string }>(
    null
  )

  useEffect(() => {
    if (initialValues) {
      const type = initialValues.connectionType ?? "mssql"
      setConnectionType(type)
      setForm({
        name: initialValues.name ?? "",
        connectionType: type,
        server: initialValues.server ?? "",
        database: initialValues.database ?? "",
        user: initialValues.user ?? "",
        password: "",
        apiToken: "",
      })
    }
  }, [initialValues])

  const update = (key: keyof ConnectionCreatePayload, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const payload = (): ConnectionCreatePayload => ({
    name: form.name.trim(),
    connectionType,
    server: form.server?.trim(),
    database: form.database?.trim(),
    user: form.user?.trim(),
    password: form.password,
    apiToken: form.apiToken?.trim(),
  })

  const validate = (requireSecrets: boolean) => {
    const p = payload()
    if (!p.name) {
      setBanner({ variant: "error", title: "Missing fields", body: "Connection name is required." })
      return false
    }
    if (connectionType === "smartsheet") {
      if (requireSecrets && !p.apiToken) {
        setBanner({ variant: "error", title: "Missing fields", body: "Smartsheet API token is required." })
        return false
      }
      return true
    }
    if (!p.server || !p.database || !p.user || (requireSecrets && !p.password)) {
      setBanner({
        variant: "error",
        title: "Missing fields",
        body: requireSecrets
          ? "Server, database, username, and password are required."
          : "Server, database, and username are required.",
      })
      return false
    }
    return true
  }

  const handleTest = async () => {
    if (!validate(true)) return
    setTesting(true)
    setBanner(null)
    try {
      await testConnection(payload())
      setBanner({
        variant: "success",
        title: "Connection successful",
        body:
          connectionType === "smartsheet"
            ? "Smartsheet accepted the API token."
            : "SQL Server accepted the credentials.",
      })
    } catch (err) {
      setBanner({
        variant: "error",
        title: "Connection failed",
        body: err instanceof Error ? err.message : "Could not reach the data source.",
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    const requireSecrets = mode === "create"
    if (!validate(requireSecrets)) return
    setSaving(true)
    setBanner(null)
    try {
      const p = payload()
      let connection: ErpConnection
      if (mode === "edit" && connectionId) {
        const updates: ConnectionUpdatePayload = { name: p.name }
        if (connectionType === "smartsheet") {
          if (p.apiToken) updates.apiToken = p.apiToken
        } else {
          updates.server = p.server
          updates.database = p.database
          updates.user = p.user
          if (p.password) updates.password = p.password
        }
        connection = await updateConnection(connectionId, updates)
      } else {
        connection = await createConnection(p)
      }
      setBanner({
        variant: "success",
        title: mode === "edit" ? "Connection updated" : "Connection saved",
        body: "Saved securely to your team workspace.",
      })
      window.setTimeout(() => onSaved?.(connection), 400)
    } catch (err) {
      setBanner({
        variant: "error",
        title: mode === "edit" ? "Could not update" : "Could not save",
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
          {mode === "edit" ? "Edit connection" : "New connection"}
        </CardTitle>
        <CardDescription>
          Connect to MSSQL or Smartsheet. A matching data source is created automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {banner && (
          <Alert variant={banner.variant === "error" ? "destructive" : "default"}>
            <AlertTitle>{banner.title}</AlertTitle>
            <AlertDescription>{banner.body}</AlertDescription>
          </Alert>
        )}

        {mode === "create" && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant={connectionType === "mssql" ? "default" : "outline"}
              size="sm"
              className="rounded-xl"
              onClick={() => {
                setConnectionType("mssql")
                setForm((f) => ({ ...f, connectionType: "mssql" }))
              }}
            >
              MSSQL
            </Button>
            <Button
              type="button"
              variant={connectionType === "smartsheet" ? "default" : "outline"}
              size="sm"
              className="rounded-xl"
              onClick={() => {
                setConnectionType("smartsheet")
                setForm((f) => ({ ...f, connectionType: "smartsheet" }))
              }}
            >
              Smartsheet
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="cname">Connection name</Label>
          <Input
            id="cname"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder={connectionType === "smartsheet" ? "Marketing Smartsheet" : "SAP B1 Production"}
            className="h-10 rounded-xl border-white/12 bg-black/30"
          />
        </div>

        {connectionType === "smartsheet" ? (
          <div className="space-y-2">
            <Label htmlFor="token">API access token</Label>
            <Input
              id="token"
              type="password"
              value={form.apiToken ?? ""}
              onChange={(e) => update("apiToken", e.target.value)}
              placeholder={mode === "edit" ? "Leave blank to keep current token" : ""}
              className="h-10 rounded-xl border-white/12 bg-black/30 font-mono text-xs"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ip">Server IP</Label>
              <Input
                id="ip"
                value={form.server ?? ""}
                onChange={(e) => update("server", e.target.value)}
                placeholder="10.12.4.22"
                className="h-10 rounded-xl border-white/12 bg-black/30 font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="db">Database name</Label>
              <Input
                id="db"
                value={form.database ?? ""}
                onChange={(e) => update("database", e.target.value)}
                placeholder="SBO_DEMO_US"
                className="h-10 rounded-xl border-white/12 bg-black/30 font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user">Username</Label>
              <Input
                id="user"
                value={form.user ?? ""}
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
                value={form.password ?? ""}
                onChange={(e) => update("password", e.target.value)}
                autoComplete="current-password"
                placeholder={mode === "edit" ? "Leave blank to keep current password" : ""}
                className="h-10 rounded-xl border-white/12 bg-black/30"
              />
            </div>
          </div>
        )}

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
            {mode === "edit" ? "Save changes" : "Save connection"}
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
