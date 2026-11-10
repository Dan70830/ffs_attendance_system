import { useEffect, useState } from 'react'
import { supabase, today } from './supabase'
import {
  Brand,
  SignOutIcon,
  UserPlusIcon,
  UsersIcon,
  SearchIcon,
  ChevronRightIcon,
  PlusIcon,
  CalendarIcon,
  BarChartIcon,
  DoorOpenIcon,
  MenuIcon,
  XIcon,
  CheckCircleIcon,
  ClockIcon,
} from './Icons'

function formatLagosDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(`${dateStr}T12:00:00`)
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Africa/Lagos',
  })
}

function formatFullHeaderDate() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  })
}

export default function Home({
  profile,
  onOpenDashboard,
  onManageTeachers,
  onSelectStudent,
  onSelectEvent,
}) {
  const [events, setEvents] = useState([])
  const [students, setStudents] = useState([])
  const [studentSearch, setStudentSearch] = useState('')
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventDate, setNewEventDate] = useState(today())
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [eventError, setEventError] = useState('')
  const [tableMissing, setTableMissing] = useState(false)

  // Mobile navigation state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState('events') // 'events' | 'students'

  // Add student form state
  const [name, setName] = useState('')
  const [matricNo, setMatricNo] = useState('')
  const [detail, setDetail] = useState('')
  const [addMsg, setAddMsg] = useState('')
  const [addError, setAddError] = useState('')
  const [savingStudent, setSavingStudent] = useState(false)

  async function loadEvents() {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, event_date, status, created_by, opened_at, closed_at, attendance(id)')
      .order('event_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error && error.code === 'PGRST205') {
      setTableMissing(true)
    } else if (data) {
      setTableMissing(false)
      setEvents(data)
    }
  }

  async function loadStudents() {
    const { data } = await supabase
      .from('students')
      .select('id, full_name, matric_no, detail, active, created_at')
      .eq('active', true)
      .order('full_name')

    if (data) {
      setStudents(data)
    }
  }

  useEffect(() => {
    let active = true

    supabase
      .from('events')
      .select('id, title, event_date, status, created_by, opened_at, closed_at, attendance(id)')
      .order('event_date', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return
        if (error && error.code === 'PGRST205') {
          setTableMissing(true)
        } else if (data) {
          setTableMissing(false)
          setEvents(data)
        }
      })

    supabase
      .from('students')
      .select('id, full_name, matric_no, detail, active, created_at')
      .eq('active', true)
      .order('full_name')
      .then(({ data }) => {
        if (active && data) setStudents(data)
      })

    return () => {
      active = false
    }
  }, [])

  async function handleCreateEvent(e) {
    e.preventDefault()
    setEventError('')

    const title = newEventTitle.trim()
    if (!title) {
      setEventError('Event title is required.')
      return
    }

    setCreatingEvent(true)

    const { data, error } = await supabase
      .from('events')
      .insert({
        title,
        event_date: newEventDate,
        status: 'scheduled',
        created_by: profile.id,
      })
      .select()
      .single()

    setCreatingEvent(false)

    if (error) {
      if (error.code === 'PGRST205') {
        setEventError('Events table not found. Please run the database migration in Supabase SQL editor.')
      } else {
        setEventError('Could not create event. Please try again.')
      }
    } else {
      setNewEventTitle('')
      setNewEventDate(today())
      setShowCreateEvent(false)
      loadEvents()
      if (data) {
        onSelectEvent(data)
      }
    }
  }

  async function addStudent(e) {
    e.preventDefault()
    setAddError('')
    setAddMsg('')

    const cleanName = name.trim()
    const cleanMatric = matricNo.trim() || null
    const cleanDetail = detail.trim() || null

    if (!cleanName) {
      setAddError('Full name is required.')
      return
    }

    setSavingStudent(true)

    // Pre-check duplicate matric number if entered (case-insensitive)
    if (cleanMatric) {
      const { data: existing } = await supabase
        .from('students')
        .select('id, matric_no')
        .ilike('matric_no', cleanMatric)

      if (existing && existing.length > 0) {
        setAddError('A student with that matric number already exists.')
        setSavingStudent(false)
        return
      }
    }

    const { error } = await supabase.from('students').insert({
      full_name: cleanName,
      matric_no: cleanMatric,
      detail: cleanDetail,
      active: true,
    })

    setSavingStudent(false)

    if (error) {
      if (error.code === '23505' || error.message?.toLowerCase().includes('matric')) {
        setAddError('A student with that matric number already exists.')
      } else {
        setAddError('Could not add the student. Try again.')
      }
    } else {
      setAddMsg(`${cleanName} was added successfully.`)
      setName('')
      setMatricNo('')
      setDetail('')
      loadStudents()
      setTimeout(() => {
        setAddMsg('')
        setShowAddStudent(false)
      }, 1500)
    }
  }

  const first = (profile?.full_name || 'Teacher').split(' ')[0]
  const isPrincipal = profile?.role === 'principal'
  const initials = (profile?.full_name || 'Teacher')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const todayStr = today()
  const todaysEvents = events.filter((e) => e.event_date === todayStr)
  const pastEvents = events.filter((e) => e.event_date < todayStr)
  const totalPresentToday = todaysEvents.reduce(
    (acc, e) => acc + (e.attendance?.length || 0),
    0
  )
  const openRoomToday = todaysEvents.find((e) => e.status === 'open')

  const searchTerm = studentSearch.trim().toLowerCase()
  const filteredStudents = students.filter((s) => {
    if (!searchTerm) return true
    const nameMatch = s.full_name?.toLowerCase().includes(searchTerm)
    const matricMatch = s.matric_no?.toLowerCase().includes(searchTerm)
    return nameMatch || matricMatch
  })

  return (
    <div className="min-h-screen bg-mist text-ink">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Brand />

          {/* Desktop & Tablet Navigation (>= 768px) */}
          <div className="hidden items-center gap-2.5 md:flex">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-mist px-3 py-1 text-xs font-bold text-ink/75">
              <span className={`h-2 w-2 rounded-full ${isPrincipal ? 'bg-brand' : 'bg-ink/40'}`} />
              {first} · {isPrincipal ? 'Principal' : 'Teacher'}
            </span>

            {isPrincipal && (
              <>
                <button
                  type="button"
                  onClick={onOpenDashboard}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-brand bg-brand/5 px-3.5 py-2 text-xs font-extrabold text-brand transition-colors hover:bg-brand/10 active:scale-95"
                >
                  <BarChartIcon className="h-4 w-4" /> Attendance dashboard
                </button>
                <button
                  type="button"
                  onClick={onManageTeachers}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink transition-colors hover:bg-mist active:scale-95"
                >
                  <UsersIcon className="h-4 w-4 text-ink/60" /> Manage teachers
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => supabase.auth.signOut()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-xs font-bold text-ink/70 transition-colors hover:bg-mist hover:text-red-700 active:scale-95"
            >
              <SignOutIcon className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>

          {/* Mobile Menu Trigger (< 768px) */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              className="flex items-center gap-2 rounded-xl border border-line bg-mist/60 px-3 py-2 text-xs font-bold text-ink transition-colors hover:bg-mist active:scale-95"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[10px] font-black text-white">
                {initials}
              </span>
              <span className="capitalize">{isPrincipal ? 'Principal' : 'Teacher'}</span>
              <MenuIcon className="h-4 w-4 text-ink/60" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        {/* Database Migration Alert */}
        {tableMissing && (
          <div className="mb-6 rounded-2xl border border-sun bg-sun/15 p-4 text-xs font-semibold text-ink sm:p-5">
            <p className="text-sm font-extrabold">Database setup required:</p>
            <p className="mt-1 text-ink/80">
              The events table has not been created yet in your Supabase database. Please execute the SQL migrations in your Supabase SQL editor.
            </p>
          </div>
        )}

        {/* Welcome Banner & Action Bar */}
        <section className="mb-6 rounded-2xl border border-line bg-white p-5 shadow-2xs sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
                  Hello, {first}
                </h1>
                <span className="rounded-full bg-mist px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-ink/70">
                  {isPrincipal ? 'Principal' : 'Teacher'}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-ink/60 sm:text-sm">
                <ClockIcon className="h-3.5 w-3.5 text-ink/40" />
                {formatFullHeaderDate()}
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowCreateEvent(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-xs font-bold text-white shadow-2xs transition-all hover:bg-brand-dark active:scale-[0.98] sm:flex-initial sm:px-5 sm:py-2.5 sm:text-sm"
              >
                <PlusIcon className="h-4 w-4" /> Create event
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddError('')
                  setAddMsg('')
                  setShowAddStudent(true)
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-xs font-bold text-ink shadow-2xs transition-all hover:bg-mist active:scale-[0.98] sm:flex-initial sm:px-5 sm:py-2.5 sm:text-sm"
              >
                <UserPlusIcon className="h-4 w-4 text-ink/70" /> Add student
              </button>
            </div>
          </div>
        </section>

        {/* Live Attendance Room Banner (if room is open today) */}
        {openRoomToday && (
          <section className="mb-6 overflow-hidden rounded-2xl border-2 border-ok/30 bg-gradient-to-r from-ok/10 via-ok/5 to-white p-5 shadow-2xs sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-ok/20 px-3 py-1 text-xs font-extrabold text-ok">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
                  </span>
                  Attendance Room Is Live
                </div>
                <h2 className="text-xl font-black text-ink sm:text-2xl">
                  {openRoomToday.title}
                </h2>
                <p className="text-xs font-semibold text-ink/65 sm:text-sm">
                  <span className="font-bold text-ok">{openRoomToday.attendance?.length || 0} students</span> currently marked present.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onSelectEvent(openRoomToday)}
                className="flex items-center justify-center gap-2 rounded-xl bg-ok px-5 py-3.5 text-sm font-extrabold text-white shadow-md transition-all hover:bg-ok/90 active:scale-[0.98]"
              >
                <DoorOpenIcon className="h-5 w-5" /> Open Room Kiosk
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {/* Mobile Segmented Control Tab Switcher (< 1024px) */}
        <div className="mb-6 flex rounded-2xl border border-line bg-white p-1.5 shadow-2xs lg:hidden">
          <button
            type="button"
            onClick={() => setMobileTab('events')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-extrabold transition-all ${
              mobileTab === 'events'
                ? 'bg-brand text-white shadow-xs'
                : 'text-ink/65 hover:text-ink'
            }`}
          >
            <CalendarIcon className="h-4 w-4" />
            Class Sessions ({todaysEvents.length + pastEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('students')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-extrabold transition-all ${
              mobileTab === 'students'
                ? 'bg-brand text-white shadow-xs'
                : 'text-ink/65 hover:text-ink'
            }`}
          >
            <UsersIcon className="h-4 w-4" />
            Students Roster ({students.length})
          </button>
        </div>

        {/* Responsive Dashboard Grid */}
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          {/* COLUMN 1: SESSIONS & EVENTS (7 cols on Desktop) */}
          <div
            className={`space-y-6 lg:col-span-7 ${
              mobileTab !== 'events' ? 'hidden lg:block' : ''
            }`}
          >
            {/* Section: Today's Events */}
            <section className="rounded-2xl border border-line bg-white p-5 shadow-2xs sm:p-6">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-ink sm:text-xl">
                    Today&apos;s Sessions
                  </h2>
                  <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-extrabold text-ink/70">
                    {todaysEvents.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateEvent(true)}
                  className="text-xs font-bold text-brand hover:underline"
                >
                  + New session
                </button>
              </div>

              {/* Quick Summary Pill Row if events exist */}
              {todaysEvents.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-line bg-mist/40 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink/50">
                      Sessions Today
                    </p>
                    <p className="mt-1 text-xl font-black text-ink">{todaysEvents.length}</p>
                  </div>
                  <div className="rounded-xl border border-line bg-mist/40 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink/50">
                      Total Checked In
                    </p>
                    <p className="mt-1 text-xl font-black text-brand">{totalPresentToday}</p>
                  </div>
                  <div className="col-span-2 rounded-xl border border-line bg-mist/40 p-3 sm:col-span-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink/50">
                      Room Status
                    </p>
                    <p className="mt-1 text-xs font-bold text-ink">
                      {openRoomToday ? (
                        <span className="inline-flex items-center gap-1.5 font-extrabold text-ok">
                          <span className="h-2 w-2 rounded-full bg-ok" />
                          Live & open
                        </span>
                      ) : (
                        <span className="text-ink/60">No rooms open</span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Today's Events List */}
              {todaysEvents.length === 0 ? (
                <div className="mt-4 rounded-xl border-2 border-dashed border-line bg-mist/20 p-6 text-center">
                  <p className="text-sm font-bold text-ink">No events scheduled for today.</p>
                  <p className="mt-1 text-xs text-ink/60">
                    Create a session to begin taking attendance for your class.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCreateEvent(true)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-dark"
                  >
                    <PlusIcon className="h-3.5 w-3.5" /> Schedule today&apos;s event
                  </button>
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
                  {todaysEvents.map((evt) => {
                    const presentCount = evt.attendance?.length || 0

                    return (
                      <li
                        key={evt.id}
                        onClick={() => onSelectEvent(evt)}
                        className="group flex cursor-pointer items-center justify-between gap-3 p-4 transition-colors hover:bg-mist/50 sm:p-5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-extrabold text-ink text-base group-hover:text-brand">
                              {evt.title}
                            </h3>
                            {evt.status === 'open' && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/15 px-2.5 py-0.5 text-xs font-extrabold text-ok">
                                <span className="h-1.5 w-1.5 rounded-full bg-ok animate-pulse" />
                                Room open
                              </span>
                            )}
                            {evt.status === 'scheduled' && (
                              <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-bold text-ink/65">
                                Scheduled
                              </span>
                            )}
                            {evt.status === 'closed' && (
                              <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-bold text-ink/50">
                                Closed
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-ink/60">
                            <span className="font-extrabold text-brand">{presentCount}</span> student
                            {presentCount === 1 ? '' : 's'} present
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-bold text-brand group-hover:underline">
                          <span className="hidden sm:inline">Open event</span>
                          <ChevronRightIcon className="h-4 w-4 text-ink/40 group-hover:text-brand" />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {/* Section: Past Events */}
            <section className="rounded-2xl border border-line bg-white p-5 shadow-2xs sm:p-6">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-ink sm:text-xl">Past Events</h2>
                  <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-extrabold text-ink/70">
                    {pastEvents.length}
                  </span>
                </div>
              </div>

              {pastEvents.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-line bg-mist/20 p-6 text-center text-xs text-ink/60">
                  No past sessions recorded yet.
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
                  {pastEvents.slice(0, 8).map((evt) => {
                    const presentCount = evt.attendance?.length || 0

                    return (
                      <li
                        key={evt.id}
                        onClick={() => onSelectEvent(evt)}
                        className="group flex cursor-pointer items-center justify-between gap-3 p-3.5 transition-colors hover:bg-mist/50 sm:p-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-bold text-ink text-sm sm:text-base group-hover:text-brand">
                              {evt.title}
                            </p>
                            <span className="rounded-md bg-mist px-2 py-0.5 text-[11px] font-semibold text-ink/60">
                              {formatLagosDate(evt.event_date)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-ink/60">
                            <span className="font-bold text-ink">{presentCount}</span> present ·{' '}
                            <span className="capitalize">{evt.status}</span>
                          </p>
                        </div>
                        <ChevronRightIcon className="h-4 w-4 shrink-0 text-ink/30 group-hover:text-brand" />
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* COLUMN 2: STUDENTS DIRECTORY (5 cols on Desktop) */}
          <div
            className={`space-y-6 lg:col-span-5 ${
              mobileTab !== 'students' ? 'hidden lg:block' : ''
            }`}
          >
            <section className="rounded-2xl border border-line bg-white p-5 shadow-2xs sm:p-6">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-ink sm:text-xl">
                    All Students
                  </h2>
                  <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-extrabold text-ink/70">
                    {students.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAddError('')
                    setAddMsg('')
                    setShowAddStudent(true)
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-line bg-mist/60 px-2.5 py-1.5 text-xs font-bold text-ink hover:bg-mist"
                >
                  <PlusIcon className="h-3.5 w-3.5" /> Add student
                </button>
              </div>

              {/* Search bar */}
              <div className="relative mt-4">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <SearchIcon className="h-4 w-4 text-ink/40" />
                </div>
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search name or matric number…"
                  className="w-full rounded-xl border border-line bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-ink placeholder:text-ink/40 focus:border-brand focus:outline-hidden"
                />
                {studentSearch && (
                  <button
                    type="button"
                    onClick={() => setStudentSearch('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-bold text-ink/40 hover:text-ink"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Students list */}
              {students.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-line bg-mist/20 p-6 text-center text-xs text-ink/60">
                  No students added yet.
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-line bg-mist/20 p-6 text-center text-xs text-ink/60">
                  No students matching &ldquo;{studentSearch}&rdquo;.
                </div>
              ) : (
                <ul className="mt-4 max-h-[580px] divide-y divide-line overflow-y-auto rounded-xl border border-line">
                  {filteredStudents.map((s) => (
                    <li
                      key={s.id}
                      onClick={() => onSelectStudent?.(s)}
                      className="group flex cursor-pointer items-center justify-between gap-3 p-3.5 transition-colors hover:bg-mist/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-ink text-sm sm:text-base group-hover:text-brand">
                          {s.full_name}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink/60">
                          {s.matric_no ? (
                            <span className="font-semibold text-brand">
                              {s.matric_no}
                            </span>
                          ) : (
                            <span className="italic text-ink/40">No matric number yet</span>
                          )}
                          {s.detail && <span className="text-ink/30">·</span>}
                          {s.detail && <span>{s.detail}</span>}
                        </div>
                      </div>
                      <ChevronRightIcon className="h-4 w-4 shrink-0 text-ink/30 group-hover:text-brand" />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* MOBILE SLIDE-OUT MENU DRAWER (< 768px) */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex justify-end bg-ink/60 backdrop-blur-xs animate-in fade-in duration-150 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-xs flex-col justify-between bg-white p-6 shadow-2xl animate-in slide-in-from-right duration-200"
          >
            <div className="space-y-6">
              {/* Header with Close */}
              <div className="flex items-center justify-between border-b border-line pb-4">
                <Brand />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-mist text-ink/60 hover:text-ink"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>

              {/* User Identity Card */}
              <div className="rounded-xl border border-line bg-mist/40 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-black text-white">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold text-ink text-sm">
                      {profile?.full_name || 'Teacher'}
                    </p>
                    <p className="truncate text-xs text-ink/60">{profile?.email || ''}</p>
                    <span className="mt-1 inline-block rounded-md bg-brand/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand">
                      {isPrincipal ? 'Principal Account' : 'Teacher Account'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Options for Principals */}
              {isPrincipal && (
                <div className="space-y-2">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink/40">
                    Principal Controls
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      onOpenDashboard()
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border border-brand/20 bg-brand/5 p-3 text-left transition-colors hover:bg-brand/10"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
                      <BarChartIcon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-black text-brand">Attendance Dashboard</p>
                      <p className="text-[11px] text-ink/60">Turnout rates & analytics</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      onManageTeachers()
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border border-line bg-white p-3 text-left transition-colors hover:bg-mist"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mist text-ink/70">
                      <UsersIcon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-ink">Manage Teachers</p>
                      <p className="text-[11px] text-ink/60">Approve & manage access</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Quick Actions */}
              <div className="space-y-2">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink/40">
                  Quick Actions
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setShowCreateEvent(true)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs font-bold text-ink hover:bg-mist"
                >
                  <CalendarIcon className="h-4 w-4 text-brand" /> Create class session
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setAddError('')
                    setAddMsg('')
                    setShowAddStudent(true)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs font-bold text-ink hover:bg-mist"
                >
                  <UserPlusIcon className="h-4 w-4 text-brand" /> Add new student
                </button>
              </div>
            </div>

            {/* Bottom: Sign out */}
            <div className="border-t border-line pt-4">
              <button
                type="button"
                onClick={() => supabase.auth.signOut()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/50 py-3 text-xs font-bold text-red-700 hover:bg-red-50"
              >
                <SignOutIcon className="h-4 w-4" /> Sign out of account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE EVENT MODAL */}
      {showCreateEvent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-xs"
          onClick={() => setShowCreateEvent(false)}
        >
          <form
            onSubmit={handleCreateEvent}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-brand">
                <CalendarIcon className="h-5 w-5" />
                <h3 className="text-xl font-black text-ink">Create Event</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateEvent(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-mist text-ink/60 hover:text-ink"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-xs text-ink/65">
              Schedule a class session to open an attendance room for your students.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink" htmlFor="new-event-title">
                  Event title
                </label>
                <input
                  id="new-event-title"
                  required
                  autoFocus
                  placeholder="e.g. Sunday class, Bible study"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium focus:border-brand focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink" htmlFor="new-event-date">
                  Event date (Lagos date)
                </label>
                <input
                  id="new-event-date"
                  type="date"
                  required
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium focus:border-brand focus:outline-hidden"
                />
              </div>
            </div>

            {eventError && (
              <p className="mt-3 text-xs font-bold text-red-700">{eventError}</p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={creatingEvent}
                className="flex-1 rounded-xl bg-brand py-3 text-sm font-extrabold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"
              >
                {creatingEvent ? 'Creating…' : 'Create event'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateEvent(false)
                  setEventError('')
                }}
                className="flex-1 rounded-xl border border-line bg-mist py-3 text-sm font-bold text-ink hover:bg-line/40"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD STUDENT MODAL */}
      {showAddStudent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-xs"
          onClick={() => setShowAddStudent(false)}
        >
          <form
            onSubmit={addStudent}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-brand">
                <UserPlusIcon className="h-5 w-5" />
                <h3 className="text-xl font-black text-ink">Add a Student</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStudent(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-mist text-ink/60 hover:text-ink"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-xs text-ink/65">
              Add a student to the unit roster. Matric numbers can be added later.
            </p>

            <div className="mt-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-ink" htmlFor="add-student-name">
                  Full name *
                </label>
                <input
                  id="add-student-name"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Samuel Ade"
                  className="mt-1 w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium focus:border-brand focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink" htmlFor="add-student-matric">
                  Matric number <span className="font-normal text-ink/50">(optional)</span>
                </label>
                <input
                  id="add-student-matric"
                  value={matricNo}
                  onChange={(e) => setMatricNo(e.target.value)}
                  placeholder="e.g. FFS-042"
                  className="mt-1 w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium focus:border-brand focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink" htmlFor="add-student-detail">
                  Detail <span className="font-normal text-ink/50">(optional)</span>
                </label>
                <input
                  id="add-student-detail"
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="e.g. Senior class, Department"
                  className="mt-1 w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium focus:border-brand focus:outline-hidden"
                />
              </div>
            </div>

            {addError && <p className="mt-3 text-xs font-bold text-red-700">{addError}</p>}
            {addMsg && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-ok">
                <CheckCircleIcon className="h-4 w-4" /> {addMsg}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={savingStudent}
                className="flex-1 rounded-xl bg-brand py-3 text-sm font-extrabold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"
              >
                {savingStudent ? 'Saving student…' : 'Save student'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddStudent(false)
                  setAddError('')
                  setAddMsg('')
                }}
                className="flex-1 rounded-xl border border-line bg-mist py-3 text-sm font-bold text-ink hover:bg-line/40"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
