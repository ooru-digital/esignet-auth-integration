"use client"

interface IssuerCardProps {
  issuer: any
  onClick: () => void
}

export default function IssuerCard({ issuer, onClick }: IssuerCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-6 text-left transition-all duration-300 hover:border-slate-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      {/* Background gradient accent */}
      <div
        className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${issuer.color} opacity-5 blur-xl transition-all duration-300 group-hover:opacity-10`}
      ></div>

      {/* Content */}
      <div className="relative z-10">
        {/* Icon */}
        <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-blue-50 p-3">
          <span className="text-2xl">{issuer.icon}</span>
        </div>

        {/* Title and Description */}
        <h3 className="text-xl font-bold text-slate-900">{issuer.name}</h3>
        <p className="mt-2 text-sm text-slate-600">{issuer.description}</p>

        {/* Credentials count */}
        <div className="mt-4 flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-blue-500"></div>
          <span className="text-xs font-medium text-slate-500">
            {issuer.credentials.length} credential templates available
          </span>
        </div>

        {/* CTA */}
        <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition-all group-hover:gap-3">
          View Templates
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </div>
      </div>
    </button>
  )
}
