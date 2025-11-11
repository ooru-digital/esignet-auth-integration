"use client"

import { useState } from "react"
import { generatePKCE } from "@/lib/pkce"

interface CredentialTemplateProps {
  issuer: any
  onClose: () => void
}

export default function CredentialTemplate({ issuer, onClose }: CredentialTemplateProps) {
  const [selectedCredential, setSelectedCredential] = useState(issuer.credentials[0])
  const [isLoading, setIsLoading] = useState(false)

  const handleAuthorize = async () => {
    setIsLoading(true)
    try {
      const { codeVerifier, codeChallenge, state } = await generatePKCE()

      // Store PKCE values in sessionStorage for later verification
      sessionStorage.setItem("pkce_code_verifier", codeVerifier)
      sessionStorage.setItem("pkce_state", state)

      // const redirectUri = "https://v0-digital-liquio-ui.vercel.app/redirect"
      const redirectUri = "http://localhost:3000/redirect"
      const authorizeUrl = new URL("https://esignet.id.assembly.govstack.global/authorize")

      authorizeUrl.searchParams.append("response_type", "code")
      authorizeUrl.searchParams.append("client_id", "Liquio")
      authorizeUrl.searchParams.append("scope", "mosip_identity_vc_ldp")
      authorizeUrl.searchParams.append("redirect_uri", redirectUri)
      authorizeUrl.searchParams.append("state", state)
      authorizeUrl.searchParams.append("code_challenge", codeChallenge)
      authorizeUrl.searchParams.append("code_challenge_method", "S256")
      authorizeUrl.searchParams.append("ui_locales", "en")

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
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 transform rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{issuer.name}</h2>
            <p className="mt-1 text-sm text-slate-600">Select a credential template to view details</p>
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

        {/* Content */}
        <div className="p-6">
          {/* Credential List */}
          <div className="mb-6 space-y-2">
            {issuer.credentials.map((credential: any, index: number) => (
              <button
                key={index}
                onClick={() => setSelectedCredential(credential)}
                className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                  selectedCredential === credential
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <h4 className="font-semibold text-slate-900">{credential.name}</h4>
                <p className="mt-1 text-sm text-slate-600">{credential.description}</p>
              </button>
            ))}
          </div>

          {/* Selected Credential Details */}
          {selectedCredential && (
            <div className="rounded-lg bg-slate-50 p-4">
              <h3 className="mb-4 font-semibold text-slate-900">Template Fields</h3>
              <div className="space-y-3">
                {selectedCredential.fields.map((field: string, index: number) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{index + 1}</span>
                    </div>
                    <input
                      type="text"
                      placeholder={field}
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      readOnly
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
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
