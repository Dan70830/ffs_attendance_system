import { useState } from 'react'
import { supabase } from './supabase'
import { Brand } from './Icons'

export default function Login() {
  const [tab, setTab] = useState('signin') // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  function switchTab(newTab) {
    setTab(newTab)
    setError('')
    setInfo('')
  }

  async function handleSignIn(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInErr) {
      // Per spec: do not reveal which one is wrong
      setError('Email or password is incorrect.')
      setBusy(false)
    }
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setError('')
    setInfo('')

    const name = fullName.trim()
    if (!name) {
      setError('Please enter your full name.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setBusy(true)

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    })

    if (signUpErr) {
      setError(signUpErr.message || 'Could not create account. Please try again.')
      setBusy(false)
      return
    }

    // Ensure profile row exists with role 'teacher' and approved false
    if (data?.user) {
      await supabase.from('profiles').upsert(
        {
          id: data.user.id,
          full_name: name,
          email: email.trim().toLowerCase(),
          role: 'teacher',
          approved: false,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      )
    }

    if (!data?.session) {
      setInfo('Account created. Please sign in with your email and password.')
      setBusy(false)
      setTab('signin')
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    setError('')
    setInfo('')

    const cleanEmail = email.trim()
    if (!cleanEmail) {
      setError('Please enter your email address.')
      return
    }

    setBusy(true)

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/`,
    })

    setBusy(false)

    if (resetErr) {
      setError(resetErr.message || 'Could not send reset link. Please try again.')
    } else {
      setInfo(
        'Check your email! A password reset link has been sent to your address. Click the link in the email to set a new password.'
      )
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="flex flex-col justify-between bg-brand p-6 text-white sm:p-10 lg:p-16">
        <Brand onDark />
        <div className="py-10 lg:py-0">
          <h1 className="max-w-md text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
            Class Attendance for Firm Foundation School
          </h1>
          <p className="mt-4 max-w-md text-base text-white/80 sm:text-lg">
            Students find their own name and tap once. You see who came, fix mistakes, and the
            principal gets the reports.
          </p>
        </div>
        <p className="hidden text-sm text-white/60 lg:block">Teachers and principals only.</p>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center bg-white p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {/* Tabs: Sign in & Create account */}
          {tab !== 'forgot' ? (
            <div className="flex rounded-lg border border-line bg-mist p-1">
              <button
                type="button"
                onClick={() => switchTab('signin')}
                className={`flex-1 rounded-md py-2.5 text-sm font-bold transition-colors ${
                  tab === 'signin'
                    ? 'bg-white text-ink shadow-sm'
                    : 'text-ink/60 hover:text-ink'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchTab('signup')}
                className={`flex-1 rounded-md py-2.5 text-sm font-bold transition-colors ${
                  tab === 'signup'
                    ? 'bg-white text-ink shadow-sm'
                    : 'text-ink/60 hover:text-ink'
                }`}
              >
                Create account
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => switchTab('signin')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-ink/60 hover:text-ink"
            >
              ← Back to sign in
            </button>
          )}

          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="mt-6">
              <h2 className="text-2xl font-extrabold sm:text-3xl">Sign in</h2>
              <p className="mt-1 text-sm text-ink/60">
                Use the email and password you registered with.
              </p>

              <label className="mt-6 block text-sm font-semibold" htmlFor="signin-email">
                Email
              </label>
              <input
                id="signin-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-line bg-white px-4 py-3 text-base focus:border-brand"
              />

              <div className="mt-4 flex items-center justify-between">
                <label className="block text-sm font-semibold" htmlFor="signin-password">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => switchTab('forgot')}
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="signin-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-line bg-white px-4 py-3 text-base focus:border-brand"
              />

              {error && <p className="mt-4 text-sm font-semibold text-red-700">{error}</p>}
              {info && <p className="mt-4 text-sm font-semibold text-brand">{info}</p>}

              <button
                disabled={busy}
                className="mt-6 w-full rounded-md bg-brand px-4 py-3.5 text-base font-bold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}

          {tab === 'signup' && (
            <form onSubmit={handleSignUp} className="mt-6">
              <h2 className="text-2xl font-extrabold sm:text-3xl">Create account</h2>
              <p className="mt-1 text-sm text-ink/60">
                Register as a teacher. A principal will approve your account.
              </p>

              <label className="mt-6 block text-sm font-semibold" htmlFor="signup-name">
                Full name
              </label>
              <input
                id="signup-name"
                type="text"
                required
                autoComplete="name"
                placeholder="e.g. Mary Adekunle"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-line bg-white px-4 py-3 text-base focus:border-brand"
              />

              <label className="mt-4 block text-sm font-semibold" htmlFor="signup-email">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-line bg-white px-4 py-3 text-base focus:border-brand"
              />

              <label className="mt-4 block text-sm font-semibold" htmlFor="signup-password">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-line bg-white px-4 py-3 text-base focus:border-brand"
              />

              {error && <p className="mt-4 text-sm font-semibold text-red-700">{error}</p>}

              <button
                disabled={busy}
                className="mt-6 w-full rounded-md bg-brand px-4 py-3.5 text-base font-bold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                {busy ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          )}

          {tab === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="mt-6">
              <h2 className="text-2xl font-extrabold sm:text-3xl">Reset password</h2>
              <p className="mt-1 text-sm text-ink/60">
                Enter your account email to receive a password reset link.
              </p>

              <label className="mt-6 block text-sm font-semibold" htmlFor="forgot-email">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. teacher@example.com"
                className="mt-1.5 w-full rounded-md border border-line bg-white px-4 py-3 text-base focus:border-brand"
              />

              {error && <p className="mt-4 text-sm font-semibold text-red-700">{error}</p>}
              {info && <p className="mt-4 text-sm font-semibold text-brand leading-relaxed">{info}</p>}

              <button
                disabled={busy}
                className="mt-6 w-full rounded-md bg-brand px-4 py-3.5 text-base font-bold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                {busy ? 'Sending link…' : 'Send reset link'}
              </button>

              <button
                type="button"
                onClick={() => switchTab('signin')}
                className="mt-3 w-full rounded-md border border-line py-3 text-sm font-semibold text-ink/70 hover:bg-mist"
              >
                Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
