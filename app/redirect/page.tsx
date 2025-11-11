"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

export default function RedirectPage() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authCode, setAuthCode] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get("code")
    const state = searchParams.get("state")

    console.log("[v0] Redirect received - Code:", code, "State:", state)

    if (!code) {
      setError("No authorization code received from eSignet")
      setLoading(false)
      return
    }

    setAuthCode(code)

    const downloadCredentials = async () => {
      try {
        const codeVerifier = sessionStorage.getItem("pkce_code_verifier")
        if (!codeVerifier) {
          throw new Error("Code verifier not found in session")
        }

        const response = await fetch("/api/credentials/download", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: code,
            state: state,
            code_verifier: codeVerifier,
          }),
        })

        console.log("[v0] API Response Status:", response.status)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `API error: ${response.status}`)
        }

        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "NationalIDCredential.pdf"
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        setLoading(false)
      } catch (err) {
        console.log("[v0] Error downloading credentials:", err)
        setError(err instanceof Error ? err.message : "Failed to download credentials")
        setLoading(false)
      }
    }

    downloadCredentials()
  }, [searchParams])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {loading && (
          <div className="rounded-lg bg-white p-8 text-center shadow-lg">
            <div className="mb-4 flex justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Processing Authentication</h2>
            <p className="mt-2 text-slate-600">Downloading your credentials from eSignet...</p>
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
              Back to Home
            </a>
          </div>
        )}

        {!loading && !error && authCode && (
          <div className="space-y-6">
            <div className="rounded-lg bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Credentials Downloaded Successfully</h2>
                  <p className="text-slate-600">Your NationalIDCredential PDF has been downloaded</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 p-6 border border-blue-200">
              <h3 className="font-semibold text-slate-900 mb-3">Authorization Code</h3>
              <div className="rounded bg-white p-3 font-mono text-sm break-all text-slate-700 border border-blue-200">
                {authCode}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(authCode)}
                className="mt-3 rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
              >
                Copy Code
              </button>
            </div>

            <a
              href="/"
              className="block rounded-lg bg-blue-600 px-4 py-3 text-center font-medium text-white hover:bg-blue-700"
            >
              Back to Home
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
