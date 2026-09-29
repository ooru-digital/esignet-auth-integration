"use client"

import { useEffect, useState } from "react"
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Loader2,
  MessageSquareText,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from "lucide-react"
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
  const [vpRequest, setVpRequest] = useState<{ qr: string; responseUri: string } | null>(null)
  const [vpStatus, setVpStatus] = useState<VpStatus>("loading")
  const [vpError, setVpError] = useState<string | null>(null)

  const startWalletRequest = async () => {
    setShowQr(true)
    setVpStatus("loading")
    setVpError(null)
    try {
      const response = await fetch("/api/openid4vp/request", { method: "POST" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || `Failed to create request: ${response.status}`)
      setVpRequest(data)
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
        const response = await fetch(`/api/openid4vp/status?uri=${encodeURIComponent(vpRequest.responseUri)}`)
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
    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
      <div className="px-6 pb-2 pt-7 sm:px-8">
        {showQr ? (
          <button
            onClick={() => setShowQr(false)}
            className="-ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-blue-900"
          >
            <ArrowLeft className="size-4" /> Back
          </button>
        ) : null}
        {showQr ? (
          <>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">Scan with your wallet</h2>
            <p className="mt-1 text-sm text-slate-500">Share your NationalIDCredential to sign in securely.</p>
          </>
        ) : (
          <h2 className="flex flex-col items-center gap-3 text-center text-lg font-medium text-slate-600">
            Authenticate with
            <img src="/esignet-logo.png" alt="eSignet" className="h-12 w-auto" />
          </h2>
        )}
      </div>

      {!showQr && (
        <div className="flex flex-col gap-3 px-6 py-6 sm:px-8">
          <LoginOption
            icon={<QrCode className="size-5" />}
            title="Login with Wallet"
            hint="Share your National ID credential from your wallet app"
            onClick={startWalletRequest}
          />
          <LoginOption
            icon={isLoading ? <Loader2 className="size-5 animate-spin" /> : <MessageSquareText className="size-5" />}
            title={isLoading ? "Redirecting..." : "Login with OTP"}
            hint="Get a one-time code on your registered E-mail"
            onClick={handleAuthorize}
            disabled={isLoading}
          />
        </div>
      )}

      {showQr && (
        <div className="flex flex-col items-center px-6 py-6 text-center sm:px-8">
          {(vpStatus === "loading" || vpStatus === "received") && (
            <div className="flex h-72 flex-col items-center justify-center gap-3 text-sm text-slate-500">
              <Loader2 className="size-8 animate-spin text-blue-900" />
              {vpStatus === "received" ? "Logging you in..." : "Preparing QR code..."}
            </div>
          )}

          {vpStatus === "pending" && vpRequest && (
            <>
              <div className="relative rounded-2xl bg-slate-50 p-5">
                {/* corner brackets */}
                <span className="absolute left-2 top-2 size-6 rounded-tl-lg border-l-2 border-t-2 border-blue-900" />
                <span className="absolute right-2 top-2 size-6 rounded-tr-lg border-r-2 border-t-2 border-blue-900" />
                <span className="absolute bottom-2 left-2 size-6 rounded-bl-lg border-b-2 border-l-2 border-blue-900" />
                <span className="absolute bottom-2 right-2 size-6 rounded-br-lg border-b-2 border-r-2 border-blue-900" />
                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <img src={vpRequest.qr} alt="Wallet login QR code" className="size-64 max-w-full" />
                </div>
              </div>
              <p className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-500 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-blue-600" />
                </span>
                Waiting for the wallet to share...
              </p>
              <ol className="mt-6 w-full space-y-2 text-left text-sm text-slate-600">
                {["Open your wallet app", "Scan this QR code", "Approve sharing your NationalIDCredential"].map(
                  (step, i) => (
                    <li key={step} className="flex items-center gap-3">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-semibold text-blue-900">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ),
                )}
              </ol>
            </>
          )}

          {(vpStatus === "failed" || vpStatus === "expired") && (
            <div className="flex flex-col items-center py-6">
              <span className="grid size-12 place-items-center rounded-full bg-red-50 text-red-600">
                <AlertCircle className="size-6" />
              </span>
              <p className="mt-3 text-sm text-slate-700">
                {vpStatus === "expired" ? "This QR code has expired." : vpError}
              </p>
              <button
                onClick={startWalletRequest}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-blue-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
              >
                <RefreshCw className="size-4" /> Generate new QR code
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-center gap-2 border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs text-slate-500">
        <ShieldCheck className="size-4 text-blue-900" />
        Secured by National ID &middot; eSignet
      </div>
    </div>
  )
}

function LoginOption({
  icon,
  title,
  hint,
  onClick,
  disabled,
}: {
  icon: React.ReactNode
  title: string
  hint: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group flex w-full items-center gap-4 rounded-xl border border-slate-200 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-blue-900 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 disabled:pointer-events-none disabled:opacity-60"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-900 transition-colors group-hover:bg-blue-900 group-hover:text-white">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block font-semibold text-slate-900">{title}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-900" />
    </button>
  )
}
