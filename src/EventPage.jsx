import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { ArrowLeftIcon, DoorOpenIcon, UndoIcon, ArrowRightIcon, TrashIcon } from './Icons'
import GroupBadge from './GroupBadge'

function formatEventDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(`${dateStr}T12:00:00`)
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  })
}

function formatCheckInTime(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Africa/Lagos',
  })
}

export default function EventPage({ eventId, onBack, onOpenKiosk, profile }) {
  const [event, setEvent] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionBusy, setActionBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [infoMsg, setInfoMsg] = useState('')

  async function handleDeleteEvent() {
    if (
      !window.confirm(
        `Are you sure you want to delete "${event.title}" and its attendance check-in records? This action cannot be undone.`
      )
    ) {
      return
    }
    setActionBusy(true)
    const { error } = await supabase.from('events').delete().eq('id', eventId)
    if (error) {
      setErrorMsg('Could not delete session: ' + error.message)
      setActionBusy(false)
    } else {
      onBack()
    }
  }

  async function loadEventData() {
    // Load event
    const { data: eData, error: eErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle()

    if (!eErr && eData) {
      setEvent(eData)
    }

    // Load students present at this event with historical group tracking
    const { data: aData } = await supabase
      .from('attendance')
      .select(
        'id, created_at, group_id, student_groups(id, name, color), students(id, full_name, matric_no, detail, student_groups(id, name, color))'
      )
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    setAttendance(aData || [])
    setLoading(false)
  }

  useEffect(() => {
    let mounted = true

    async function init() {
      setLoading(true)
      const { data: eData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle()

      if (!mounted) return
      if (eData) setEvent(eData)

      const { data: aData } = await supabase
        .from('attendance')
        .select(
          'id, created_at, group_id, student_groups(id, name, color), students(id, full_name, matric_no, detail, student_groups(id, name, color))'
        )
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })

      if (!mounted) return
      setAttendance(aData || [])
      setLoading(false)
    }

    if (eventId) {
      init()
    }

    return () => {
      mounted = false
    }
  }, [eventId])

  function showInfo(msg) {
    setInfoMsg(msg)
    setTimeout(() => setInfoMsg(''), 4000)
  }

  function showError(msg) {
    setErrorMsg(msg)
    setTimeout(() => setErrorMsg(''), 5000)
  }

  async function handleOpenRoom() {
    setErrorMsg('')
    setActionBusy(true)

    // Check if another room is already open
    const { data: openEvents } = await supabase
      .from('events')
      .select('id, title')
      .eq('status', 'open')
      .neq('id', eventId)

    if (openEvents && openEvents.length > 0) {
      setErrorMsg(`Another attendance room ("${openEvents[0].title}") is already open. Close it first before opening this room.`)
      setActionBusy(false)
      return
    }

    const { error } = await supabase
      .from('events')
      .update({
        status: 'open',
        opened_at: new Date().toISOString(),
      })
      .eq('id', eventId)

    setActionBusy(false)

    if (error) {
      if (error.code === '23505' || error.message?.toLowerCase().includes('open')) {
        showError('Another attendance room is already open. Close it first.')
      } else {
        showError('Could not open the attendance room. Please try again.')
      }
    } else {
      showInfo('Attendance room is now open.')
      loadEventData()
    }
  }

  async function handleCloseRoom() {
    setErrorMsg('')
    setActionBusy(true)

    const { error } = await supabase
      .from('events')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
      })
      .eq('id', eventId)

    setActionBusy(false)

    if (error) {
      showError('Could not close the attendance room. Please try again.')
    } else {
      showInfo('Attendance room has been closed.')
      loadEventData()
    }
  }

  async function handleUndo(recordId) {
    const { error } = await supabase.from('attendance').delete().eq('id', recordId)
    if (!error) {
      loadEventData()
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-2xs hover:bg-mist transition-colors cursor-pointer active:scale-95"
        >
          <ArrowLeftIcon className="h-4 w-4 text-ink/60" />
          <span>Back to Dashboard</span>
        </button>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="py-12 text-center text-sm font-semibold text-ink/60">
            Loading event details…
          </div>
        ) : !event ? (
          <div className="rounded-xl border border-line bg-white p-8 text-center">
            <h2 className="text-xl font-extrabold text-ink">Event not found</h2>
            <p className="mt-2 text-sm text-ink/70">
              The requested event could not be found.
            </p>
            <button
              onClick={onBack}
              className="mt-6 min-h-[38px] rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-dark cursor-pointer"
            >
              Return to home
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Event Header Information */}
            <div className="rounded-xl border border-line bg-white p-5 shadow-2xs sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl font-black text-ink sm:text-3xl">{event.title}</h1>
                    {event.status === 'open' && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/15 px-3 py-1 text-xs font-bold text-ok">
                        <span className="h-2 w-2 rounded-full bg-ok animate-pulse" />
                        Room open
                      </span>
                    )}
                    {event.status === 'scheduled' && (
                      <span className="rounded-full bg-mist px-3 py-1 text-xs font-bold text-ink/70">
                        Scheduled
                      </span>
                    )}
                    {event.status === 'closed' && (
                      <span className="rounded-full bg-mist px-3 py-1 text-xs font-bold text-ink/50">
                        Room closed
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-ink/65 sm:text-sm">
                    {formatEventDate(event.event_date)}
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm font-bold text-red-700">
                  {errorMsg}
                </div>
              )}
              {infoMsg && (
                <div className="mt-4 rounded-xl border border-line bg-mist/60 p-4 text-xs sm:text-sm font-bold text-brand">
                  {infoMsg}
                </div>
              )}

              {/* Status Action Buttons */}
              <div className="mt-6 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center">
                {event.status === 'open' ? (
                  <>
                    <button
                      onClick={() => onOpenKiosk(event)}
                      className="flex min-h-[48px] flex-1 items-center justify-center gap-2.5 rounded-lg bg-brand px-6 py-3.5 text-center text-sm font-extrabold text-white shadow-2xs transition-all hover:bg-brand-dark active:scale-[0.98] sm:text-base cursor-pointer"
                    >
                      <DoorOpenIcon className="h-5 w-5" /> Open check-in screen
                      <ArrowRightIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleCloseRoom}
                      disabled={actionBusy}
                      className="min-h-[48px] rounded-lg border border-line bg-white px-5 py-3.5 text-sm font-bold text-ink transition-colors hover:bg-mist active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                    >
                      {actionBusy ? 'Closing…' : 'Close room'}
                    </button>

                    {profile?.role === 'principal' && (
                      <button
                        type="button"
                        onClick={handleDeleteEvent}
                        disabled={actionBusy}
                        className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50 cursor-pointer transition-colors"
                      >
                        <TrashIcon className="h-4 w-4 text-rose-600" />
                        <span>Delete session</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleOpenRoom}
                      disabled={actionBusy}
                      className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-6 py-3.5 text-sm sm:text-base font-bold text-white shadow-2xs transition-all hover:bg-brand-dark active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                    >
                      <DoorOpenIcon className="h-5 w-5" />
                      {actionBusy
                        ? 'Opening…'
                        : event.status === 'closed'
                        ? 'Reopen attendance room'
                        : 'Open attendance room'}
                    </button>

                    {profile?.role === 'principal' && (
                      <button
                        type="button"
                        onClick={handleDeleteEvent}
                        disabled={actionBusy}
                        className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50 cursor-pointer transition-colors"
                      >
                        <TrashIcon className="h-4 w-4 text-rose-600" />
                        <span>Delete session</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Students Present Section */}
            <section className="rounded-xl border border-line bg-white p-5 shadow-2xs sm:p-6">
              <div className="flex items-baseline justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-ink">Students present</h2>
                  <p className="mt-0.5 text-xs text-ink/60">
                    Checked in through the kiosk for this event.
                  </p>
                </div>
                <span className="text-2xl font-extrabold text-brand">
                  {attendance.length}
                </span>
              </div>

              {attendance.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-line bg-mist/50 p-6 text-sm text-ink/60">
                  {event.status === 'open'
                    ? 'Nobody has checked in yet. Open the check-in screen and hand the device to students.'
                    : 'Nobody checked in for this event.'}
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-line border-t border-line">
                  {attendance.map((record) => {
                    const st = record.students
                    const checkInTime = formatCheckInTime(record.created_at)

                    return (
                      <li
                        key={record.id}
                        className="flex items-center justify-between gap-3 py-3.5"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-ink">{st?.full_name}</p>
                            <GroupBadge group={record.student_groups || st?.student_groups} size="xs" />
                          </div>
                          <p className="text-xs text-ink/60">
                            {st?.matric_no ? (
                              <span className="font-medium text-ink/80">{st.matric_no}</span>
                            ) : (
                              <span className="italic text-ink/40">No matric number</span>
                            )}
                            {st?.detail && ` · ${st.detail}`}
                            {checkInTime && ` · Checked in at ${checkInTime}`}
                          </p>
                        </div>
                        <button
                          onClick={() => handleUndo(record.id)}
                          className="flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-red hover:bg-red/10 transition-colors cursor-pointer"
                        >
                          <UndoIcon className="h-3.5 w-3.5" /> Undo
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

