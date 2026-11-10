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
} from './Icons'

const dateLabel = new Date().toLocaleDateString('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Africa/Lagos',
})

function formatEventDisplayDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(`${dateStr}T12:00:00`)
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
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
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventDate, setNewEventDate] = useState(today())
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [eventError, setEventError] = useState('')
  const [tableMissing, setTableMissing] = useState(false)

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
      setAddMsg(`${cleanName} was added.`)
      setName('')
      setMatricNo('')
      setDetail('')
      loadStudents()
      setTimeout(() => setAddMsg(''), 4000)
    }
  }

  const first = (profile?.full_name || 'Teacher').split(' ')[0]
  const isPrincipal = profile?.role === 'principal'

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
    <div className="min-h-screen bg-mist">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
          <Brand />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-medium text-ink/70 sm:block">
              {first} · {isPrincipal ? 'Principal' : 'Teacher'}
            </span>

            {isPrincipal && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenDashboard}
                  className="flex items-center gap-1.5 rounded-md border border-brand bg-brand/5 px-3 py-2 text-sm font-bold text-brand hover:bg-brand/10"
                >
                  <BarChartIcon className="h-4 w-4" /> Attendance dashboard
                </button>
                <button
                  onClick={onManageTeachers}
                  className="hidden items-center gap-1.5 rounded-md border border-line bg-white px-3 py-2 text-sm font-bold text-ink hover:bg-mist sm:flex"
                >
                  <UsersIcon className="h-4 w-4" /> Manage teachers
                </button>
              </div>
            )}

            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold hover:bg-mist"
            >
              <SignOutIcon className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-8 sm:py-10 lg:grid-cols-5 lg:gap-10">
        {/* Left Column: Greeting, Create Event & Add Student */}
        <div className="space-y-6 lg:col-span-2">
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">Hello, {first}</h1>
            <p className="mt-1 text-sm text-ink/60 sm:text-base">{dateLabel}</p>
          </div>

          {/* Principal Controls Card */}
          {isPrincipal && (
            <div className="rounded-xl border border-brand/20 bg-brand/5 p-4 sm:p-5 shadow-2xs">
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-brand">
                  Principal Controls
                </h2>
                <p className="mt-0.5 text-xs text-ink/70">
                  Attendance analytics, student rates, and teacher management.
                </p>
              </div>
              <div className="mt-3.5 flex flex-wrap gap-2.5">
                <button
                  onClick={onOpenDashboard}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-3.5 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-brand-dark"
                >
                  <BarChartIcon className="h-4 w-4" /> Attendance dashboard
                </button>
                <button
                  onClick={onManageTeachers}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2.5 text-xs font-bold text-ink shadow-2xs hover:bg-mist"
                >
                  <UsersIcon className="h-4 w-4" /> Manage teachers
                </button>
              </div>
            </div>
          )}

          {/* Database Setup Alert if migration pending */}
          {tableMissing && (
            <div className="rounded-xl border border-sun/60 bg-sun/15 p-4 text-xs font-semibold text-ink">
              <p className="font-extrabold">Setup needed:</p>
              <p className="mt-1">
                The events table has not been created yet in your Supabase database. Please run the SQL migration in Supabase SQL editor to enable events.
              </p>
            </div>
          )}

          {/* Create Event Trigger */}
          <div className="rounded-xl border border-line bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold sm:text-xl">Events</h2>
                <p className="mt-0.5 text-xs text-ink/60">
                  Create an event to start an attendance room.
                </p>
              </div>
              <button
                onClick={() => setShowCreateEvent(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-dark"
              >
                <PlusIcon className="h-4 w-4" /> Create event
              </button>
            </div>
          </div>

          {/* Add a Student Form */}
          <section className="rounded-xl border border-line bg-white p-5 sm:p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <UserPlusIcon /> Add a student
            </h2>
            <form onSubmit={addStudent} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-ink" htmlFor="add-student-name">
                  Full name
                </label>
                <input
                  id="add-student-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Samuel Ade"
                  className="mt-1 w-full rounded-md border border-line px-4 py-2.5 text-sm focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink" htmlFor="add-student-matric">
                  Matric number <span className="font-normal text-ink/50">(can be added later)</span>
                </label>
                <input
                  id="add-student-matric"
                  value={matricNo}
                  onChange={(e) => setMatricNo(e.target.value)}
                  placeholder="e.g. FFS-042"
                  className="mt-1 w-full rounded-md border border-line px-4 py-2.5 text-sm focus:border-brand"
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
                  placeholder="e.g. Senior class or age group"
                  className="mt-1 w-full rounded-md border border-line px-4 py-2.5 text-sm focus:border-brand"
                />
              </div>

              {addError && <p className="text-sm font-semibold text-red-700">{addError}</p>}
              {addMsg && <p className="text-sm font-semibold text-brand">{addMsg}</p>}

              <button
                disabled={savingStudent}
                className="w-full rounded-md bg-ink px-5 py-3 font-bold text-white hover:bg-ink/90 disabled:opacity-50"
              >
                {savingStudent ? 'Saving student…' : 'Save student'}
              </button>
            </form>
          </section>
        </div>

        {/* Right Column: Events Summary & All Students */}
        <div className="space-y-8 lg:col-span-3">
          {/* Section 1: Today's Events & Summary */}
          <section>
            <div className="flex items-baseline justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-ink">Today&apos;s events</h2>
                <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-extrabold text-ink">
                  {todaysEvents.length}
                </span>
              </div>
            </div>

            {/* Quick Summary Card if events exist today */}
            {todaysEvents.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-line bg-white p-3.5 shadow-sm">
                  <p className="text-xs font-bold text-ink/60">Sessions Today</p>
                  <p className="mt-1 text-2xl font-extrabold text-ink">{todaysEvents.length}</p>
                </div>
                <div className="rounded-lg border border-line bg-white p-3.5 shadow-sm">
                  <p className="text-xs font-bold text-ink/60">Total Checked In</p>
                  <p className="mt-1 text-2xl font-extrabold text-brand">{totalPresentToday}</p>
                </div>
                <div className="col-span-2 sm:col-span-1 rounded-lg border border-line bg-white p-3.5 shadow-sm">
                  <p className="text-xs font-bold text-ink/60">Attendance Room</p>
                  <p className="mt-1 text-sm font-bold text-ink truncate">
                    {openRoomToday ? (
                      <span className="inline-flex items-center gap-1.5 text-ok font-extrabold">
                        <span className="h-2 w-2 rounded-full bg-ok animate-pulse" />
                        Room open
                      </span>
                    ) : (
                      <span className="text-ink/60">All rooms closed</span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {todaysEvents.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-line bg-white p-6 text-sm text-ink/60">
                <p className="font-semibold text-ink">No events scheduled for today.</p>
                <p className="mt-1 text-xs text-ink/60">
                  Tap &quot;Create event&quot; to schedule a class session and open its attendance room.
                </p>
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-white shadow-sm">
                {todaysEvents.map((evt) => {
                  const presentCount = evt.attendance?.length || 0

                  return (
                    <li
                      key={evt.id}
                      onClick={() => onSelectEvent(evt)}
                      className="flex cursor-pointer items-center justify-between gap-3 p-4 transition-colors hover:bg-mist/60 sm:px-6 sm:py-5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <p className="truncate font-extrabold text-ink text-base sm:text-lg">
                            {evt.title}
                          </p>
                          {evt.status === 'open' && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/15 px-2.5 py-0.5 text-xs font-extrabold text-ok">
                              <span className="h-2 w-2 rounded-full bg-ok animate-pulse" />
                              Room open
                            </span>
                          )}
                          {evt.status === 'scheduled' && (
                            <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-bold text-ink/60">
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
                          <span className="font-bold text-brand">{presentCount}</span> student
                          {presentCount === 1 ? '' : 's'} present
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-ink/70">
                        <span>Open event</span>
                        <ChevronRightIcon className="h-4 w-4 text-ink/40" />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* Section 2: Past Events */}
          <section>
            <div className="flex items-baseline justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-ink">Past events</h2>
                <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-extrabold text-ink">
                  {pastEvents.length}
                </span>
              </div>
            </div>

            {pastEvents.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-line bg-white p-6 text-sm text-ink/60">
                No past events recorded yet.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-white shadow-sm">
                {pastEvents.slice(0, 8).map((evt) => {
                  const presentCount = evt.attendance?.length || 0

                  return (
                    <li
                      key={evt.id}
                      onClick={() => onSelectEvent(evt)}
                      className="flex cursor-pointer items-center justify-between gap-3 p-4 transition-colors hover:bg-mist/60 sm:px-6"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-bold text-ink">{evt.title}</p>
                          <span className="rounded bg-mist px-2 py-0.5 text-xs font-semibold text-ink/60">
                            {formatEventDisplayDate(evt.event_date)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-ink/60">
                          <span className="font-bold text-ink">{presentCount}</span> present ·{' '}
                          <span className="capitalize">{evt.status}</span>
                        </p>
                      </div>
                      <ChevronRightIcon className="h-4 w-4 shrink-0 text-ink/40" />
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* Section 3: All Students List */}
          <section>
            <div className="flex items-baseline justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-ink">All students</h2>
                <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-extrabold text-ink">
                  {students.length}
                </span>
              </div>
            </div>

            <div className="relative mt-3">
              <SearchIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-ink/40" />
              <input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by name or matric number…"
                className="w-full rounded-md border border-line bg-white py-2.5 pl-10 pr-4 text-sm focus:border-brand"
              />
            </div>

            {students.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-line bg-white p-6 text-sm text-ink/60">
                No students added yet. Use the form on the left to add your first student.
              </p>
            ) : filteredStudents.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-line bg-white p-6 text-sm text-ink/60">
                No students found matching &quot;{studentSearch}&quot;.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-white shadow-sm">
                {filteredStudents.map((s) => (
                  <li
                    key={s.id}
                    onClick={() => onSelectStudent?.(s)}
                    className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-mist/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink">{s.full_name}</p>
                      <p className="truncate text-xs text-ink/60">
                        {s.matric_no ? (
                          <span className="font-medium text-ink/80">{s.matric_no}</span>
                        ) : (
                          <span className="italic text-ink/40">No matric number yet</span>
                        )}
                        {s.detail && ` · ${s.detail}`}
                      </p>
                    </div>
                    <ChevronRightIcon className="h-4 w-4 shrink-0 text-ink/40" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>

      {/* Create Event Modal */}
      {showCreateEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
          <form
            onSubmit={handleCreateEvent}
            className="w-full max-w-sm rounded-xl border border-line bg-white p-6 shadow-xl"
          >
            <div className="flex items-center gap-2 text-brand">
              <CalendarIcon className="h-5 w-5" />
              <h3 className="text-xl font-extrabold text-ink">Create event</h3>
            </div>
            <p className="mt-1 text-sm text-ink/60">
              Schedule a class session to open an attendance room.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-ink" htmlFor="new-event-title">
                  Event title
                </label>
                <input
                  id="new-event-title"
                  required
                  autoFocus
                  placeholder="e.g. Sunday class"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="mt-1 w-full rounded-md border border-line px-3.5 py-2.5 text-sm focus:border-brand"
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
                  className="mt-1 w-full rounded-md border border-line px-3.5 py-2.5 text-sm focus:border-brand"
                />
              </div>
            </div>

            {eventError && (
              <p className="mt-3 text-xs font-bold text-red-700">{eventError}</p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                disabled={creatingEvent}
                className="flex-1 rounded-md bg-brand py-3 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                {creatingEvent ? 'Creating…' : 'Create event'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateEvent(false)
                  setEventError('')
                }}
                className="flex-1 rounded-md border border-line bg-mist py-3 text-sm font-bold text-ink hover:bg-white"
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
