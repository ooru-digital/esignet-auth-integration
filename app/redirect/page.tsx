"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { saveProfile } from "@/lib/profile"

export default function RedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const esignetError = searchParams.get("error")
    const code = searchParams.get("code")
    const state = searchParams.get("state")

    if (esignetError) {
      setError(searchParams.get("error_description") || esignetError)
      return
    }

    if (!code) {
      setError("No authorization code received from eSignet")
      return
    }

    const expectedState = sessionStorage.getItem("pkce_state")
    const codeVerifier = sessionStorage.getItem("pkce_code_verifier")
    if (!expectedState || state !== expectedState) {
      setError("Invalid state returned from eSignet")
      return
    }
    if (!codeVerifier) {
      setError("Code verifier not found in session")
      return
    }

    // The authorization code is single-use, so clear the PKCE values before exchanging it
    sessionStorage.removeItem("pkce_code_verifier")
    sessionStorage.removeItem("pkce_state")

    const loadUserInfo = async () => {
      try {
        const response = await fetch("/api/esignet/userinfo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, code_verifier: codeVerifier }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`)

        saveProfile(data.userInfo)
        router.replace("/")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch user details from eSignet")
      }
    }

    loadUserInfo()
  }, [searchParams, router])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {!error && (
          <div className="rounded-lg bg-white p-8 text-center shadow-lg">
            <div className="mb-4 flex justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Processing Authentication</h2>
            <p className="mt-2 text-slate-600">Fetching your details from eSignet...</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-6 shadow-lg border border-red-200">
            <h2 className="text-lg font-semibold text-red-900">Error</h2>
            <p className="mt-2 text-red-700">{error}</p>
            <a
              href="/"
              className="mt-4 inline-block rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Back to Login
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
