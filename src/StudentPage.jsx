import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { ArrowLeftIcon, Brand, CheckCircleIcon } from './Icons'

function formatDate(dateStr, timestamp) {
  const d = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date(timestamp)
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  })
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Africa/Lagos',
  })
}

export default function StudentPage({ studentId, onBack }) {
  const [student, setStudent] = useState(null)
  const [name, setName] = useState('')
  const [matricNo, setMatricNo] = useState('')
  const [detail, setDetail] = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadData() {
      setLoading(true)

      // Fetch student details
      const { data: sData, error: sErr } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .maybeSingle()

      if (!mounted) return

      if (!sErr && sData) {
        setStudent(sData)
        setName(sData.full_name || '')
        setMatricNo(sData.matric_no || '')
        setDetail(sData.detail || '')
      }

      // Fetch attendance history
      const { data: aData } = await supabase
        .from('attendance')
        .select('id, created_at, attendance_date, event_id, events(title, event_date)')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })

      if (!mounted) return

      setHistory(aData || [])
      setLoading(false)
    }

    if (studentId) {
      loadData()
    }

    return () => {
      mounted = false
    }
  }, [studentId])

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const cleanName = name.trim()
    const cleanMatric = matricNo.trim() || null
    const cleanDetail = detail.trim() || null

    if (!cleanName) {
      setError('Full name is required.')
      return
    }

    setSaving(true)

    // Pre-check duplicate matric number if entered
    if (cleanMatric) {
      const { data: existing } = await supabase
        .from('students')
        .select('id, matric_no')
        .ilike('matric_no', cleanMatric)
        .neq('id', studentId)

      if (existing && existing.length > 0) {
        setError('A student with that matric number already exists.')
        setSaving(false)
        return
      }
    }

    const { error: updateErr } = await supabase
      .from('students')
      .update({
        full_name: cleanName,
        matric_no: cleanMatric,
        detail: cleanDetail,
      })
      .eq('id', studentId)

    setSaving(false)

    if (updateErr) {
      if (updateErr.code === '23505' || updateErr.message?.toLowerCase().includes('matric')) {
        setError('A student with that matric number already exists.')
      } else {
        setError('Could not update student details. Please try again.')
      }
    } else {
      setSuccess('Student details updated successfully.')
      setStudent((prev) => ({
        ...prev,
        full_name: cleanName,
        matric_no: cleanMatric,
        detail: cleanDetail,
      }))
      setTimeout(() => setSuccess(''), 4000)
    }
  }

  return (
    <div className="min-h-screen bg-mist">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Brand />
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-ink transition-colors hover:bg-mist active:scale-95 sm:px-3.5 sm:text-sm"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Back to home</span>
            <span className="sm:hidden">Back</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
        {loading ? (
          <div className="py-12 text-center text-sm font-semibold text-ink/60">
            Loading student details…
          </div>
        ) : !student ? (
          <div className="rounded-xl border border-line bg-white p-8 text-center">
            <h2 className="text-xl font-extrabold text-ink">Student not found</h2>
            <p className="mt-2 text-sm text-ink/70">
              The requested student record could not be found.
            </p>
            <button
              onClick={onBack}
              className="mt-6 rounded-md bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-dark"
            >
              Return to home
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top overview heading */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <h1 className="text-2xl font-extrabold sm:text-3xl">{student.full_name}</h1>
                <p className="mt-1 text-sm text-ink/60">
                  {student.matric_no ? (
                    <span className="font-semibold text-ink">Matric: {student.matric_no}</span>
                  ) : (
                    <span className="italic text-ink/50">No matric number yet</span>
                  )}
                  {student.detail && ` · ${student.detail}`}
                </p>
              </div>

              <span className="inline-flex self-start rounded-full bg-brand/10 px-3 py-1 text-sm font-bold text-brand sm:self-auto">
                {history.length} event{history.length === 1 ? '' : 's'} attended
              </span>
            </div>

            {/* Edit details card */}
            <section className="rounded-2xl border border-line bg-white p-5 shadow-2xs sm:p-7">
              <h2 className="text-lg font-black text-ink sm:text-xl">Edit details</h2>
              <p className="mt-1 text-xs text-ink/60">
                Update name, matric number, or descriptive notes.
              </p>

              <form onSubmit={handleSave} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink" htmlFor="edit-name">
                    Full name *
                  </label>
                  <input
                    id="edit-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-line px-4 py-2.5 text-sm font-medium focus:border-brand focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink" htmlFor="edit-matric">
                    Matric number
                  </label>
                  <input
                    id="edit-matric"
                    value={matricNo}
                    onChange={(e) => setMatricNo(e.target.value)}
                    placeholder="No matric number yet"
                    className="mt-1.5 w-full rounded-xl border border-line px-4 py-2.5 text-sm font-medium focus:border-brand focus:outline-hidden"
                  />
                  <p className="mt-1 text-xs text-ink/50">
                    Required for student identification, but can be added or updated anytime.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink" htmlFor="edit-detail">
                    Detail (optional)
                  </label>
                  <input
                    id="edit-detail"
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    placeholder="e.g. Senior Class, Age 12, or Choir"
                    className="mt-1.5 w-full rounded-xl border border-line px-4 py-2.5 text-sm font-medium focus:border-brand focus:outline-hidden"
                  />
                </div>

                {error && <p className="text-xs font-bold text-red-700">{error}</p>}
                {success && (
                  <p className="inline-flex items-center gap-1.5 text-xs font-bold text-ok">
                    <CheckCircleIcon className="h-4 w-4" /> {success}
                  </p>
                )}

                <div className="pt-2">
                  <button
                    disabled={saving}
                    className="w-full sm:w-auto rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-brand-dark active:scale-[0.98] disabled:opacity-60"
                  >
                    {saving ? 'Saving changes…' : 'Save changes'}
                  </button>
                </div>
              </form>
            </section>

            {/* Attendance history card */}
            <section className="rounded-2xl border border-line bg-white p-5 shadow-2xs sm:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold sm:text-xl">Attendance history</h2>
                  <p className="mt-0.5 text-xs text-ink/60">
                    All events this student was marked present for, newest first.
                  </p>
                </div>
                <span className="rounded-full bg-mist px-3 py-1 text-xs font-extrabold text-ink">
                  Total: {history.length}
                </span>
              </div>

              {history.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-line bg-mist/50 p-6 text-sm text-ink/60">
                  No attendance records found for {student.full_name}.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-line border-t border-line">
                  {history.map((record) => {
                    const title = record.events?.title || 'Class attendance'
                    const dateDisplay = formatDate(
                      record.events?.event_date || record.attendance_date,
                      record.created_at
                    )
                    const timeDisplay = formatTime(record.created_at)

                    return (
                      <li
                        key={record.id}
                        className="flex items-center justify-between py-3.5"
                      >
                        <div>
                          <p className="font-bold text-ink">{title}</p>
                          <p className="text-xs text-ink/60">{dateDisplay}</p>
                        </div>
                        {timeDisplay && (
                          <span className="text-xs font-semibold text-ink/50">
                            {timeDisplay}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

