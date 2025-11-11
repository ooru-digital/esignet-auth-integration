"use client"

import { useState } from "react"
import { generatePKCE } from "@/lib/pkce"
import { AUTH_CONFIG } from "@/lib/config"

interface CredentialTemplateProps {
  issuer: any
  onClose: () => void
}

export default function CredentialTemplate({ issuer, onClose }: CredentialTemplateProps) {
  const [isLoading, setIsLoading] = useState(false)
  const credential = issuer.credentials[0]

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

      console.log("[v0] Redirecting to eSignet authorize:", authorizeUrl.toString())
      window.location.href = authorizeUrl.toString()
    } catch (error) {
      console.error("Error generating PKCE:", error)
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
        onClick={onClose}
        role="button"
        tabIndex={0}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 transform rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{issuer.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 transition-colors hover:text-slate-600"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Credential Logo */}
          <div className="mb-6 flex flex-col items-center">
            {credential?.logo && (
              <img
                src={credential.logo || "/placeholder.svg"}
                alt={credential.name}
                className="h-32 w-32 object-contain"
              />
            )}
            <h3 className="mt-4 text-lg font-bold text-slate-900 text-center">{credential?.name}</h3>
            <p className="mt-2 text-sm text-slate-600 text-center">{credential?.description}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            Close
          </button>
          <button
            onClick={handleAuthorize}
            disabled={isLoading}
            className="rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50"
          >
            {isLoading ? "Redirecting..." : "Authorize with eSignet"}
          </button>
        </div>
      </div>
    </>
  )
}
