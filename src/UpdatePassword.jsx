import { useState } from 'react'
import { supabase } from './supabase'
import { Brand } from './Icons'

export default function UpdatePassword({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleUpdate(e) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setBusy(true)

    const { error: updateErr } = await supabase.auth.updateUser({
      password,
    })

    setBusy(false)

    if (updateErr) {
      if (updateErr.message?.toLowerCase().includes('same password')) {
        setError('New password must be different from your old password.')
      } else {
        setError('Could not update password. Your reset link may have expired.')
      }
    } else {
      onSuccess()
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-mist p-6">
      <div className="w-full max-w-sm rounded-xl border border-line bg-white p-6 shadow-sm sm:p-8">
        <Brand />
        <h1 className="mt-6 text-2xl font-extrabold text-ink sm:text-3xl">Set new password</h1>
        <p className="mt-1 text-sm text-ink/60">
          Enter your new password below (at least 6 characters).
        </p>

        <form onSubmit={handleUpdate} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink" htmlFor="new-pass">
              New password
            </label>
            <input
              id="new-pass"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-line px-4 py-2.5 text-sm focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink" htmlFor="confirm-pass">
              Confirm new password
            </label>
            <input
              id="confirm-pass"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-line px-4 py-2.5 text-sm focus:border-brand"
            />
          </div>

          {error && <p className="text-sm font-semibold text-red-700">{error}</p>}

          <button
            disabled={busy}
            className="w-full rounded-md bg-brand py-3 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? 'Updating password…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}

