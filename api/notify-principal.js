// Vercel Serverless Function: api/notify-principal.js
// Sends an email notification to principals when a teacher signs up or requests approval.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { teacherName, teacherEmail, principalEmails } = req.body || {}

    const resendKey = process.env.RESEND_API_KEY
    const notificationWebhook = process.env.NOTIFICATION_WEBHOOK_URL
    const configuredPrincipals = process.env.PRINCIPAL_EMAILS

    // Determine target recipient emails
    let targetEmails = []
    if (configuredPrincipals) {
      targetEmails = configuredPrincipals.split(',').map((e) => e.trim()).filter(Boolean)
    } else if (Array.isArray(principalEmails) && principalEmails.length > 0) {
      targetEmails = principalEmails.filter(Boolean)
    }

    // 1. If Resend is configured, send a rich transactional email
    if (resendKey && targetEmails.length > 0) {
      const fromEmail = process.env.SENDER_EMAIL || 'FFS Attendance <onboarding@resend.dev>'
      const appUrl = process.env.APP_URL || 'https://ffs-attendance-system.vercel.app'

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="display: flex; align-items: center; margin-bottom: 20px;">
            <div style="background-color: #0f766e; color: #ffffff; width: 36px; height: 36px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; text-align: center; line-height: 36px; margin-right: 12px;">
              FFS
            </div>
            <h2 style="color: #0f172a; margin: 0; font-size: 18px; font-weight: 8px;">Firm Foundation School</h2>
          </div>

          <h1 style="color: #0f172a; font-size: 20px; font-weight: 800; margin: 0 0 12px;">New Teacher Approval Request</h1>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
            A new teacher has registered on the FFS Attendance System and is awaiting your principal approval:
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; font-size: 14px; color: #0f172a;"><strong>Teacher Name:</strong> ${teacherName || 'Teacher'}</p>
            <p style="margin: 0; font-size: 14px; color: #0f172a;"><strong>Email Address:</strong> ${teacherEmail || 'N/A'}</p>
          </div>

          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
            Please sign in to the Principal Dashboard to review and approve their account under <strong>Principal Controls &rarr; Manage Teachers</strong>.
          </p>

          <div style="margin-bottom: 28px;">
            <a href="${appUrl}" style="background-color: #0f766e; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">
              Open Attendance Dashboard
            </a>
          </div>

          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0 16px;" />
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
            CAC Youth Fellowship · Firm Foundation School (FFS) Attendance System
          </p>
        </div>
      `

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: targetEmails,
          subject: `FFS Attendance: Approval Request for ${teacherName || 'New Teacher'}`,
          html: emailHtml,
        }),
      })

      const resendData = await resendRes.json()
      return res.status(resendRes.status).json({ ok: resendRes.ok, data: resendData })
    }

    // 2. If a generic notification webhook is configured
    if (notificationWebhook) {
      await fetch(notificationWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'teacher_signup_approval',
          teacherName,
          teacherEmail,
          timestamp: new Date().toISOString(),
        }),
      })
      return res.status(200).json({ ok: true, dispatched: 'webhook' })
    }

    // 3. Fallback: Provider not configured yet (client handles mailto)
    return res.status(200).json({
      ok: true,
      dispatched: false,
      message: 'No email service configured. Use direct mailto link.',
    })
  } catch (err) {
    console.error('Notify principal error:', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
}

