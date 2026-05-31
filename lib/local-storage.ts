import type { ChatMessageModel } from "@/types"

// ─── Types ────────────────────────────────────────────────────────────────────

export type SavedChat = {
  id: string
  title: string
  preview: string
  messages: ChatMessageModel[]
  connectionId?: string
  connectionName?: string
  createdAt: string
  updatedAt: string
  hasReport?: boolean
}

export type SavedReport = {
  id: string
  title: string
  description: string
  sql: string
  chartType: "bar" | "pie" | "line" | "table"
  columns: string[]
  rows: Record<string, string | number | null>[]
  rowCount: number
  connectionName?: string
  savedAt: string
}

export type SavedQuery = {
  id: string
  name: string
  description: string
  sql: string
  rowCount: number
  savedAt: string
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const KEYS = {
  chats: "airbi_chats",
  reports: "airbi_reports",
  queries: "airbi_saved_queries",
} as const

// ─── Generic helpers ──────────────────────────────────────────────────────────

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[]
  } catch {
    return []
  }
}

function write<T>(key: string, items: T[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(items))
}

// ─── Relative time helper ─────────────────────────────────────────────────────

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return new Date(iso).toLocaleDateString()
}

// ─── Chats ────────────────────────────────────────────────────────────────────

export function getChats(): SavedChat[] {
  return read<SavedChat>(KEYS.chats).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

export function getChat(id: string): SavedChat | undefined {
  return read<SavedChat>(KEYS.chats).find((c) => c.id === id)
}

export function saveChat(chat: SavedChat): void {
  const all = read<SavedChat>(KEYS.chats).filter((c) => c.id !== chat.id)
  write(KEYS.chats, [chat, ...all])
}

export function deleteChat(id: string): void {
  write(KEYS.chats, read<SavedChat>(KEYS.chats).filter((c) => c.id !== id))
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export function getReports(): SavedReport[] {
  return read<SavedReport>(KEYS.reports).sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  )
}

export function saveReport(report: SavedReport): void {
  const all = read<SavedReport>(KEYS.reports).filter((r) => r.id !== report.id)
  write(KEYS.reports, [report, ...all])
}

export function deleteReport(id: string): void {
  write(KEYS.reports, read<SavedReport>(KEYS.reports).filter((r) => r.id !== id))
}

// ─── Saved Queries ────────────────────────────────────────────────────────────

export function getSavedQueries(): SavedQuery[] {
  return read<SavedQuery>(KEYS.queries).sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  )
}

export function saveQuery(query: SavedQuery): void {
  const all = read<SavedQuery>(KEYS.queries).filter((q) => q.id !== query.id)
  write(KEYS.queries, [query, ...all])
}

export function deleteQuery(id: string): void {
  write(KEYS.queries, read<SavedQuery>(KEYS.queries).filter((q) => q.id !== id))
}
