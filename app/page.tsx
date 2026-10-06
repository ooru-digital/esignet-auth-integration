"use client"

import { useEffect, useState } from "react"
import { Check, ChevronDown, ChevronRight, HandCoins, Heart, Home as HomeIcon, Landmark, Search } from "lucide-react"
import LoginCard from "@/components/login-card"
import ProfileMenu, { ProfileDetails } from "@/components/profile-menu"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  type Profile,
  clearProfile,
  getProfileInitials,
  getProfileName,
  getProfilePhoto,
  loadProfile,
  saveProfile,
} from "@/lib/profile"

// ponytail: static demo content, move to CMS/API when real services exist
const unsplash = (id: string, w = 800) => `https://images.unsplash.com/photo-${id}?w=${w}&auto=format&fit=crop&q=70`

const HERO_IMAGE = unsplash("1476703993599-0035a21b17a9", 1920)

const QUICK_ACTIONS = ["Apply for Digital ID", "Access Health Records", "Register Business", "Access eVisa"]

const LIFE_EVENTS = [
  {
    title: "Becoming A Parent",
    description:
      "Access essential services for your new family member - from birth registration to healthcare services and parental benefits.",
    image: unsplash("1555252333-9f8e92e65df9", 400),
  },
  {
    title: "Starting Your Career",
    description:
      "Begin your career journey with integrated services for job registration, taxes, and professional certifications.",
    image: unsplash("1454165804606-c3d57bc86b40", 400),
  },
  {
    title: "Planning Retirement",
    description:
      "Manage your retirement transition smoothly with digital services for pensions, healthcare, and senior benefits.",
    image: unsplash("1507525428034-b723cf961d3e", 400),
  },
]

const TOPICS = [
  {
    icon: Heart,
    title: "Healthcare",
    description:
      "Access quality healthcare services and resources to support your well-being and that of your loved ones.",
  },
  {
    icon: HomeIcon,
    title: "Housing",
    description:
      "Access government services for housing solutions, construction permits, regulations, and more, tailored to meet your needs.",
  },
  {
    icon: HandCoins,
    title: "Benefits and Social Services",
    description:
      "Explore a range of social services and benefits designed to enhance your quality of life and provide essential support.",
  },
]

const NEWS = [
  { title: "New Tax Filing Deadline: August 15", date: "16.02.2024" },
  {
    title: "Citizen Portal now supports login with your digital wallet",
    date: "11.02.2024",
  },
  { title: "The national mailbox was updated", date: "11.02.2024" },
  {
    title: "Police warn: Fraudulent calls are being made on behalf of the police",
    date: "11.02.2024",
  },
  { title: "Elderly Care Survey - Participate Now", date: "11.02.2024" },
]

const POPULAR_SERVICES = [
  {
    crumbs: ["Education", "Certificates"],
    title: "Receive High-School Graduation Certificate",
    image: unsplash("1627556704302-624286467c65"),
  },
  {
    crumbs: ["Housing", "Permits"],
    title: "Apply to Construction Permit",
    image: unsplash("1541888946425-d81bb19240f5"),
  },
  {
    crumbs: ["Benefits and Social Services", "Claim"],
    title: "Claim Unconditional Social Cash Transfer",
    image: unsplash("1521791136064-7986c2920216"),
  },
]

function ExpandButton({ label }: { label: string }) {
  // ponytail: visual only, wire up when there is more content to reveal
  return (
    <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800">
      <ChevronDown className="size-4" />
      {label}
    </button>
  )
}

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)

  useEffect(() => {
    const loaded = loadProfile()
    setProfile(loaded)
    setProfileLoaded(true)

    // OTP flow lands here via /redirect with ?login=success
    const url = new URL(window.location.href)
    if (url.searchParams.get("login") === "success") {
      if (loaded) setSuccessOpen(true)
      url.searchParams.delete("login")
      window.history.replaceState(null, "", url.pathname + url.search + url.hash)
    }
  }, [])

  const handleLogin = (loggedInProfile: Profile) => {
    saveProfile(loggedInProfile)
    setProfile(loggedInProfile)
    setLoginOpen(false)
    setSuccessOpen(true)
  }

  const handleLogout = () => {
    clearProfile()
    setProfile(null)
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Hero */}
      <section id="home" className="relative isolate overflow-hidden">
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 -z-10 size-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-blue-900/70" />

        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <a href="#home" className="flex items-center gap-3 text-white">
            <span className="grid size-10 place-items-center rounded border-2 border-white/80">
              <Landmark className="size-6" />
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-bold tracking-wide">CITIZEN PORTAL</span>
              <span className="block text-xs uppercase tracking-wider text-white/80">National ID Services</span>
            </span>
          </a>

          <div className="flex items-center gap-6">
            <div className="hidden items-center gap-6 text-sm font-medium text-white sm:flex">
              <a href="#home" className="border-b-2 border-white pb-1">
                Home
              </a>
              <a href="#services" className="pb-1 hover:text-white/80">
                Services
              </a>
              <a href="#search" className="flex items-center gap-1 pb-1 hover:text-white/80">
                Search <Search className="size-4" />
              </a>
            </div>
            {profileLoaded &&
              (profile ? (
                <ProfileMenu profile={profile} onLogout={handleLogout} />
              ) : (
                <button
                  onClick={() => setLoginOpen(true)}
                  className="rounded-full bg-white px-6 py-1.5 text-sm font-semibold text-blue-900 transition-colors hover:bg-blue-50"
                >
                  Log In
                </button>
              ))}
          </div>
        </nav>

        <div className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 lg:px-8 lg:pt-16">
          <h1 className="max-w-4xl text-4xl font-light leading-tight text-white sm:text-6xl">
            Your Digital Gateway to Government Services
          </h1>
          {profile && <p className="mt-4 text-lg text-white/90">Welcome back, {getProfileName(profile)}</p>}

          {/* ponytail: search is visual only until a service index exists */}
          <form
            id="search"
            onSubmit={(e) => e.preventDefault()}
            className="mt-10 flex max-w-xl overflow-hidden rounded-full bg-white shadow-lg"
          >
            <input
              type="search"
              aria-label="Search services"
              placeholder="Find services by keywords or life events"
              className="min-w-0 flex-1 px-5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="flex items-center gap-2 bg-blue-900 px-5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Search <Search className="size-4" />
            </button>
          </form>

          <p className="mt-8 text-sm font-semibold text-white">Quick Actions</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-900 transition-colors hover:bg-blue-50"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Life Events */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-light text-blue-900">Life Events</h2>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {LIFE_EVENTS.map((event) => (
            <article
              key={event.title}
              className="flex overflow-hidden rounded-xl border border-blue-900 border-b-4 bg-white transition-shadow hover:shadow-lg"
            >
              <div className="relative w-2/5 shrink-0 overflow-hidden rounded-r-[50%]">
                <img src={event.image} alt="" className="size-full object-cover" />
                <div className="absolute inset-0 bg-blue-900/30" />
              </div>
              <div className="p-4">
                <h3 className="text-xl font-light text-blue-900">{event.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{event.description}</p>
              </div>
            </article>
          ))}
        </div>
        <ExpandButton label="Expand Life Events" />
      </section>

      {/* Topics + News */}
      <section className="bg-slate-50">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 py-16 sm:px-6 lg:grid-cols-3 lg:px-8">
          <div className="lg:col-span-2">
            <h2 className="text-4xl font-light text-blue-900">Topics</h2>
            <ul className="mt-6">
              {TOPICS.map(({ icon: Icon, title, description }) => (
                <li key={title}>
                  <a href="#services" className="flex items-center gap-4 border-b border-blue-900 py-5 hover:bg-white">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-200 text-blue-900">
                      <Icon className="size-5" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-xl text-blue-900">{title}</span>
                      <span className="mt-1 block text-sm text-slate-500">{description}</span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-blue-900" />
                  </a>
                </li>
              ))}
            </ul>
            <ExpandButton label="Expand Topics" />
          </div>

          <div>
            <h2 className="text-4xl font-light text-blue-900">News</h2>
            <ul className="mt-6 space-y-5">
              {NEWS.map((item) => (
                <li key={item.title}>
                  <a href="#" className="text-sm font-semibold text-blue-900 hover:underline">
                    {item.title}
                  </a>
                  <p className="mt-1 text-xs text-slate-500">{item.date}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Popular Services */}
      <section id="services" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-light text-blue-900">Popular Services</h2>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {POPULAR_SERVICES.map((service) => (
            <a
              key={service.title}
              href="#"
              className="group relative block h-56 overflow-hidden rounded-xl border border-blue-900"
            >
              <img
                src={service.image}
                alt=""
                className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-900 via-blue-900/60 to-blue-900/10" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <p className="flex items-center gap-1 text-xs text-white/80">
                  {service.crumbs[0]} <ChevronRight className="size-3" /> {service.crumbs[1]}
                </p>
                <h3 className="mt-1 text-lg font-semibold leading-snug">{service.title}</h3>
              </div>
            </a>
          ))}
        </div>
      </section>

      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-0 bg-transparent p-0 shadow-none sm:max-w-md">
          <DialogTitle className="sr-only">Log in to Citizen Portal</DialogTitle>
          <LoginCard onLogin={handleLogin} />
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen && !!profile} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-hidden rounded-2xl border-0 bg-white p-0 sm:max-w-3xl">
          {profile && (
            <div className="flex max-h-[90vh] flex-col">
              <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-5 pr-12 sm:px-8">
                <span className="relative grid size-12 shrink-0 place-items-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-green-400/40 [animation-iteration-count:2]" />
                  <span className="relative grid size-12 place-items-center rounded-full bg-green-500 text-white shadow-lg shadow-green-500/30 animate-in zoom-in-50 duration-500">
                    <Check className="size-6" strokeWidth={3} />
                  </span>
                </span>
                <div>
                  <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                    Logged in successfully
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 text-sm text-slate-500">
                    Welcome to the Citizen Portal
                  </DialogDescription>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
                <aside className="flex shrink-0 items-center gap-4 bg-slate-50 px-6 py-5 md:w-64 md:flex-col md:gap-0 md:border-r md:border-slate-100 md:py-6 md:text-center">
                  <div className="h-28 w-24 shrink-0 overflow-hidden rounded-2xl bg-blue-900 shadow-md ring-4 ring-white md:h-52 md:w-44">
                    {getProfilePhoto(profile) ? (
                      <img src={getProfilePhoto(profile)} alt="Profile photo" className="size-full object-cover" />
                    ) : (
                      <span className="grid size-full place-items-center text-4xl font-semibold text-white">
                        {getProfileInitials(profile)}
                      </span>
                    )}
                  </div>
                  <div className="md:mt-4">
                    <p className="text-lg font-semibold text-slate-900">{getProfileName(profile)}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Details from your National ID</p>
                    <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                      <Check className="size-3" strokeWidth={3} /> Verified
                    </span>
                  </div>
                </aside>

                <ProfileDetails profile={profile} className="min-w-0 flex-1 px-6 sm:px-8 md:overflow-y-auto" />
              </div>

              <div className="flex flex-col-reverse items-center gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-between sm:px-8">
                <p className="text-xs text-slate-500">You can view these anytime from your profile icon.</p>
                <button
                  onClick={() => setSuccessOpen(false)}
                  className="w-full rounded-full bg-blue-900 px-8 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 sm:w-auto"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}
