import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { ArrowLeftIcon, CheckCircleIcon, TrashIcon, WhatsAppIcon } from './Icons'
import GroupBadge from './GroupBadge'
import { getWhatsAppUrl } from './whatsapp'

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

export default function StudentPage({ studentId, onBack, profile }) {
  const [student, setStudent] = useState(null)
  const [name, setName] = useState('')
  const [matricNo, setMatricNo] = useState('')
  const [phone, setPhone] = useState('')
  const [detail, setDetail] = useState('')
  const [groupId, setGroupId] = useState('')
  const [groups, setGroups] = useState([])
  const [history, setHistory] = useState([])
  const [allEvents, setAllEvents] = useState([])
  const [historyFilter, setHistoryFilter] = useState('all') // 'all' | 'present' | 'missed'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleDeleteStudent() {
    setDeleting(true)
    try {
      const { data, error: delErr } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)
        .select('id')

      if (delErr) {
        alert('Could not delete student: ' + delErr.message)
      } else if (!data || data.length === 0) {
        alert(
          'Student was not deleted in the database (permission blocked). Please ensure the Principal delete policy in supabase/migrations/05_production_security_hardening.sql has been applied in your Supabase SQL Editor.'
        )
      } else {
        setShowDeleteModal(false)
        onBack()
      }
    } catch (err) {
      alert('Error deleting student: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    let mounted = true

    async function loadData() {
      setLoading(true)

      // Fetch student details with group data
      const { data: sData, error: sErr } = await supabase
        .from('students')
        .select('*, student_groups(id, name, color, lead_teacher:lead_teacher_id(full_name))')
        .eq('id', studentId)
        .maybeSingle()

      // Fetch all active groups
      const { data: gData } = await supabase
        .from('student_groups')
        .select('id, name, color')
        .eq('active', true)
        .order('name')

      if (!mounted) return

      if (gData) {
        setGroups(gData)
      }

      if (!sErr && sData) {
        setStudent(sData)
        setName(sData.full_name || '')
        setMatricNo(sData.matric_no || '')
        setPhone(sData.phone || '')
        setDetail(sData.detail || '')
        setGroupId(sData.group_id || '')
      }

      // Fetch attendance history and all sessions so we can show Present vs Missed
      const [{ data: aData }, { data: eData }] = await Promise.all([
        supabase
          .from('attendance')
          .select('id, created_at, attendance_date, event_id, events(title, event_date)')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false }),
        supabase
          .from('events')
          .select('id, title, event_date, status, created_at')
          .order('event_date', { ascending: false })
          .order('created_at', { ascending: false }),
      ])

      if (!mounted) return

      setHistory(aData || [])
      setAllEvents(eData || [])
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
    const cleanPhone = phone.trim() || null
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
        phone: cleanPhone,
        detail: cleanDetail,
        group_id: groupId || null,
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
      // Refresh student with joined group
      const { data: updated } = await supabase
        .from('students')
        .select('*, student_groups(id, name, color, lead_teacher:lead_teacher_id(full_name))')
        .eq('id', studentId)
        .maybeSingle()
      if (updated) setStudent(updated)
      setTimeout(() => setSuccess(''), 4000)
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
          <span>Back to Students</span>
        </button>

        {profile?.role === 'principal' && (
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-colors cursor-pointer active:scale-95"
          >
            <TrashIcon className="h-4 w-4 text-rose-600" />
            <span>Delete Student</span>
          </button>
        )}
      </div>

      <div className="space-y-6">
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
              className="mt-6 min-h-[38px] rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-dark cursor-pointer"
            >
              Return to home
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top overview heading */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-extrabold sm:text-3xl text-ink">{student.full_name}</h1>
                  <GroupBadge group={student.student_groups} size="md" showUnassigned />
                </div>
                <p className="mt-1 text-sm text-ink/60">
                  {student.matric_no ? (
                    <span className="font-semibold text-ink">Matric: {student.matric_no}</span>
                  ) : (
                    <span className="italic text-ink/50">No matric number yet</span>
                  )}
                  {student.detail && ` · ${student.detail}`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                {getWhatsAppUrl(student.phone) && (
                  <a
                    href={getWhatsAppUrl(student.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <WhatsAppIcon className="h-3.5 w-3.5" />
                    <span>WhatsApp DM ({student.phone})</span>
                  </a>
                )}
                <span className="inline-flex rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
                  {history.length} event{history.length === 1 ? '' : 's'} attended
                </span>
              </div>
            </div>

            {/* Edit details card */}
            <section className="rounded-xl border border-line bg-white p-5 shadow-2xs sm:p-7">
              <h2 className="text-lg font-black text-ink sm:text-xl">Edit details</h2>
              <p className="mt-1 text-xs text-ink/60">
                Update name, matric number, or descriptive notes.
              </p>

              <form onSubmit={handleSave} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink/75" htmlFor="edit-name">
                    Full name *
                  </label>
                  <input
                    id="edit-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-line px-3.5 py-2.5 text-sm font-medium text-ink focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink/75" htmlFor="edit-matric">
                    Matric number
                  </label>
                  <input
                    id="edit-matric"
                    value={matricNo}
                    onChange={(e) => setMatricNo(e.target.value)}
                    placeholder="No matric number yet"
                    className="mt-1.5 w-full rounded-lg border border-line px-3.5 py-2.5 text-sm font-medium text-ink focus:border-brand"
                  />
                  <p className="mt-1 text-xs text-ink/50">
                    Required for student identification, but can be added or updated anytime.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink/75" htmlFor="edit-phone">
                    Phone / WhatsApp number
                  </label>
                  <input
                    id="edit-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 08103569660"
                    className="mt-1.5 w-full rounded-lg border border-line px-3.5 py-2.5 text-sm font-medium text-ink focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink/75" htmlFor="edit-detail">
                    Detail (optional)
                  </label>
                  <input
                    id="edit-detail"
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    placeholder="e.g. Senior Class, Age 12, or Choir"
                    className="mt-1.5 w-full rounded-lg border border-line px-3.5 py-2.5 text-sm font-medium text-ink focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink/75" htmlFor="edit-group">
                    Student group
                  </label>
                  <select
                    id="edit-group"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm font-medium text-ink focus:border-brand"
                  >
                    <option value="">Unassigned</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
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
                    className="w-full sm:w-auto min-h-[42px] rounded-lg bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-2xs hover:bg-brand-dark active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                  >
                    {saving ? 'Saving changes…' : 'Save changes'}
                  </button>
                </div>
              </form>
            </section>

            {/* Attendance breakdown card (Present & Missed sessions) */}
            {(() => {
              const attendedByEventId = new Map(history.map((r) => [r.event_id, r]))
              const sessionBreakdown = allEvents
                .filter((ev) => ev.status !== 'scheduled' || attendedByEventId.has(ev.id))
                .map((ev) => {
                  const rec = attendedByEventId.get(ev.id)
                  return {
                    id: ev.id,
                    title: ev.title || 'Class attendance',
                    event_date: ev.event_date,
                    status: ev.status,
                    attended: Boolean(rec),
                    checkInAt: rec?.created_at || null,
                  }
                })

              const totalCount = sessionBreakdown.length
              const presentCount = sessionBreakdown.filter((s) => s.attended).length
              const missedCount = totalCount - presentCount
              const scorePct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0
              const filteredList = sessionBreakdown.filter((s) => {
                if (historyFilter === 'present') return s.attended
                if (historyFilter === 'missed') return !s.attended
                return true
              })

              return (
                <section className="rounded-xl border border-line bg-white p-5 shadow-2xs sm:p-7 space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-bold sm:text-xl text-ink">Class Attendance Breakdown</h2>
                      <p className="mt-0.5 text-xs text-ink/60">
                        Exact classes attended and missed across all held sessions.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
                        {presentCount}/{totalCount} attended ({scorePct}%)
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  {totalCount > 0 && (
                    <div className="space-y-1.5">
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-mist">
                        <div
                          className={`h-full rounded-full transition-all ${
                            scorePct >= 75
                              ? 'bg-emerald-600'
                              : scorePct >= 50
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${scorePct}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {[
                          { id: 'all', label: `All (${totalCount})` },
                          { id: 'present', label: `Present (${presentCount})` },
                          { id: 'missed', label: `Missed (${missedCount})` },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setHistoryFilter(tab.id)}
                            className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors cursor-pointer ${
                              historyFilter === tab.id
                                ? 'bg-ink text-white'
                                : 'bg-mist/70 text-ink/70 hover:bg-mist'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredList.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-line bg-mist/50 p-6 text-sm text-ink/60">
                      {totalCount === 0
                        ? `No attendance sessions have been held yet.`
                        : `No ${historyFilter} sessions found for ${student.full_name}.`}
                    </p>
                  ) : (
                    <ul className="divide-y divide-line border-t border-line">
                      {filteredList.map((item) => {
                        const dateDisplay = formatDate(item.event_date, item.checkInAt)
                        const timeDisplay = formatTime(item.checkInAt)

                        return (
                          <li
                            key={item.id}
                            className="flex items-center justify-between gap-3 py-3.5"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-ink truncate">{item.title}</p>
                              <p className="text-xs text-ink/60">{dateDisplay}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {item.attended ? (
                                <>
                                  {timeDisplay && (
                                    <span className="hidden sm:inline text-xs font-semibold text-ink/50">
                                      {timeDisplay}
                                    </span>
                                  )}
                                  <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                                    Present
                                  </span>
                                </>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                                  Missed
                                </span>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
              )
            })()}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* DELETE STUDENT CONFIRMATION MODAL (Principal only)             */}
      {/* ============================================================== */}
      {showDeleteModal && student && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-xs"
          onClick={() => {
            if (!deleting) setShowDeleteModal(false)
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-7 border border-line"
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 border border-rose-200">
                <TrashIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink">Delete Student</h3>
                <p className="text-xs text-ink/60">This action cannot be undone.</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 text-xs text-rose-900 space-y-1">
              <p>
                Are you sure you want to permanently remove <strong className="font-bold text-rose-950">{student.full_name}</strong>
                {student.matric_no ? ` (${student.matric_no})` : ''}?
              </p>
              <p className="text-[11px] text-rose-800/80">
                All {history.length} associated attendance record{history.length === 1 ? '' : 's'} for this student will also be removed.
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 min-h-[42px] rounded-lg border border-line bg-white py-2.5 text-sm font-semibold text-ink hover:bg-mist transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteStudent}
                className="flex-1 min-h-[42px] rounded-lg bg-rose-600 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {deleting ? 'Deleting…' : 'Yes, Delete Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

