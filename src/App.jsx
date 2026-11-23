import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import Login from './Login'
import Home from './Home'
import Kiosk from './Kiosk'
import WaitingApproval from './WaitingApproval'
import ManageTeachers from './ManageTeachers'
import ManageGroups from './ManageGroups'
import StudentPage from './StudentPage'
import EventPage from './EventPage'
import UpdatePassword from './UpdatePassword'
import AttendancePage from './AttendancePage'
import ReportsPage from './ReportsPage'
import AppLayout from './AppLayout'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [screen, setScreen] = useState('home')
  const [homeTab, setHomeTab] = useState('overview')
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [navCounts, setNavCounts] = useState({ students: 0, groups: 0, pendingTeachers: 0 })
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
        setHomeTab('overview')
        setSelectedStudentId(null)
        setSelectedEvent(null)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [fetchProfile])

  useEffect(() => {
    if (!profile?.approved) return
    let mounted = true
    async function fetchCounts() {
      try {
        const [sRes, gRes, tRes] = await Promise.all([
          supabase.from('students').select('id', { count: 'exact', head: true }).eq('active', true),
          supabase.from('student_groups').select('id', { count: 'exact', head: true }).eq('active', true),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('approved', false),
        ])

        let myAssignedCount = 0
        if (profile?.id) {
          const { data: myGroup } = await supabase
            .from('student_groups')
            .select('id')
            .eq('lead_teacher_id', profile.id)
            .eq('active', true)
            .maybeSingle()

          if (myGroup) {
            const { count: stCount } = await supabase
              .from('students')
              .select('id', { count: 'exact', head: true })
              .eq('group_id', myGroup.id)
              .eq('active', true)
            myAssignedCount = stCount || 0
          }
        }

        if (mounted) {
          setNavCounts({
            students: sRes.count || 0,
            groups: gRes.count || 0,
            pendingTeachers: tRes.count || 0,
            myAssignedStudentsCount: myAssignedCount,
          })
        }
      } catch {
        // Non-critical background count
      }
    }
    fetchCounts()
    return () => {
      mounted = false
    }
  }, [profile?.approved, profile?.id])

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
              className="w-full rounded-md bg-brand py-2.5 text-sm font-bold text-white hover:bg-brand-dark cursor-pointer"
            >
              Try again
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="w-full rounded-md border border-line py-2.5 text-sm font-semibold text-ink/70 hover:bg-mist cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Unapproved accounts: see ONLY the Waiting for approval screen
  if (!profile.approved) {
    return (
      <WaitingApproval
        profile={profile}
        onRefresh={() => fetchProfile(session.user.id)}
        onSignOut={() => supabase.auth.signOut()}
      />
    )
  }

  // Kiosk mode: Student self-check-in is standalone full-screen without admin navigation
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

  // Navigation router function
  const handleNavigate = (targetScreen, targetTab = 'overview') => {
    setScreen(targetScreen)
    if (targetScreen === 'home') {
      setHomeTab(targetTab)
    }
  }

  return (
    <AppLayout
      profile={profile}
      currentScreen={screen}
      currentTab={homeTab}
      counts={navCounts}
      onNavigate={handleNavigate}
      onSignOut={() => supabase.auth.signOut()}
    >
      {/* Operational Attendance Workspace (Accessible to both Principals and Teachers) */}
      {screen === 'attendance' && (
        <AttendancePage
          profile={profile}
          onBack={() => handleNavigate('home', 'overview')}
          onSelectEvent={(evt) => {
            setSelectedEvent(evt)
            setScreen('event')
          }}
          onOpenKiosk={(evt) => {
            setSelectedEvent(evt)
            setScreen('kiosk')
          }}
        />
      )}

      {/* Analytical Reports Workspace (Principal-only) */}
      {(screen === 'reports' || screen === 'dashboard') && profile.role === 'principal' && (
        <ReportsPage
          onBack={() => handleNavigate('home', 'overview')}
          onSelectStudent={(studentId) => {
            setSelectedStudentId(studentId)
            setScreen('student')
          }}
          onSelectEvent={(evt) => {
            setSelectedEvent(evt)
            setScreen('event')
          }}
        />
      )}

      {screen === 'manage-teachers' && profile.role === 'principal' && (
        <ManageTeachers
          profile={profile}
          onBack={() => handleNavigate('home', 'overview')}
        />
      )}

      {screen === 'manage-groups' && profile.role === 'principal' && (
        <ManageGroups
          profile={profile}
          onBack={() => handleNavigate('home', 'overview')}
        />
      )}

      {screen === 'student' && selectedStudentId && (
        <StudentPage
          studentId={selectedStudentId}
          profile={profile}
          onBack={() => {
            setSelectedStudentId(null)
            handleNavigate('home', 'students')
          }}
        />
      )}

      {screen === 'event' && selectedEvent && (
        <EventPage
          eventId={selectedEvent.id}
          profile={profile}
          onBack={() => {
            setSelectedEvent(null)
            handleNavigate('attendance')
          }}
          onOpenKiosk={(evt) => {
            setSelectedEvent(evt)
            setScreen('kiosk')
          }}
        />
      )}

      {screen === 'home' && (
        <Home
          profile={profile}
          currentTab={homeTab}
          onTabChange={(tab) => setHomeTab(tab)}
          onOpenAttendance={() => setScreen('attendance')}
          onOpenDashboard={() => setScreen(profile.role === 'principal' ? 'reports' : 'attendance')}
          onManageTeachers={() => setScreen('manage-teachers')}
          onManageGroups={() => setScreen('manage-groups')}
          onSelectStudent={(student) => {
            setSelectedStudentId(student.id)
            setScreen('student')
          }}
          onSelectEvent={(evt) => {
            setSelectedEvent(evt)
            setScreen('event')
          }}
          onCountsLoaded={(c) => {
            setNavCounts((prev) => ({ ...prev, ...c }))
          }}
        />
      )}
    </AppLayout>
  )
}
