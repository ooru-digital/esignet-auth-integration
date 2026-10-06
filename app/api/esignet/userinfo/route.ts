import { type NextRequest, NextResponse } from "next/server"
import { getUserInfoFromCode } from "@/lib/esignet"

export async function POST(request: NextRequest) {
  const { code, code_verifier } = await request.json().catch(() => ({}))

  if (!code || !code_verifier) {
    return NextResponse.json({ error: "Missing required parameters: code and code_verifier" }, { status: 400 })
  }

  try {
    const userInfo = await getUserInfoFromCode(code, code_verifier)
    return NextResponse.json({ userInfo })
  } catch (error) {
    console.log("[v0] eSignet userinfo error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch user details from eSignet" },
      { status: 500 },
    )
  }
}
