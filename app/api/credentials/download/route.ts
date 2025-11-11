import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, state, code_verifier } = body

    console.log("[v0] Server: Downloading credentials with code:", code)

    if (!code || !code_verifier) {
      return NextResponse.json({ error: "Missing required parameters: code and code_verifier" }, { status: 400 })
    }

    const requestBody = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      // redirect_uri: "https://v0-digital-liquio-ui.vercel.app/redirect",
      redirect_uri: "http://localhost:3000/redirect",
      code_verifier: code_verifier,
      issuer: "Digital Liquio",
      credential: "NationalIDCredential",
      vcStorageExpiryLimitInTimes: "1",
      locale: "en",
    })

    const response = await fetch("https://injiweb.id.assembly.govstack.global/v1/mimoto/credentials/download", {
      method: "POST",
      headers: {
        accept: "application/pdf",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
        "cache-control": "no-cache, no-store, must-revalidate",
        "content-type": "application/x-www-form-urlencoded",
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
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=NationalIDCredential.pdf",
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
