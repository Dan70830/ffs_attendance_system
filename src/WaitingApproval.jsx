import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { Brand, CheckCircleIcon, ClockIcon, MailIcon, SignOutIcon } from './Icons'
import { fetchPrincipals, triggerPrincipalEmail } from './emailUtils'

export default function WaitingApproval({ profile, onRefresh, onSignOut }) {
  const [checking, setChecking] = useState(false)
  const [principals, setPrincipals] = useState([])
  const [notifyStatus, setNotifyStatus] = useState('idle') // 'idle' | 'sending' | 'sent'
  const firstName = (profile?.full_name || 'Teacher').split(' ')[0]

  useEffect(() => {
    let mounted = true
    async function loadPrincipals() {
      try {
        const data = await fetchPrincipals(supabase)
        if (mounted && data && data.length > 0) {
          setPrincipals(data)
        }
      } catch (err) {
        console.error('Error fetching principals:', err)
      }
    }

    loadPrincipals()
    return () => {
      mounted = false
    }
  }, [])

  async function handleCheckAgain() {
    setChecking(true)
    await onRefresh()
    setChecking(false)
  }

  function handleNotifyPrincipals() {
    setNotifyStatus('sending')

    const principalEmails = principals.map((p) => p.email).filter(Boolean)
    const teacherName = profile?.full_name || 'A new teacher'
    const teacherEmail = profile?.email || ''

    // 1. Attempt optional backend notification
    try {
      fetch('/api/notify-principal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherName,
          teacherEmail,
          principalEmails,
        }),
      }).catch(() => {})
    } catch {
      // Non-blocking
    }

    // 2. Open user's default email client with pre-formatted email to the 2 principals (Zero cost)
    triggerPrincipalEmail({
      teacherName,
      teacherEmail,
      principalEmails,
    })

    setNotifyStatus('sent')
  }

  const principalEmailList = principals.map((p) => p.email).filter(Boolean)

  return (
    <div className="flex min-h-screen flex-col bg-mist">
      <header className="border-b border-line bg-white shadow-2xs">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-8">
          <Brand />
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 rounded-xl border border-line px-3.5 py-2 text-xs sm:text-sm font-bold text-ink/75 hover:bg-mist transition-colors cursor-pointer"
          >
            <SignOutIcon className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full rounded-2xl border border-line bg-white p-6 text-center shadow-xs sm:p-9">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-8 ring-amber-50/50">
            <ClockIcon className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-2xl font-black tracking-tight text-ink sm:text-3xl">
            Waiting for approval
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-ink/70 sm:text-base">
            Hello, <strong className="font-bold text-ink">{firstName}</strong>. Your teacher account
            has been created and is waiting for principal approval before you can access student
            attendance records.
          </p>

          {/* Principal Notification Card */}
          <div className="mt-6 rounded-xl border border-brand/20 bg-brand/5 p-4 text-left sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white shadow-2xs">
                <MailIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-ink">Notify the Principals</h2>
                <p className="mt-0.5 text-xs text-ink/65 leading-relaxed">
                  Send a pre-formatted email to the school principals asking them to review and approve your account.
                </p>

                {principals.length > 0 && (
                  <div className="mt-2.5 text-xs font-semibold text-ink/75">
                    Principals:{' '}
                    <span className="font-bold text-brand">
                      {principals.map((p) => p.full_name || p.email).join(', ')}
                    </span>
                  </div>
                )}

                {notifyStatus === 'sent' && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-bold text-emerald-800">
                    <CheckCircleIcon className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Email client opened! Tap &quot;Send&quot; in your mail app.</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleNotifyPrincipals}
                  disabled={notifyStatus === 'sending'}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-2xs hover:bg-brand-dark active:scale-[0.99] disabled:opacity-60 transition-all cursor-pointer"
                >
                  <MailIcon className="h-4 w-4" />
                  {notifyStatus === 'sent' ? 'Open email again' : 'Email Principals to Approve'}
                </button>

                {principalEmailList.length > 0 && (
                  <p className="mt-2 text-[11px] text-ink/50">
                    Sending to:{' '}
                    <span className="font-mono text-ink/70">
                      {principalEmailList.join(', ')}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 space-y-2.5">
            <button
              onClick={handleCheckAgain}
              disabled={checking}
              className="w-full rounded-xl bg-ink py-3.5 text-sm font-bold text-white shadow-2xs hover:bg-ink/90 active:scale-[0.99] disabled:opacity-60 transition-all cursor-pointer"
            >
              {checking ? 'Checking approval status…' : 'I have been approved (Check status)'}
            </button>
            <button
              onClick={onSignOut}
              className="w-full rounded-xl border border-line bg-white py-3 text-xs sm:text-sm font-bold text-ink/70 hover:bg-mist transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
