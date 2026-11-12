import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import {
  Brand,
  CheckCircleIcon,
  CheckIcon,
  DoorOpenIcon,
  EyeIcon,
  EyeOffIcon,
  SearchIcon,
  SignOutIcon,
} from './Icons'

function formatKioskDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(`${dateStr}T12:00:00`)
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Africa/Lagos',
  })
}

function getFirstName(fullName) {
  if (!fullName) return 'Student'
  const trimmed = fullName.trim()
  const parts = trimmed.split(/\s+/)
  return parts[0] || 'Student'
}

export default function Kiosk({ event, profile, email, onExit }) {
  const [currentEvent, setCurrentEvent] = useState(event)
  const [students, setStudents] = useState([])
  const [q, setQ] = useState('')
  const [confirmStudent, setConfirmStudent] = useState(null)
  const [notice, setNotice] = useState(null)
  const [exiting, setExiting] = useState(false)
  const [pw, setPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [marking, setMarking] = useState(false)

  const isRoomOpen = currentEvent?.status === 'open'
  const dateLabel = formatKioskDate(currentEvent?.event_date)

  // Load active students
  useEffect(() => {
    supabase
      .from('students')
      .select('id, full_name, detail, matric_no')
      .eq('active', true)
      .order('full_name')
      .then(({ data }) => setStudents(data || []))
  }, [])

  // Keep event status up-to-date in case teacher closes the room
  useEffect(() => {
    let mounted = true
    async function checkStatus() {
      if (!event?.id) return
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('id', event.id)
        .maybeSingle()
      if (mounted && data) {
        setCurrentEvent(data)
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 8000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [event?.id])

  // Automatically reset the full-screen notice after 2.5 seconds
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => {
      setNotice(null)
    }, 2500)
    return () => clearTimeout(timer)
  }, [notice])

  // Search filter: triggers when >= 2 characters typed
  const term = q.trim().toLowerCase()
  const matches =
    term.length < 2
      ? []
      : students
          .filter((s) => {
            const n = s.full_name?.toLowerCase() || ''
            const m = s.matric_no?.toLowerCase() || ''
            return (
              n.startsWith(term) ||
              n.split(/\s+/).some((w) => w.startsWith(term)) ||
              m.startsWith(term) ||
              m.includes(term)
            )
          })
          .slice(0, 12)

  async function mark(s) {
    if (marking || !s) return
    setMarking(true)

    // Re-verify room is open before inserting
    const { data: latestEvent } = await supabase
      .from('events')
      .select('status')
      .eq('id', currentEvent.id)
      .maybeSingle()

    if (latestEvent && latestEvent.status !== 'open') {
      setCurrentEvent(latestEvent)
      setConfirmStudent(null)
      setMarking(false)
      setNotice({
        type: 'err',
        text: 'This attendance room is closed.',
      })
      return
    }

    const { error } = await supabase.from('attendance').insert({
      event_id: currentEvent.id,
      student_id: s.id,
      marked_by: profile.id,
      attendance_date: currentEvent.event_date,
    })

    const first = getFirstName(s?.full_name)
    const fullName = s?.full_name || 'Student'

    setConfirmStudent(null)
    setQ('')
    setMarking(false)

    if (!error) {
      setNotice({
        type: 'ok',
        text: `Thank you, ${first}. You are marked present.`,
      })
    } else if (
      error.code === '23505' ||
      error.message?.toLowerCase().includes('already marked') ||
      error.message?.toLowerCase().includes('duplicate')
    ) {
      setNotice({
        type: 'dup',
        text: `${fullName}, you have already marked attendance for this event.`,
      })
    } else if (error.message?.toLowerCase().includes('open')) {
      setNotice({
        type: 'err',
        text: 'This attendance room is closed.',
      })
    } else {
      setNotice({
        type: 'err',
        text: 'Something went wrong. Please tell your teacher.',
      })
    }
  }

  async function tryExit(e) {
    e.preventDefault()
    if (pwBusy) return
    setPwBusy(true)
    setPwError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    setPwBusy(false)

    if (error) {
      setPwError('Wrong password.')
    } else {
      onExit()
    }
  }

  // If room is closed, show closed notice with teacher exit
  if (!isRoomOpen) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-mist p-6 text-center">
        <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mist text-ink/60">
            <DoorOpenIcon className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold text-ink sm:text-3xl">
            This attendance room is closed.
          </h1>
          <p className="mt-2 text-sm text-ink/70">
            Attendance can only be marked while the room is open.
          </p>
          <button
            type="button"
            onClick={() => setExiting(true)}
            className="mt-6 w-full rounded-xl bg-brand py-3.5 text-base font-bold text-white shadow-sm hover:bg-brand-dark"
          >
            Teacher exit
          </button>
        </div>

        {exiting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-xs">
            <form onSubmit={tryExit} className="w-full max-w-sm rounded-2xl bg-white p-6 text-left shadow-2xl">
              <h2 className="text-xl font-extrabold text-ink">Teacher password</h2>
              <p className="mt-1 text-sm text-ink/60">Enter your password to leave the check-in screen.</p>
              <input
                autoFocus
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Password"
                className="mt-4 w-full rounded-xl border border-line px-4 py-3 text-base focus:border-brand focus:outline-hidden"
              />
              {pwError && <p className="mt-2 text-sm font-semibold text-red-700">{pwError}</p>}
              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  disabled={pwBusy}
                  className="flex-1 rounded-xl bg-brand py-3 text-base font-bold text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  {pwBusy ? 'Checking…' : 'Exit'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExiting(false)
                    setPw('')
                    setPwError('')
                  }}
                  className="flex-1 rounded-xl border border-line bg-mist py-3 text-base font-bold text-ink hover:bg-line/40"
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

  // Full screen notices (green on success for 2.5s, yellow on duplicate, red on error)
  if (notice) {
    const isOk = notice.type === 'ok'
    const isDup = notice.type === 'dup'
    const bgColor = isOk
      ? 'bg-ok text-white'
      : isDup
      ? 'bg-sun text-ink'
      : 'bg-red-700 text-white'

    return (
      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200 ${bgColor}`}
      >
        <div className="flex max-w-xl flex-col items-center gap-6">
          {isOk && (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20 sm:h-32 sm:w-32">
              <CheckIcon className="h-16 w-16 text-white sm:h-20 sm:w-20" />
            </div>
          )}
          {isDup && (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-ink/10 sm:h-32 sm:w-32">
              <CheckCircleIcon className="h-16 w-16 text-ink sm:h-20 sm:w-20" />
            </div>
          )}
          <h1 className="text-2xl font-black leading-tight sm:text-4xl md:text-5xl">
            {notice.text}
          </h1>
          {isOk && (
            <p className="text-sm font-semibold text-white/80 sm:text-base">
              Attendance recorded successfully.
            </p>
          )}
          {isDup && (
            <p className="text-sm font-bold text-ink/70 sm:text-base">
              You don&apos;t need to check in again.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-mist/30">
      {/* Kiosk Minimal Header - no menus, no event lists */}
      <header className="border-b border-line bg-white shadow-2xs">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5 sm:px-8">
          <Brand />
          <span className="rounded-full bg-mist px-3 py-1 text-xs font-bold text-ink/70 sm:text-sm">
            {currentEvent.title} · {dateLabel}
          </span>
        </div>
      </header>

      {/* Main Kiosk Area */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-8 sm:py-14">
        <div className="text-center sm:text-left">
          <h1 className="text-3xl font-black tracking-tight text-ink sm:text-5xl">
            Find your name
          </h1>
          <p className="mt-2 text-base text-ink/65 sm:text-xl">
            Type the first two letters of your name or your matric number.
          </p>
        </div>

        {/* Big Search Input */}
        <div className="relative mt-6 sm:mt-8">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 sm:pl-5">
            <SearchIcon className="h-6 w-6 text-ink/40" />
          </div>
          <input
            autoFocus
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Start typing your name or matric number…"
            className="w-full rounded-2xl border-2 border-line bg-white py-4 pl-12 pr-12 text-lg font-medium text-ink shadow-xs transition-colors placeholder:text-ink/35 focus:border-brand focus:outline-hidden sm:py-5 sm:pl-14 sm:pr-14 sm:text-2xl"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-ink/40 hover:text-ink sm:pr-5"
              aria-label="Clear search"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mist text-sm font-bold">
                ✕
              </span>
            </button>
          )}
        </div>

        {/* Matching Student Results */}
        {term.length >= 2 && matches.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <p className="text-xs font-extrabold uppercase tracking-wider text-ink/50 sm:text-sm">
              Tap your name to check in
            </p>
            <ul className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {matches.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setConfirmStudent(s)}
                    disabled={marking}
                    className="group flex min-h-[72px] w-full flex-col justify-center rounded-2xl border-2 border-line bg-white p-4 text-left shadow-2xs transition-all hover:border-brand hover:shadow-md focus:border-brand focus:outline-hidden active:scale-[0.99] sm:p-5"
                  >
                    <span className="text-lg font-extrabold text-ink group-hover:text-brand sm:text-xl">
                      {s.full_name}
                    </span>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium sm:text-sm">
                      {s.matric_no ? (
                        <span className="font-semibold text-brand">
                          Matric: {s.matric_no}
                        </span>
                      ) : (
                        <span className="italic text-ink/40">No matric number yet</span>
                      )}
                      {s.matric_no && s.detail && (
                        <span className="text-ink/30">·</span>
                      )}
                      {s.detail && (
                        <span className="text-ink/70">{s.detail}</span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Empty state when query is >= 2 letters but no matches */}
        {term.length >= 2 && matches.length === 0 && (
          <div className="mt-8 rounded-2xl border border-line bg-white p-6 text-center shadow-2xs sm:p-8">
            <p className="text-base font-bold text-ink sm:text-lg">
              No student found matching &ldquo;{q}&rdquo;
            </p>
            <p className="mt-1 text-sm text-ink/60">
              Please check the spelling or ask your teacher to add you.
            </p>
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {confirmStudent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-xs"
          onClick={() => !marking && setConfirmStudent(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
                <CheckCircleIcon className="h-8 w-8" />
              </span>
              <h2 className="mt-4 text-2xl font-extrabold text-ink sm:text-3xl">
                Confirm your name
              </h2>
              <p className="mt-1 text-sm text-ink/60">
                Please verify that these details belong to you before marking attendance.
              </p>
            </div>

            <div className="mt-6 rounded-2xl border-2 border-brand/20 bg-mist/50 p-5 text-center sm:p-6">
              <p className="text-2xl font-black text-ink sm:text-3xl">
                {confirmStudent.full_name}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm sm:text-base">
                {confirmStudent.matric_no ? (
                  <span className="inline-flex items-center rounded-lg border border-line bg-white px-3 py-1 font-bold text-brand shadow-2xs">
                    Matric: {confirmStudent.matric_no}
                  </span>
                ) : (
                  <span className="text-xs italic text-ink/40">No matric number yet</span>
                )}
                {confirmStudent.detail && (
                  <span className="inline-flex items-center rounded-lg border border-line bg-white px-3 py-1 font-semibold text-ink/80 shadow-2xs">
                    {confirmStudent.detail}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={marking}
                onClick={() => mark(confirmStudent)}
                className="flex h-14 items-center justify-center gap-2 rounded-xl bg-ok px-4 text-base font-extrabold text-white shadow-md hover:bg-ok/90 active:scale-[0.98] disabled:opacity-50"
              >
                <CheckIcon className="h-5 w-5" />
                {marking ? 'Marking…' : 'Yes, mark me present'}
              </button>
              <button
                type="button"
                disabled={marking}
                onClick={() => setConfirmStudent(null)}
                className="flex h-14 items-center justify-center rounded-xl border-2 border-line bg-white px-4 text-base font-bold text-ink/80 hover:bg-mist active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer with Discreet Teacher Exit */}
      <footer className="mx-auto w-full max-w-4xl px-4 pb-6 pt-4 sm:px-8">
        <button
          type="button"
          onClick={() => setExiting(true)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink/60 hover:bg-white hover:text-ink"
        >
          <SignOutIcon className="h-4 w-4" /> Teacher exit
        </button>
      </footer>

      {/* Teacher Exit Password Modal */}
      {exiting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-xs">
          <form
            onSubmit={tryExit}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
          >
            <h2 className="text-xl font-extrabold text-ink">Teacher password</h2>
            <p className="mt-1 text-sm text-ink/60">
              Enter your password to leave the check-in screen.
            </p>
            <div className="relative mt-4">
              <input
                autoFocus
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Your password"
                className="w-full rounded-xl border border-line pl-4 pr-11 py-3 text-base focus:border-brand focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-ink/45 hover:text-ink transition-colors cursor-pointer"
                aria-label={showPw ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPw ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
            {pwError && <p className="mt-2 text-sm font-semibold text-red-700">{pwError}</p>}
            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={pwBusy}
                className="flex-1 rounded-xl bg-brand py-3 text-base font-bold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                {pwBusy ? 'Checking…' : 'Exit'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setExiting(false)
                  setPw('')
                  setPwError('')
                }}
                className="flex-1 rounded-xl border border-line bg-mist py-3 text-base font-bold text-ink hover:bg-line/40"
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
