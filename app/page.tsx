"use client"

import { useState } from "react"
import IssuerCard from "@/components/issuer-card"
import CredentialTemplate from "@/components/credential-template"
import { DOWNLOAD_CONFIG } from "@/lib/config"

export default function Home() {
  const [selectedIssuer, setSelectedIssuer] = useState<any>(null)
  const [issuers, setIssuers] = useState<any[]>([
    {
      id: 1,
      name: "Digital Liquio",
      description: "Digital credential issuer",
      logo: "https://credissuer-public-assets.s3.ap-south-1.amazonaws.com/public_logos/Digital_id_logo.webp",
      color: "from-blue-600 to-cyan-500",
      credentials: [
        {
          name: DOWNLOAD_CONFIG.CREDENTIAL_TYPE,
          description: "Verified national identity credential",
          logo: "https://credissuer-public-assets.s3.ap-south-1.amazonaws.com/public_logos/National_ID_logo.jpeg",
          fields: ["Full Name", "Date of Birth", "Document ID", "Issue Date"],
        },
      ],
    },
  ])

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
