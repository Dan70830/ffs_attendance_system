import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { Brand, CheckCircleIcon, EyeIcon, EyeOffIcon, MailIcon } from './Icons'
import { fetchPrincipals, triggerPrincipalEmail } from './emailUtils'

export default function Login() {
  const [tab, setTab] = useState('signin') // 'signin' | 'signup' | 'forgot' | 'signup_success'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showSignInPassword, setShowSignInPassword] = useState(false)
  const [showSignUpPassword, setShowSignUpPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [principals, setPrincipals] = useState([])
  const [registeredName, setRegisteredName] = useState('')
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [emailTriggered, setEmailTriggered] = useState(false)

  useEffect(() => {
    let mounted = true
    fetchPrincipals(supabase).then((data) => {
      if (mounted && data && data.length > 0) {
        setPrincipals(data)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  function switchTab(newTab) {
    setTab(newTab)
    setError('')
    setInfo('')
    setEmailTriggered(false)
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

    const cleanEmail = email.trim().toLowerCase()

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: cleanEmail,
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
          email: cleanEmail,
          role: 'teacher',
          approved: false,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      )

      // Notify principals asynchronously in the background (if backend is configured)
      try {
        fetch('/api/notify-principal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teacherName: name,
            teacherEmail: cleanEmail,
            principalEmails: principals.map((p) => p.email),
          }),
        }).catch(() => {})
      } catch {
        // Non-blocking notification
      }
    }

    setRegisteredName(name)
    setRegisteredEmail(cleanEmail)
    setEmailTriggered(false)
    setBusy(false)

    if (!data?.session) {
      // Show approval request view with 1-tap email to principals
      setTab('signup_success')
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
    <div className="grid min-h-screen bg-mist lg:grid-cols-12">
      {/* Left hero section with natural photograph & localized text gradient */}
      <div className="relative flex flex-col justify-between overflow-hidden p-6 sm:p-10 lg:col-span-6 lg:min-h-screen lg:p-12 xl:col-span-7 xl:p-16">
        {/* Supplied Classroom Photograph anchored at bottom so teachers and students are in clear view */}
        <img
          src="/ffs-hero.jpg"
          alt="Firm Foundation School classroom students and teachers"
          className="absolute inset-0 h-full w-full object-cover object-bottom select-none"
        />

        {/* Localized gradient strictly at the top where text appears (fading out before teachers' faces) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-3/5 bg-gradient-to-b from-black/85 via-black/45 to-transparent" />

        {/* Hero Content positioned in the upper tree canopy area so NO face is covered */}
        <div className="relative z-10 flex h-full flex-col justify-between">
          {/* Top Brand identity & Headline directly over the localized gradient */}
          <div className="max-w-xl space-y-4">
            <div>
              <Brand onDark />
            </div>

            <div className="pt-2 sm:pt-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white backdrop-blur-xs">
                Attendance Portal
              </span>
              <h1 className="mt-3 text-2xl font-black leading-tight tracking-tight text-white drop-shadow-md sm:text-3xl lg:text-4xl xl:text-5xl">
                Class Attendance for Firm Foundation School
              </h1>
              <p className="mt-2.5 max-w-md text-xs font-medium leading-relaxed text-white/90 drop-shadow-sm sm:text-sm lg:text-base">
                Students find their own name and tap once. You see who came, fix mistakes, and the
                principal gets the reports.
              </p>
            </div>
          </div>

          {/* Lower section left completely clear over the teachers' faces */}
          <div className="pt-32 sm:pt-44 lg:pt-0">
            <div className="inline-block rounded-xl border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-xs">
              <p className="text-[11px] font-bold text-white/90">
                Firm Foundation School · Teachers & Principals
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right authentication form section: crisp, white, and clean */}
      <div className="flex items-center justify-center bg-white p-6 sm:p-10 lg:col-span-6 lg:min-h-screen lg:p-14 xl:col-span-5 xl:p-16">
        <div className="w-full max-w-md">
          {/* Tabs: Sign in & Create account */}
          {tab === 'signin' || tab === 'signup' ? (
            <div className="flex rounded-2xl border border-line bg-mist p-1.5 shadow-2xs">
              <button
                type="button"
                onClick={() => switchTab('signin')}
                className={`flex-1 rounded-xl py-2.5 text-sm font-extrabold transition-all cursor-pointer ${
                  tab === 'signin'
                    ? 'bg-white text-ink shadow-xs'
                    : 'text-ink/60 hover:text-ink'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchTab('signup')}
                className={`flex-1 rounded-xl py-2.5 text-sm font-extrabold transition-all cursor-pointer ${
                  tab === 'signup'
                    ? 'bg-white text-ink shadow-xs'
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
              className="inline-flex items-center gap-1.5 text-xs font-bold text-ink/60 hover:text-ink cursor-pointer"
            >
              ← Back to sign in
            </button>
          )}

          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="mt-6 sm:mt-8">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
                  Sign in
                </h2>
                <p className="mt-1 text-sm text-ink/65">
                  Use the email and password you registered with.
                </p>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink/75" htmlFor="signin-email">
                    Email address
                  </label>
                  <input
                    id="signin-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="e.g. teacher@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-base text-ink placeholder:text-ink/40 focus:border-brand focus:outline-hidden"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-ink/75" htmlFor="signin-password">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => switchTab('forgot')}
                      className="text-xs font-bold text-brand hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative mt-1.5">
                    <input
                      id="signin-password"
                      type={showSignInPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="Your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-line bg-white pl-4 pr-11 py-3 text-base text-ink placeholder:text-ink/40 focus:border-brand focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-ink/45 hover:text-ink transition-colors cursor-pointer"
                      aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showSignInPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-700">
                  {error}
                </div>
              )}
              {info && (
                <div className="mt-4 rounded-xl border border-line bg-mist/60 p-3.5 text-xs font-bold text-brand leading-relaxed">
                  {info}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-6 flex w-full items-center justify-center rounded-xl bg-brand py-3.5 text-base font-extrabold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}

          {tab === 'signup' && (
            <form onSubmit={handleSignUp} className="mt-6 sm:mt-8">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
                  Create account
                </h2>
                <p className="mt-1 text-sm text-ink/65">
                  Register as a teacher. A principal will approve your account.
                </p>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink/75" htmlFor="signup-name">
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
                    className="mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-base text-ink placeholder:text-ink/40 focus:border-brand focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink/75" htmlFor="signup-email">
                    Email address
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="e.g. teacher@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-base text-ink placeholder:text-ink/40 focus:border-brand focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink/75" htmlFor="signup-password">
                    Password
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      id="signup-password"
                      type={showSignUpPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-line bg-white pl-4 pr-11 py-3 text-base text-ink placeholder:text-ink/40 focus:border-brand focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-ink/45 hover:text-ink transition-colors cursor-pointer"
                      aria-label={showSignUpPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showSignUpPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-6 flex w-full items-center justify-center rounded-xl bg-brand py-3.5 text-base font-extrabold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {busy ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          )}

          {tab === 'signup_success' && (
            <div className="mt-6 sm:mt-8 space-y-5">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800">
                  <CheckCircleIcon className="h-4 w-4 text-emerald-600" /> Account Created
                </span>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-ink sm:text-3xl">
                  Approval Required
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">
                  Welcome, <strong className="font-bold text-ink">{registeredName}</strong>. Your teacher account has been registered. Before you can record attendance, one of the school principals must approve your access.
                </p>
              </div>

              <div className="rounded-2xl border border-brand/20 bg-brand/5 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-2xs">
                    <MailIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-ink">Notify the Principals</h3>
                    <p className="mt-0.5 text-xs text-ink/65 leading-relaxed">
                      Click below to send a pre-formatted email to the principals requesting approval.
                    </p>

                    {principals.length > 0 && (
                      <div className="mt-2 text-xs font-semibold text-ink/75">
                        Principals:{' '}
                        <span className="font-bold text-brand">
                          {principals.map((p) => p.full_name || p.email).join(', ')}
                        </span>
                      </div>
                    )}

                    {emailTriggered && (
                      <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-xs font-bold text-emerald-800">
                        <CheckCircleIcon className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Email app opened! Tap &quot;Send&quot; in your mail client.</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        triggerPrincipalEmail({
                          teacherName: registeredName,
                          teacherEmail: registeredEmail,
                          principalEmails: principals.map((p) => p.email),
                        })
                        setEmailTriggered(true)
                      }}
                      className="mt-3.5 flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-2xs hover:bg-brand-dark active:scale-[0.99] transition-all cursor-pointer"
                    >
                      <MailIcon className="h-4 w-4" />
                      {emailTriggered ? 'Open email again' : 'Email Principals to Approve'}
                    </button>

                    {principals.length > 0 && (
                      <p className="mt-2 text-[11px] text-ink/50">
                        Sending to:{' '}
                        <span className="font-mono text-ink/70">
                          {principals.map((p) => p.email).filter(Boolean).join(', ')}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => switchTab('signin')}
                  className="flex w-full items-center justify-center rounded-xl bg-ink py-3.5 text-sm font-bold text-white shadow-2xs hover:bg-ink/90 active:scale-[0.99] transition-all cursor-pointer"
                >
                  Proceed to Sign in →
                </button>
              </div>
            </div>
          )}

          {tab === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="mt-6 sm:mt-8">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
                  Reset password
                </h2>
                <p className="mt-1 text-sm text-ink/65">
                  Enter your account email to receive a password reset link.
                </p>
              </div>

              <div className="mt-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-ink/75" htmlFor="forgot-email">
                  Email address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. teacher@example.com"
                  className="mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-base text-ink placeholder:text-ink/40 focus:border-brand focus:outline-hidden"
                />
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-700">
                  {error}
                </div>
              )}
              {info && (
                <div className="mt-4 rounded-xl border border-line bg-mist/60 p-3.5 text-xs font-bold text-brand leading-relaxed">
                  {info}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-6 flex w-full items-center justify-center rounded-xl bg-brand py-3.5 text-base font-extrabold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {busy ? 'Sending link…' : 'Send reset link'}
              </button>

              <button
                type="button"
                onClick={() => switchTab('signin')}
                className="mt-3 w-full rounded-xl border border-line py-3 text-sm font-bold text-ink/70 transition-colors hover:bg-mist cursor-pointer"
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
