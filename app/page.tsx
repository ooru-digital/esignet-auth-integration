"use client"

import { useEffect, useState } from "react"
import LoginCard from "@/components/login-card"
import ProfileMenu from "@/components/profile-menu"
import { type Profile, clearProfile, getProfileName, loadProfile, saveProfile } from "@/lib/profile"

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)

  useEffect(() => {
    setProfile(loadProfile())
    setProfileLoaded(true)
  }, [])

  const handleLogin = (loggedInProfile: Profile) => {
    saveProfile(loggedInProfile)
    setProfile(loggedInProfile)
  }

  const handleLogout = () => {
    clearProfile()
    setProfile(null)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Citizen Portal</h1>
            <p className="mt-2 text-slate-600">Access government services with your National ID</p>
          </div>
          {profile && <ProfileMenu profile={profile} onLogout={handleLogout} />}
        </div>
      </div>

      {/* Content */}
      {profileLoaded && (
        <div className="mx-auto flex max-w-7xl justify-center px-4 py-12 sm:px-6 lg:px-8">
          {profile ? (
            <div className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-xl">
              <h2 className="text-2xl font-bold text-slate-900">Welcome, {getProfileName(profile)}</h2>
              <p className="mt-2 text-sm text-slate-600">
                You are logged in. Open the profile icon at the top right to view your details or log out.
              </p>
            </div>
          ) : (
            <LoginCard onLogin={handleLogin} />
          )}
        </div>
      )}
    </main>
  )
}
