import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import Login from './Login'
import Home from './Home'
import Kiosk from './Kiosk'
import WaitingApproval from './WaitingApproval'
import ManageTeachers from './ManageTeachers'
import StudentPage from './StudentPage'
import EventPage from './EventPage'
import UpdatePassword from './UpdatePassword'
import AttendanceDashboard from './AttendanceDashboard'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [screen, setScreen] = useState('home')
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() =>
    typeof window !== 'undefined' ? window.location.hash.includes('type=recovery') : false
  )

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }
    setLoadingProfile(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    setProfile(data || null)
    setLoadingProfile(false)
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) {
        fetchProfile(data.session.user.id)
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true)
      }
      setSession(s)
      if (s?.user) {
        fetchProfile(s.user.id)
      } else {
        setProfile(null)
        setScreen('home')
        setSelectedStudentId(null)
        setSelectedEvent(null)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [fetchProfile])

  // Password recovery flow
  if (isPasswordRecovery) {
    return (
      <UpdatePassword
        onSuccess={() => {
          setIsPasswordRecovery(false)
          window.location.hash = ''
          if (session?.user) {
            fetchProfile(session.user.id)
          }
        }}
      />
    )
  }

  // Initial session check in progress
  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mist text-ink/60">
        <p className="text-sm font-semibold">Loading…</p>
      </div>
    )
  }

  // Not signed in
  if (!session) {
    return <Login />
  }

  // Signed in, but profile is loading or was not found
  if (loadingProfile && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mist text-ink/60">
        <p className="text-sm font-semibold">Loading your profile…</p>
      </div>
    )
  }

  // Fallback if profile row is completely missing in database
  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-mist p-6 text-center">
        <div className="w-full max-w-sm rounded-xl border border-line bg-white p-6 shadow-sm">
          <h2 className="text-xl font-extrabold text-ink">Profile not found</h2>
          <p className="mt-2 text-sm text-ink/70">
            We could not find a profile record for this account.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => fetchProfile(session.user.id)}
              className="w-full rounded-md bg-brand py-2.5 text-sm font-bold text-white hover:bg-brand-dark"
            >
              Try again
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="w-full rounded-md border border-line py-2.5 text-sm font-semibold text-ink/70 hover:bg-mist"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Unapproved accounts: see ONLY the Waiting for approval screen (no student data loaded)
  if (!profile.approved) {
    return (
      <WaitingApproval
        profile={profile}
        onRefresh={() => fetchProfile(session.user.id)}
        onSignOut={() => supabase.auth.signOut()}
      />
    )
  }

  // Approved accounts: Route based on screen
  if (screen === 'dashboard' && profile.role === 'principal') {
    return (
      <AttendanceDashboard
        onBack={() => setScreen('home')}
        onSelectStudent={(studentId) => {
          setSelectedStudentId(studentId)
          setScreen('student')
        }}
        onSelectEvent={(evt) => {
          setSelectedEvent(evt)
          setScreen('event')
        }}
      />
    )
  }

  if (screen === 'manage-teachers' && profile.role === 'principal') {
    return (
      <ManageTeachers
        profile={profile}
        onBack={() => setScreen('home')}
      />
    )
  }

  if (screen === 'student' && selectedStudentId) {
    return (
      <StudentPage
        studentId={selectedStudentId}
        onBack={() => {
          setSelectedStudentId(null)
          setScreen('home')
        }}
      />
    )
  }

  if (screen === 'event' && selectedEvent) {
    return (
      <EventPage
        eventId={selectedEvent.id}
        onBack={() => {
          setSelectedEvent(null)
          setScreen('home')
        }}
        onOpenKiosk={(evt) => {
          setSelectedEvent(evt)
          setScreen('kiosk')
        }}
      />
    )
  }

  if (screen === 'kiosk' && selectedEvent) {
    return (
      <Kiosk
        event={selectedEvent}
        profile={profile}
        email={session.user.email}
        onExit={() => setScreen('event')}
      />
    )
  }

  return (
    <Home
      profile={profile}
      onOpenDashboard={() => setScreen('dashboard')}
      onManageTeachers={() => setScreen('manage-teachers')}
      onSelectStudent={(student) => {
        setSelectedStudentId(student.id)
        setScreen('student')
      }}
      onSelectEvent={(evt) => {
        setSelectedEvent(evt)
        setScreen('event')
      }}
    />
  )
}
