"use client"

import { UserRound } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  type Profile,
  formatProfileLabel,
  formatProfileValue,
  getProfileInitials,
  getProfileName,
  getProfilePhoto,
} from "@/lib/profile"

const HIDDEN_FIELDS = new Set(["id", "photo", "face", "picture"])

export function ProfileDetails({ profile, className = "" }: { profile: Profile; className?: string }) {
  return (
    <dl className={`divide-y divide-slate-100 ${className}`}>
      {Object.entries(profile)
        .filter(([key]) => !HIDDEN_FIELDS.has(key))
        .map(([key, value]) => (
          <div key={key} className="grid grid-cols-5 gap-3 py-3 text-sm">
            <dt className="col-span-2 font-medium text-slate-500">{formatProfileLabel(key)}</dt>
            <dd className="col-span-3 break-all font-medium text-slate-900">{formatProfileValue(value)}</dd>
          </div>
        ))}
    </dl>
  )
}

interface ProfileMenuProps {
  profile: Profile | null
  onLogout: () => void
}

export default function ProfileMenu({ profile, onLogout }: ProfileMenuProps) {
  const photo = profile ? getProfilePhoto(profile) : undefined
  const name = profile ? getProfileName(profile) : null

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="rounded-full ring-offset-2 transition-shadow hover:ring-2 hover:ring-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Open profile"
        >
          <Avatar className="size-11 border border-slate-200">
            {photo && <AvatarImage src={photo} alt={name ?? "Profile photo"} className="object-cover" />}
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-semibold text-white">
              {profile ? getProfileInitials(profile) : <UserRound className="size-5" />}
            </AvatarFallback>
          </Avatar>
        </button>
      </SheetTrigger>

      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="items-center border-b border-slate-200 pb-6 pt-8 text-center">
          <Avatar className="size-28 border-4 border-white shadow-lg">
            {photo && <AvatarImage src={photo} alt={name ?? "Profile photo"} className="object-cover" />}
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-cyan-500 text-2xl font-semibold text-white">
              {profile ? getProfileInitials(profile) : <UserRound className="size-10" />}
            </AvatarFallback>
          </Avatar>
          <SheetTitle className="mt-3 text-xl">{name ?? "No profile yet"}</SheetTitle>
          <SheetDescription>
            {profile
              ? "Details from your National ID"
              : "Share your National ID with your wallet to fill in your profile."}
          </SheetDescription>
        </SheetHeader>

        {profile && <ProfileDetails profile={profile} className="px-4" />}

        {profile && (
          <SheetFooter className="border-t border-slate-200">
            <button
              onClick={onLogout}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
            >
              Logout
            </button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
