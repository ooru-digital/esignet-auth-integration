import { type NextRequest, NextResponse } from "next/server"
import { DOWNLOAD_CONFIG, API_CONFIG, AUTH_CONFIG } from "@/lib/config"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, state, code_verifier } = body

    console.log("[v0] Server: Downloading credentials with code:", code)

    if (!code || !code_verifier) {
      return NextResponse.json({ error: "Missing required parameters: code and code_verifier" }, { status: 400 })
    }

    const requestBody = new URLSearchParams({
      grant_type: DOWNLOAD_CONFIG.GRANT_TYPE,
      code: code,
      redirect_uri: AUTH_CONFIG.REDIRECT_URI,
      code_verifier: code_verifier,
      issuer: DOWNLOAD_CONFIG.ISSUER,
      credential: DOWNLOAD_CONFIG.CREDENTIAL_TYPE,
      vcStorageExpiryLimitInTimes: DOWNLOAD_CONFIG.VC_STORAGE_EXPIRY_LIMIT,
      locale: DOWNLOAD_CONFIG.LOCALE,
    })

    const response = await fetch(DOWNLOAD_CONFIG.DOWNLOAD_URL, {
      method: "POST",
      headers: {
        accept: API_CONFIG.ACCEPT,
        "accept-language": API_CONFIG.ACCEPT_LANGUAGE,
        "cache-control": API_CONFIG.CACHE_CONTROL,
        "content-type": API_CONFIG.CONTENT_TYPE,
        pragma: "no-cache",
      },
      body: requestBody.toString(),
    })

    console.log("[v0] Server: API Response Status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.log("[v0] Server: API Error Response:", errorText)
      throw new Error(`API error: ${response.status} - ${errorText}`)
    }

    const arrayBuffer = await response.arrayBuffer()

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": API_CONFIG.ACCEPT,
        "Content-Disposition": `attachment; filename=${DOWNLOAD_CONFIG.FILENAME}`,
      },
    })
  } catch (error) {
    console.log("[v0] Server: Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to download credentials" },
      { status: 500 },
    )
  }
}
