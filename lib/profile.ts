export type Profile = Record<string, unknown>

const PROFILE_STORAGE_KEY = "national_id_profile"
const ACRONYMS = new Set(["id", "mrz", "nrc", "uin", "vid"])
const LABEL_OVERRIDES: Record<string, string> = { surName: "Surname", sub: "National ID" }

export function loadProfile(): Profile | null {
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY)
    return stored ? (JSON.parse(stored) as Profile) : null
  } catch {
    return null
  }
}

export function saveProfile(profile: Profile) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
}

export function clearProfile() {
  localStorage.removeItem(PROFILE_STORAGE_KEY)
}

export function formatProfileValue(value: unknown): string {
  if (Array.isArray(value)) {
    const first = value[0]
    if (first && typeof first === "object" && "value" in first) return String(first.value)
    return value.map(formatProfileValue).join(", ")
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    if (typeof record.formatted === "string") return record.formatted
    return Object.values(record).filter(Boolean).map(formatProfileValue).join(", ")
  }
  return String(value)
}

export function formatProfileLabel(key: string): string {
  if (LABEL_OVERRIDES[key]) return LABEL_OVERRIDES[key]
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => (ACRONYMS.has(word.toLowerCase()) ? word.toUpperCase() : word.toLowerCase()))
  const label = words.join(" ")
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function getProfileName(profile: Profile): string {
  const given = profile.givenName ? formatProfileValue(profile.givenName) : ""
  const surname = profile.surName ? formatProfileValue(profile.surName) : ""
  const name = `${given} ${surname}`.trim()
  if (name) return name
  if (profile.fullName) return formatProfileValue(profile.fullName)
  if (profile.name) return formatProfileValue(profile.name)
  return "Citizen"
}

export function getProfileInitials(profile: Profile): string {
  return getProfileName(profile)
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("")
}

export function getProfilePhoto(profile: Profile): string | undefined {
  const photo = profile.photo ?? profile.face ?? profile.picture
  return typeof photo === "string" && photo ? photo : undefined
}
