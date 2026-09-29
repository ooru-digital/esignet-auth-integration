"use client"

import { useEffect, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { generatePKCE } from "@/lib/pkce"
import { AUTH_CONFIG } from "@/lib/config"
import type { Profile } from "@/lib/profile"

interface LoginCardProps {
  onLogin: (profile: Profile) => void
}

type VpStatus = "loading" | "pending" | "received" | "failed" | "expired"

export default function LoginCard({ onLogin }: LoginCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [vpRequest, setVpRequest] = useState<{ state: string; url: string } | null>(null)
  const [vpStatus, setVpStatus] = useState<VpStatus>("loading")
  const [vpError, setVpError] = useState<string | null>(null)

  const startWalletRequest = async () => {
    setShowQr(true)
    setVpStatus("loading")
    setVpError(null)
    try {
      const response = await fetch("/api/openid4vp/request", { method: "POST" })
      if (!response.ok) throw new Error(`Failed to create request: ${response.status}`)
      setVpRequest(await response.json())
      setVpStatus("pending")
    } catch (error) {
      setVpError(error instanceof Error ? error.message : "Failed to create wallet request")
      setVpStatus("failed")
    }
  }

  useEffect(() => {
    if (!vpRequest || vpStatus !== "pending") return

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/openid4vp/status?state=${encodeURIComponent(vpRequest.state)}`)
        const data = await response.json()
        if (data.status === "pending") return
        setVpStatus(data.status)
        if (data.status === "received" && data.credentialSubject) onLogin(data.credentialSubject)
        if (data.status === "failed") setVpError(data.error || "Wallet sharing failed")
      } catch (error) {
        console.log("[v0] Error polling OpenID4VP status:", error)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [vpRequest, vpStatus, onLogin])

  const handleAuthorize = async () => {
    setIsLoading(true)
    try {
      const { codeVerifier, codeChallenge, state } = await generatePKCE()

      // Store PKCE values in sessionStorage for later verification
      sessionStorage.setItem("pkce_code_verifier", codeVerifier)
      sessionStorage.setItem("pkce_state", state)

      const authorizeUrl = new URL(AUTH_CONFIG.AUTHORIZE_URL)
      authorizeUrl.searchParams.append("response_type", AUTH_CONFIG.RESPONSE_TYPE)
      authorizeUrl.searchParams.append("client_id", AUTH_CONFIG.CLIENT_ID)
      authorizeUrl.searchParams.append("scope", AUTH_CONFIG.SCOPE)
      authorizeUrl.searchParams.append("redirect_uri", AUTH_CONFIG.REDIRECT_URI)
      authorizeUrl.searchParams.append("state", state)
      authorizeUrl.searchParams.append("code_challenge", codeChallenge)
      authorizeUrl.searchParams.append("code_challenge_method", AUTH_CONFIG.CODE_CHALLENGE_METHOD)
      authorizeUrl.searchParams.append("ui_locales", AUTH_CONFIG.UI_LOCALES)
      authorizeUrl.searchParams.append("claims", JSON.stringify(AUTH_CONFIG.CLAIMS))

      console.log("[v0] Redirecting to eSignet authorize:", authorizeUrl.toString())
      window.location.href = authorizeUrl.toString()
    } catch (error) {
      console.error("Error generating PKCE:", error)
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
      <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-4">
        <h2 className="text-2xl font-bold text-slate-900">Login</h2>
        <p className="mt-1 text-sm text-slate-600">Sign in to the Citizen Portal with your National ID</p>
      </div>

      {!showQr && (
        <div className="flex flex-col gap-3 p-6">
          <button
            onClick={handleAuthorize}
            disabled={isLoading}
            className="rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3 text-sm font-medium text-white transition-all hover:shadow-lg hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50"
          >
            {isLoading ? "Redirecting..." : "Login with OTP"}
          </button>
          <button
            onClick={startWalletRequest}
            className="rounded-lg border border-blue-600 px-4 py-3 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
          >
            Login with Wallet (QR)
          </button>
        </div>
      )}

      {showQr && (
        <div className="p-6 flex flex-col items-center text-center">
          {(vpStatus === "loading" || vpStatus === "received") && (
            <p className="text-sm text-slate-600">{vpStatus === "received" ? "Logging you in..." : "Preparing QR code..."}</p>
          )}

          {vpStatus === "pending" && vpRequest && (
            <>
              <h3 className="text-lg font-bold text-slate-900">Scan with your wallet</h3>
              <p className="mt-1 mb-4 text-sm text-slate-600">
                Open your wallet app, scan this QR code and share your NationalIDCredential.
              </p>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <QRCodeSVG value={vpRequest.url} size={256} level="L" />
              </div>
              <p className="mt-4 text-xs text-slate-500">Waiting for the wallet to share...</p>
            </>
          )}

          {(vpStatus === "failed" || vpStatus === "expired") && (
            <div>
              <p className="text-sm text-red-700">
                {vpStatus === "expired" ? "This QR code has expired." : vpError}
              </p>
              <button
                onClick={startWalletRequest}
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Generate new QR code
              </button>
            </div>
          )}

          <button
            onClick={() => setShowQr(false)}
            className="mt-6 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            Back
          </button>
        </div>
      )}
    </div>
  )
}
