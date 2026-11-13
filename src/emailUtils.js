// Zero-cost email utility for teacher approval notifications

export async function fetchPrincipals(supabase) {
  try {
    // 1. Try secure RPC function (accessible to both anon and authenticated)
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_principal_emails')
    if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
      return rpcData.filter((p) => p.email && p.email.trim() !== '')
    }
  } catch {
    // Fall back to direct profile table query
  }

  try {
    // 2. Direct profiles query (works for authenticated users)
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('role', 'principal')
      .eq('approved', true)

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.filter((p) => p.email && p.email.trim() !== '')
    }
  } catch (err) {
    console.error('Error fetching principal emails:', err)
  }

  return []
}

export function buildPrincipalApprovalMailto({ teacherName, teacherEmail, principalEmails }) {
  const emails = Array.isArray(principalEmails)
    ? principalEmails.filter(Boolean).map((e) => e.trim())
    : [principalEmails].filter(Boolean)

  const to = emails.join(',')
  const name = (teacherName || 'Teacher').trim()
  const email = (teacherEmail || '').trim()
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ffs-attendance-system.vercel.app'

  const subject = `FFS Attendance: Account Approval Needed for ${name}`
  const body = `Dear Principal,

I have registered as a teacher on the Firm Foundation School (FFS) Attendance System.

Teacher Details:
• Full Name: ${name}
• Email Address: ${email}

Please log in to your Principal Dashboard to review and approve my account when you are free:
${origin}

Thank you,
${name}`

  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function triggerPrincipalEmail({ teacherName, teacherEmail, principalEmails }) {
  const mailtoUrl = buildPrincipalApprovalMailto({
    teacherName,
    teacherEmail,
    principalEmails,
  })

  // Open user's default email client with preformatted message
  window.location.href = mailtoUrl
}
