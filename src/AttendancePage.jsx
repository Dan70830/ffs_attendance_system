import { useEffect, useState } from 'react'
import { supabase, today } from './supabase'
import {
  ArrowLeftIcon,
  PlusIcon,
  SearchIcon,
  CalendarIcon,
  DoorOpenIcon,
  ClockIcon,
  ChevronRightIcon,
  XIcon,
  BookOpenIcon,
  TrashIcon,
} from './Icons'

function formatLagosDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(`${dateStr}T12:00:00`)
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  })
}

export default function AttendancePage({
  profile,
  onBack,
  onSelectEvent,
  onOpenKiosk,
}) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'today' | 'upcoming' | 'completed'

  // Create session modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [sessionTitle, setSessionTitle] = useState('')
  const [sessionDate, setSessionDate] = useState(today())
  const [savingSession, setSavingSession] = useState(false)
  const [modalError, setModalError] = useState('')

  // Delete session states
  const [deletingId, setDeletingId] = useState(null)
  const [showClearAllModal, setShowClearAllModal] = useState(false)
  const [clearingAll, setClearingAll] = useState(false)
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState(null)

  const isPrincipal = profile?.role === 'principal'
  const todayStr = today()

  async function handleDeleteEvent(evt) {
    if (!evt) return
    setDeletingId(evt.id)
    try {
      const { error } = await supabase.from('events').delete().eq('id', evt.id)
      if (error) {
        alert('Could not delete session: ' + error.message)
      } else {
        setEvents((prev) => prev.filter((e) => e.id !== evt.id))
        setDeleteConfirmEvent(null)
      }
    } catch (err) {
      alert('Error deleting session: ' + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleClearAllSessions() {
    setClearingAll(true)
    try {
      // Delete all events (cascades to attendance)
      const { error } = await supabase
        .from('events')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (error) {
        alert('Could not clear sessions: ' + error.message)
      } else {
        setEvents([])
        setShowClearAllModal(false)
      }
    } catch (err) {
      alert('Error clearing sessions: ' + err.message)
    } finally {
      setClearingAll(false)
    }
  }

  async function loadEvents() {
    setLoading(true)
    const { data, error } = await supabase
      .from('events')
      .select('id, title, event_date, status, created_by, opened_at, closed_at, created_at, attendance(id, created_at, student_id)')
      .order('event_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (!error && data) {
      setEvents(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    let mounted = true

    async function fetchSessions() {
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select('id, title, event_date, status, created_by, opened_at, closed_at, created_at, attendance(id, created_at, student_id)')
        .order('event_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (!mounted) return
      if (!error && data) {
        setEvents(data)
      }
      setLoading(false)
    }

    fetchSessions()

    return () => {
      mounted = false
    }
  }, [])

  async function handleCreateSession(e) {
    e.preventDefault()
    setModalError('')

    const cleanTitle = sessionTitle.trim()
    if (!cleanTitle) {
      setModalError('Session title is required.')
      return
    }

    setSavingSession(true)
    const { data, error } = await supabase
      .from('events')
      .insert({
        title: cleanTitle,
        event_date: sessionDate,
        status: 'scheduled',
        created_by: profile.id,
      })
      .select('id, title, event_date, status')
      .single()

    setSavingSession(false)

    if (error) {
      setModalError(error.message || 'Could not create session. Please try again.')
    } else {
      setShowCreateModal(false)
      setSessionTitle('')
      setSessionDate(today())
      await loadEvents()
      if (data && onSelectEvent) {
        onSelectEvent(data)
      }
    }
  }

  // Active / Live room
  const liveSession = events.find((e) => e.status === 'open')

  // Categories
  const todaysSessions = events.filter((e) => e.event_date === todayStr)
  const upcomingSessions = events.filter((e) => e.event_date > todayStr && e.status === 'scheduled')
  const completedSessions = events.filter((e) => e.status === 'closed' || e.event_date < todayStr)

  // Filtered list
  const filteredEvents = events.filter((e) => {
    if (activeFilter === 'today') {
      if (e.event_date !== todayStr) return false
    } else if (activeFilter === 'upcoming') {
      if (!(e.event_date > todayStr && e.status === 'scheduled')) return false
    } else if (activeFilter === 'completed') {
      if (!(e.status === 'closed' || e.event_date < todayStr)) return false
    }

    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const titleMatch = e.title?.toLowerCase().includes(q)
    const dateMatch = e.event_date?.includes(q)
    return titleMatch || dateMatch
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-2xs hover:bg-mist transition-colors cursor-pointer active:scale-95"
        >
          <ArrowLeftIcon className="h-4 w-4 text-ink/60" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          {isPrincipal && events.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearAllModal(true)}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100 transition-all cursor-pointer active:scale-95"
            >
              <TrashIcon className="h-4 w-4 text-rose-600" />
              <span>Clear all test sessions</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setModalError('')
              setSessionTitle('')
              setSessionDate(today())
              setShowCreateModal(true)
            }}
            className="inline-flex min-h-[38px] items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-2xs hover:bg-brand-dark transition-all cursor-pointer active:scale-95"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Schedule session</span>
          </button>
        </div>
      </div>

      {/* Page Title & Operational Purpose */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-ink sm:text-3xl">
            Attendance Operations
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink/65">
            Operational workspace: schedule sessions, open attendance rooms, launch kiosk check-in, and manage attendee logs.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-bold text-brand">
            <span className="h-2 w-2 rounded-full bg-brand" />
            {isPrincipal ? 'Principal Access' : 'Teacher Access'}
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* LIVE ROOM SPOTLIGHT (Prominent banner if room is open)       */}
      {/* ============================================================ */}
      {liveSession && (
        <section className="relative overflow-hidden rounded-2xl border-2 border-emerald-500 bg-gradient-to-r from-emerald-50 via-[#f0fdf4] to-emerald-100/60 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600" />
                </span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                  Live Attendance Room Open Now
                </span>
              </div>
              <h2 className="text-xl font-black text-ink sm:text-2xl">
                {liveSession.title}
              </h2>
              <p className="text-xs font-semibold text-emerald-800">
                {formatLagosDate(liveSession.event_date)} ·{' '}
                <strong className="font-extrabold">{liveSession.attendance?.length || 0}</strong> student(s) marked present
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => onOpenKiosk?.(liveSession)}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-2xs hover:bg-emerald-800 transition-all cursor-pointer active:scale-95"
              >
                <DoorOpenIcon className="h-4 w-4" />
                <span>Launch Kiosk Mode</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectEvent?.(liveSession)}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-xs sm:text-sm font-bold text-emerald-900 shadow-2xs hover:bg-emerald-50 transition-all cursor-pointer active:scale-95"
              >
                <span>Manage Room</span>
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* SESSION MANAGEMENT SECTION                                   */}
      {/* ============================================================ */}
      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-2xs space-y-5">
        {/* Filters and Search Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Segmented Filter Pills */}
          <div className="flex overflow-x-auto rounded-xl border border-line bg-mist/50 p-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-ink/65 hover:text-ink'
              }`}
            >
              All ({events.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('today')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeFilter === 'today'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-ink/65 hover:text-ink'
              }`}
            >
              Today ({todaysSessions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('upcoming')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeFilter === 'upcoming'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-ink/65 hover:text-ink'
              }`}
            >
              Upcoming ({upcomingSessions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('completed')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeFilter === 'completed'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-ink/65 hover:text-ink'
              }`}
            >
              Completed ({completedSessions.length})
            </button>
          </div>

          {/* Search box */}
          <div className="relative min-w-[220px] sm:w-64">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sessions…"
              className="w-full rounded-xl border border-line bg-white py-1.5 pl-9 pr-3 text-xs font-semibold text-ink placeholder:text-ink/40 focus:border-brand shadow-2xs"
            />
          </div>
        </div>

        {/* Sessions List */}
        {loading ? (
          <div className="py-16 text-center text-xs font-semibold text-ink/60">
            Loading attendance sessions…
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-mist/30 p-10 text-center space-y-2">
            <CalendarIcon className="mx-auto h-8 w-8 text-ink/30" />
            <p className="text-sm font-bold text-ink">No attendance sessions found</p>
            <p className="text-xs text-ink/60">
              {searchQuery
                ? `No sessions matching "${searchQuery}".`
                : 'No sessions recorded under this filter.'}
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-bold text-white hover:bg-brand-dark cursor-pointer"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Schedule a session</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-line/70 rounded-xl border border-line overflow-hidden bg-white">
            {filteredEvents.map((evt) => {
              const count = evt.attendance?.length || 0
              const isLive = evt.status === 'open'
              const isClosed = evt.status === 'closed'
              const isScheduled = evt.status === 'scheduled'

              return (
                <div
                  key={evt.id}
                  onClick={() => onSelectEvent?.(evt)}
                  className="group flex cursor-pointer flex-col gap-3 p-4 transition-colors hover:bg-mist/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        isLive
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : isClosed
                          ? 'bg-mist text-ink/60'
                          : 'bg-brand/10 text-brand'
                      }`}
                    >
                      {isLive ? (
                        <DoorOpenIcon className="h-5 w-5" />
                      ) : isClosed ? (
                        <BookOpenIcon className="h-5 w-5" />
                      ) : (
                        <CalendarIcon className="h-5 w-5" />
                      )}
                    </span>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-extrabold text-ink text-sm sm:text-base group-hover:text-brand truncate">
                          {evt.title}
                        </p>
                        {isLive && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Room Open
                          </span>
                        )}
                        {isScheduled && (
                          <span className="rounded-full bg-mist border border-line px-2 py-0.5 text-[10px] font-bold text-ink/70">
                            Scheduled
                          </span>
                        )}
                        {isClosed && (
                          <span className="rounded-full bg-mist border border-line px-2 py-0.5 text-[10px] font-bold text-ink/50">
                            Completed
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink/60">
                        <span className="font-semibold text-ink/75">
                          {formatLagosDate(evt.event_date)}
                        </span>
                        <span>·</span>
                        <span className={count > 0 ? 'font-bold text-brand' : 'italic text-ink/40'}>
                          {count} marked present
                        </span>
                        {evt.opened_at && (
                          <>
                            <span>·</span>
                            <span className="text-[11px] text-ink/50 inline-flex items-center gap-1">
                              <ClockIcon className="h-3 w-3" />
                              {new Date(evt.opened_at).toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                                timeZone: 'Africa/Lagos',
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 shrink-0">
                    {isScheduled && (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink group-hover:border-brand/40 group-hover:text-brand">
                        <span>Open session</span>
                        <ChevronRightIcon className="h-3.5 w-3.5" />
                      </span>
                    )}
                    {isLive && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs">
                        <DoorOpenIcon className="h-3.5 w-3.5" />
                        <span>Manage / Kiosk</span>
                      </span>
                    )}
                    {isClosed && (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink/70 group-hover:text-brand">
                        <span>View record</span>
                        <ChevronRightIcon className="h-3.5 w-3.5" />
                      </span>
                    )}

                    {/* Delete session button for Principal */}
                    {isPrincipal && (
                      <button
                        type="button"
                        title="Delete session"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirmEvent(evt)
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-ink/40 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* MODAL: SCHEDULE NEW SESSION                                  */}
      {/* ============================================================ */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-xs"
          onClick={() => setShowCreateModal(false)}
        >
          <form
            onSubmit={handleCreateSession}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-brand">
                <CalendarIcon className="h-5 w-5" />
                <h3 className="text-lg font-black text-ink">Schedule Attendance Session</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-ink/40 hover:bg-mist hover:text-ink cursor-pointer"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
                {modalError}
              </div>
            )}

            <div>
              <label htmlFor="session-title" className="block text-xs font-bold text-ink/75">
                Session Title *
              </label>
              <input
                id="session-title"
                type="text"
                required
                autoFocus
                placeholder="e.g. Sunday Class, Bible Study, Class 1 Attendance"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-ink placeholder:text-ink/40 focus:border-brand shadow-2xs"
              />
              <p className="mt-1 text-[11px] text-ink/50">
                Enter the name of the service, event, or class session.
              </p>
            </div>

            <div>
              <label htmlFor="session-date" className="block text-xs font-bold text-ink/75">
                Session Date (Lagos Time) *
              </label>
              <input
                id="session-date"
                type="date"
                required
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-ink focus:border-brand shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={savingSession}
                className="flex-1 min-h-[42px] rounded-xl bg-brand py-2 text-xs sm:text-sm font-bold text-white shadow-2xs hover:bg-brand-dark transition-all disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {savingSession ? 'Scheduling…' : 'Schedule Session'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="min-h-[42px] rounded-xl border border-line bg-white px-4 py-2 text-xs sm:text-sm font-bold text-ink/70 hover:bg-mist transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: DELETE SINGLE SESSION CONFIRMATION */}
      {deleteConfirmEvent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-xs"
          onClick={() => setDeleteConfirmEvent(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <TrashIcon className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-lg font-black text-ink">Delete Attendance Session</h3>
              <p className="mt-1.5 text-xs text-ink/65 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-ink">"{deleteConfirmEvent.title}"</span> ({formatLagosDate(deleteConfirmEvent.event_date)})?
                All attendance check-in records for this session will be permanently deleted.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setDeleteConfirmEvent(null)}
                className="rounded-xl border border-line px-4 py-2 text-xs font-bold text-ink/70 hover:bg-mist cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingId === deleteConfirmEvent.id}
                onClick={() => handleDeleteEvent(deleteConfirmEvent)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {deletingId === deleteConfirmEvent.id ? 'Deleting…' : 'Delete session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CLEAR ALL TEST SESSIONS CONFIRMATION */}
      {showClearAllModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-xs"
          onClick={() => setShowClearAllModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <TrashIcon className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-lg font-black text-ink">Clear All Testing Classes</h3>
              <p className="mt-1.5 text-xs text-ink/65 leading-relaxed">
                This will delete <span className="font-bold text-rose-600">all {events.length} testing sessions</span> and their check-in records so real users can start fresh tomorrow.
              </p>
              <p className="mt-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-lg p-2.5 border border-emerald-200">
                ✓ All registered students, student groups, and teachers will be safely preserved.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-line">
              <button
                type="button"
                disabled={clearingAll}
                onClick={() => setShowClearAllModal(false)}
                className="rounded-xl border border-line px-4 py-2 text-xs font-bold text-ink/70 hover:bg-mist cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={clearingAll}
                onClick={handleClearAllSessions}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {clearingAll ? 'Clearing all…' : 'Yes, delete all test classes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
