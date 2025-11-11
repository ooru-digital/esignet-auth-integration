"use client"

import { useState, useEffect } from "react"
import IssuerCard from "@/components/issuer-card"
import CredentialTemplate from "@/components/credential-template"

export default function Home() {
  const [selectedIssuer, setSelectedIssuer] = useState<any>(null)
  const [issuers, setIssuers] = useState<any[]>([])

  useEffect(() => {
    const initializeIssuers = async () => {
      const redirectUri =
        typeof window !== "undefined" ? `${window.location.origin}/redirect` : "http://localhost:3000/redirect"

      const state = "_M.x1OQ9oBy9UWClTLo97p0jpBAOfKTx.uNNbkwLDML"
      const transactionData = {
        transactionId: "JXbB4O3KAAQohCnp6LZStfywZSY0c6qqu0f5HmagrgEo",
        logoUrl: "https://credissuer-public-assets.s3.ap-south-1.amazonaws.com/credissuer_bold_logo.svg",
        authFactors: [[{ type: "KBI", count: 0, subTypes: null }]],
        authorizeScopes: [],
        essentialClaims: [],
        voluntaryClaims: [],
        configs: {
          "sbi.env": "Developer",
          "sbi.timeout.DISC": 30,
          "sbi.timeout.DINFO": 30,
          "sbi.timeout.CAPTURE": 30,
          "sbi.capture.count.face": 1,
          "sbi.capture.count.finger": 1,
          "sbi.capture.count.iris": 1,
          "sbi.capture.score.face": 70,
          "sbi.capture.score.finger": 70,
          "sbi.capture.score.iris": 70,
          "resend.otp.delay.secs": 180,
          "send.otp.channels": "email,phone",
          "captcha.sitekey": "6LfTCvornAAAAAACLmphrn-1V9bAKbESkjrqHOk9kl",
          "captcha.enable": "",
          "auth.txnid.length": "10",
          "preauth-screen-timeout-in-secs": 600,
          "consent.screen.timeout-in-secs": 600,
          "consent.screen.timeout-buffer-in-secs": 5,
          "linked-transaction-expire-in-secs": 240,
          "sbi.port.range": "4501-4600",
          "sbi.bio.subtypes.iris": "UNKNOWN",
          "sbi.bio.subtypes.finger": "UNKNOWN",
          "wallet.qr-code-buffer-in-secs": 10,
          "otp.length": 6,
          "password.regex": "^.{8,20}$",
          "password.max-length": 20,
          "username.regex": ".*",
          "username.prefix": "",
          "username.postfix": "",
          "username.max-length": 12,
          "username.input-type": "text",
          "wallet.config": [
            {
              "wallet.name": "walletName",
              "wallet.logo-url": "/images/qr_code.png",
              "wallet.download-uri": "#",
              "wallet.deep-link-uri":
                "io.mosip.residapp.inji://wla-auth?linkCode=LINK_CODE&linkExpireDateTime=LINK_EXPIRE_DT",
            },
          ],
        },
      }

      const authUrl = `https://esignet.id.assembly.govstack.global/login?state=${state}#${btoa(JSON.stringify(transactionData))}`

      // Store state for validation on redirect
      if (typeof window !== "undefined") {
        sessionStorage.setItem("esignet_state", state)
      }

      setIssuers([
        {
          id: 1,
          name: "Digital Liquio",
          description: "Digital credential issuer",
          icon: "🏛️",
          color: "from-blue-600 to-cyan-500",
          credentials: [
            {
              name: "NationalIDCredential",
              description: "Verified national identity credential",
              fields: ["Full Name", "Date of Birth", "Document ID", "Issue Date"],
              authUrl: authUrl,
            },
          ],
        },
      ])
    }

    initializeIssuers()
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Credential Issuers</h1>
            <p className="mt-2 text-slate-600">Manage and view available credential templates from trusted issuers</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {issuers.map((issuer) => (
            <IssuerCard key={issuer.id} issuer={issuer} onClick={() => setSelectedIssuer(issuer)} />
          ))}
        </div>
      </div>

      {/* Credential Template Modal */}
      {selectedIssuer && <CredentialTemplate issuer={selectedIssuer} onClose={() => setSelectedIssuer(null)} />}
    </main>
  )
}
