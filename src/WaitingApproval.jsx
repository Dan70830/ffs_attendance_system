import { useState } from 'react'
import { Brand, ClockIcon, SignOutIcon } from './Icons'

export default function WaitingApproval({ profile, onRefresh, onSignOut }) {
  const [checking, setChecking] = useState(false)
  const firstName = (profile?.full_name || 'Teacher').split(' ')[0]

  async function handleCheckAgain() {
    setChecking(true)
    await onRefresh()
    setChecking(false)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-8">
          <Brand />
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold hover:bg-mist"
          >
            <SignOutIcon className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center p-6 sm:p-8">
        <div className="w-full rounded-xl border border-line bg-white p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sun/20 text-ink">
            <ClockIcon className="h-7 w-7 text-ink" />
          </div>

          <h1 className="mt-5 text-2xl font-extrabold sm:text-3xl">Waiting for approval</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink/70 sm:text-base">
            Hello, {firstName}. Your teacher account has been created. A principal needs to
            approve your access before you can view or record attendance.
          </p>

          <div className="mt-8 space-y-3">
            <button
              onClick={handleCheckAgain}
              disabled={checking}
              className="w-full rounded-md bg-brand py-3.5 text-base font-bold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {checking ? 'Checking status…' : 'Check again'}
            </button>
            <button
              onClick={onSignOut}
              className="w-full rounded-md border border-line bg-white py-3 text-sm font-semibold text-ink/70 hover:bg-mist"
            >
              Sign out
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

