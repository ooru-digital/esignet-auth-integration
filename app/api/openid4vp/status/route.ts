import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/openid4vp"

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state")
  const session = state ? getSession(state) : undefined

  if (!session) {
    return NextResponse.json({ status: "expired" })
  }

  return NextResponse.json({
    status: session.status,
    credentialSubject: session.credentialSubject,
    error: session.error,
  })
}
