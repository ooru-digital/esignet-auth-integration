import { OPENID4VP_CONFIG } from "@/lib/config"

export type VpSession = {
  nonce: string
  createdAt: number
  status: "pending" | "received" | "failed"
  credentialSubject?: Record<string, unknown>
  error?: string
}

// Kept on globalThis so all route handlers (and dev hot reloads) share the same store
const globalStore = globalThis as unknown as { __vpSessions?: Map<string, VpSession> }
const sessions = (globalStore.__vpSessions ??= new Map<string, VpSession>())

export function createSession(state: string, nonce: string) {
  pruneExpired()
  sessions.set(state, { nonce, createdAt: Date.now(), status: "pending" })
}

export function getSession(state: string): VpSession | undefined {
  pruneExpired()
  return sessions.get(state)
}

export function updateSession(state: string, update: Partial<VpSession>) {
  const session = sessions.get(state)
  if (session) sessions.set(state, { ...session, ...update })
}

function pruneExpired() {
  const now = Date.now()
  for (const [state, session] of sessions) {
    if (now - session.createdAt > OPENID4VP_CONFIG.SESSION_TTL_MS) sessions.delete(state)
  }
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export function extractCredentialSubject(vpToken: string): Record<string, unknown> | undefined {
  const parsed = parseMaybeJson(vpToken)
  const presentation = Array.isArray(parsed) ? parseMaybeJson(parsed[0]) : parsed
  if (!presentation || typeof presentation !== "object") return undefined

  const vcs = (presentation as { verifiableCredential?: unknown }).verifiableCredential
  const firstVc = parseMaybeJson(Array.isArray(vcs) ? vcs[0] : vcs)
  if (!firstVc || typeof firstVc !== "object") return undefined

  const subject = (firstVc as { credentialSubject?: unknown }).credentialSubject
  return subject && typeof subject === "object" ? (subject as Record<string, unknown>) : undefined
}
