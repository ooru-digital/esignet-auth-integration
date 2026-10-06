import { type NextRequest, NextResponse } from "next/server"
import { CREDISSUER_CONFIG, WALLET_LOGIN_ENABLED } from "@/lib/config"
import { parseAllowedResponseUri } from "@/lib/wallet"

const FAILED_STATUSES = new Set(["failed", "failure", "error", "rejected", "expired", "invalid"])

// Success payload shape isn't fixed, so look for credential_subject at any depth
function findCredentialSubject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined
  const record = value as Record<string, unknown>
  const subject = record.credential_subject ?? record.credentialSubject
  if (subject && typeof subject === "object" && !Array.isArray(subject)) return subject as Record<string, unknown>
  for (const child of Object.values(record)) {
    const found = findCredentialSubject(child)
    if (found) return found
  }
  return undefined
}

export async function GET(request: NextRequest) {
  if (!WALLET_LOGIN_ENABLED) {
    return NextResponse.json({ status: "failed", error: "Wallet login is disabled" }, { status: 404 })
  }

  const uri = request.nextUrl.searchParams.get("uri")
  const prefix = CREDISSUER_CONFIG.RESPONSE_URI_PREFIX
  const target = prefix && uri ? parseAllowedResponseUri(uri, prefix) : null
  if (!target) {
    return NextResponse.json({ status: "failed", error: "Invalid response URI" }, { status: 400 })
  }

  try {
    // Redirects are not followed, so the fetch can't leave the allowed origin and path
    const response = await fetch(target, { headers: CREDISSUER_CONFIG.HEADERS, cache: "no-store", redirect: "manual" })
    if (response.status >= 300 && response.status < 400) {
      return NextResponse.json({ status: "failed", error: "Verifier responded with an unexpected redirect" })
    }
    const data = await response.json()

    const credentialSubject = findCredentialSubject(data)
    if (credentialSubject) return NextResponse.json({ status: "received", credentialSubject })

    const status = String(data?.status ?? "").toLowerCase()
    if (!response.ok || FAILED_STATUSES.has(status)) {
      return NextResponse.json({
        status: status === "expired" ? "expired" : "failed",
        error: data?.message || data?.error || `Wallet sharing failed (${data?.status ?? response.status})`,
      })
    }

    return NextResponse.json({ status: "pending" })
  } catch (error) {
    console.log("[v0] Error polling CredIssuer response URI:", error)
    return NextResponse.json({ status: "pending" })
  }
}
