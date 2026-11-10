import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { ArrowLeftIcon, ShieldCheckIcon, CheckCircleIcon, Brand } from './Icons'

function formatRegistrationDate(timestamp) {
  if (!timestamp) return 'recently'
  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  })
}

export default function ManageTeachers({ profile: currentProfile, onBack }) {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const [confirmModal, setConfirmModal] = useState(null) // { type: 'active' | 'pending', teacher }

  async function refreshTeachers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setTeachers(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    let mounted = true
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!mounted) return
        if (!error && data) {
          setTeachers(data)
        }
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  function showMessage(msg) {
    setFeedback(msg)
    setTimeout(() => setFeedback(''), 4000)
  }

  async function handleApprove(target) {
    if (target.id === currentProfile.id) return // never set own approval
    setActionBusy(true)
    const { error } = await supabase
      .from('profiles')
      .update({ approved: true })
      .eq('id', target.id)

    setActionBusy(false)
    if (error) {
      showMessage('Could not approve teacher. Please try again.')
    } else {
      showMessage(`${target.full_name} has been approved.`)
      refreshTeachers()
    }
  }

  async function handleDisapproveActive(target) {
    if (target.id === currentProfile.id) return
    setActionBusy(true)
    const { error } = await supabase
      .from('profiles')
      .update({ approved: false })
      .eq('id', target.id)

    setActionBusy(false)
    setConfirmModal(null)

    if (error) {
      showMessage('Could not disapprove teacher. Please try again.')
    } else {
      showMessage(`Disapproved ${target.full_name}. Their access is revoked and history is preserved.`)
      refreshTeachers()
    }
  }

  async function handleDisapprovePending(target) {
    if (target.id === currentProfile.id) return
    setActionBusy(true)

    // Delete unapproved profile request
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', target.id)
      .eq('approved', false)

    setActionBusy(false)
    setConfirmModal(null)

    if (error) {
      showMessage('Could not disapprove account. Please run the latest database migration in Supabase.')
    } else {
      showMessage(`Disapproved and removed registration request for ${target.full_name}.`)
      refreshTeachers()
    }
  }

  const waitingList = teachers.filter((t) => !t.approved)
  const activeList = teachers.filter((t) => t.approved)

  return (
    <div className="min-h-screen bg-mist">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-8">
          <Brand />
          <button
            onClick={onBack}
            className="flex items-center gap-2 rounded-md border border-line px-3.5 py-2 text-sm font-bold text-ink hover:bg-mist"
          >
            <ArrowLeftIcon className="h-4 w-4" /> Back to home
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">Manage teachers</h1>
            <p className="mt-1 text-sm text-ink/70 sm:text-base">
              Approve or disapprove accounts and manage teacher permissions.
            </p>
          </div>
        </div>

        {feedback && (
          <div className="mt-4 rounded-lg border border-line bg-white p-4 text-sm font-bold text-brand shadow-sm">
            {feedback}
          </div>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-ink/60">Loading teachers…</p>
        ) : (
          <div className="mt-8 space-y-8">
            {/* List 1: Waiting for approval */}
            <section className="rounded-xl border border-line bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold sm:text-xl">Waiting for approval</h2>
                  <span className="rounded-full bg-sun/30 px-2.5 py-0.5 text-xs font-extrabold text-ink">
                    {waitingList.length}
                  </span>
                </div>
              </div>

              {waitingList.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-line bg-mist/50 p-6 text-sm text-ink/60">
                  No teachers are currently waiting for approval.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-line border-t border-line">
                  {waitingList.map((t) => {
                    const isNameEmail = t.full_name?.includes('@')
                    const displayName = isNameEmail ? (t.email || t.full_name) : t.full_name
                    const displayEmail = t.email && t.email !== displayName ? t.email : null

                    return (
                      <li
                        key={t.id}
                        className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-ink text-base sm:text-lg">
                            {displayName}
                          </p>
                          {displayEmail && (
                            <p className="text-sm font-medium text-ink/70">
                              {displayEmail}
                            </p>
                          )}
                          <p className="text-xs text-ink/50 pt-0.5">
                            Teacher account · Registered {formatRegistrationDate(t.created_at)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(t)}
                            disabled={actionBusy}
                            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
                          >
                            <CheckCircleIcon className="h-4 w-4" /> Approve
                          </button>
                          <button
                            onClick={() => setConfirmModal({ type: 'pending', teacher: t })}
                            disabled={actionBusy}
                            className="rounded-md border border-line px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Disapprove
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {/* List 2: Active */}
            <section className="rounded-xl border border-line bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold sm:text-xl">Active</h2>
                  <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-extrabold text-brand">
                    {activeList.length}
                  </span>
                </div>
              </div>

              {activeList.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-line bg-mist/50 p-6 text-sm text-ink/60">
                  No active teachers found.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-line border-t border-line">
                  {activeList.map((t) => {
                    const isSelf = t.id === currentProfile.id
                    const isPrincipal = t.role === 'principal'

                    const isNameEmail = t.full_name?.includes('@')
                    const displayName = isNameEmail ? (t.email || t.full_name) : t.full_name
                    const displayEmail = t.email && t.email !== displayName ? t.email : null

                    return (
                      <li
                        key={t.id}
                        className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-ink text-base sm:text-lg">
                              {displayName}
                            </span>
                            {isSelf && (
                              <span className="text-xs font-semibold text-ink/50">(You)</span>
                            )}
                          </div>
                          {displayEmail && (
                            <p className="text-sm font-medium text-ink/70">
                              {displayEmail}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-2 pt-0.5">
                            {isPrincipal ? (
                              <span className="inline-flex items-center gap-1 rounded bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">
                                <ShieldCheckIcon className="h-3.5 w-3.5" /> Principal
                              </span>
                            ) : (
                              <span className="rounded bg-mist px-2 py-0.5 text-xs font-semibold text-ink/70">
                                Teacher
                              </span>
                            )}
                            <span className="text-xs text-ink/40">
                              · Joined {formatRegistrationDate(t.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons:
                            - Principals appear without action buttons
                            - Users cannot disapprove their own account
                            - Active teachers can be disapproved */}
                        {!isPrincipal && !isSelf && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setConfirmModal({ type: 'active', teacher: t })}
                              disabled={actionBusy}
                              className="rounded-md border border-line px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              Disapprove
                            </button>
                          </div>
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

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-line bg-white p-6 shadow-xl">
            <h3 className="text-xl font-extrabold text-ink">
              {confirmModal.type === 'active' ? 'Disapprove teacher?' : 'Disapprove registration?'}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">
              {confirmModal.type === 'active' ? (
                <>
                  Are you sure you want to disapprove access for{' '}
                  <strong>{confirmModal.teacher.full_name}</strong>
                  {confirmModal.teacher.email && ` (${confirmModal.teacher.email})`}? Their
                  access will be revoked and they will no longer be able to take attendance. Their
                  past attendance history will be preserved.
                </>
              ) : (
                <>
                  Are you sure you want to disapprove the registration request for{' '}
                  <strong>{confirmModal.teacher.full_name}</strong>
                  {confirmModal.teacher.email && ` (${confirmModal.teacher.email})`}?
                </>
              )}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() =>
                  confirmModal.type === 'active'
                    ? handleDisapproveActive(confirmModal.teacher)
                    : handleDisapprovePending(confirmModal.teacher)
                }
                disabled={actionBusy}
                className="flex-1 rounded-md bg-red-700 py-3 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50"
              >
                {actionBusy ? 'Updating…' : 'Confirm disapprove'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 rounded-md border border-line bg-mist py-3 text-sm font-bold text-ink hover:bg-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
