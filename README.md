# FFS Attendance System

A purpose-built attendance tracking system for church classes and units, designed for mobile-first kiosk check-in, teacher management, and principal oversight.

---

## Features

- **Kiosk-Style Check-in**: Teachers open an attendance room on their phone/tablet and hand it to students. Students search by name or matric number, confirm their identity via a pop-up dialog, and check in.
- **Event-Driven Rooms**: Every check-in belongs to an event session (scheduled, open, or closed). Only one attendance room may be open at a time.
- **Role-Based Access**:
  - **Teachers**: Add/edit students, create events, open attendance rooms, supervise kiosk check-ins, and undo erroneous marks.
  - **Principals**: All teacher capabilities plus approving/disapproving teacher accounts, student management, and attendance dashboards.
  - **Students**: Never authenticate and have no passwords. They interact exclusively through the supervised check-in kiosk.
- **Principal Attendance Dashboard**:
  - Event turnout rates and breakdowns (who was present vs. absent).
  - Student attendance consistency rates across timeframes.
  - Consecutive absence tracking for proactive pastoral follow-up.
  - Clean CSV/Excel exports with UTF-8 BOM encoding.
- **Africa/Lagos Timezone (UTC+1)**: All dates, event dates, and timestamps are strictly handled in Lagos time.

---

## Environment Variables

The frontend requires two environment variables provided by Supabase:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

> **Note**: Never expose or commit the Supabase `service_role` key to this repository. The application uses only the public anonymous key (`VITE_SUPABASE_ANON_KEY`) paired with strict Row Level Security (RLS) in Postgres.

See `.env.example` for reference.

---

## Local Development

### 1. Prerequisites
- Node.js (v18 or later recommended)
- npm

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
Create a `.env` file in the project root:
```bash
cp .env.example .env
```
Fill in your Supabase project URL and public anon key in `.env`.

### 4. Start local development server
```bash
npm run dev
```

### 5. Build for production
```bash
npm run build
```

### 6. Lint
```bash
npm run lint
```

---

## Database Setup & Migration Order

Execute the SQL migration files in the Supabase Dashboard SQL Editor (`Dashboard -> SQL Editor -> New query`) strictly in this numbered order:

1. `supabase/migrations/01_teacher_signup_approval.sql`
   - Sets up `profiles` table, approval workflows, profile creation trigger, and base RLS policies.
2. `supabase/migrations/02_students_and_matric.sql`
   - Configures `students` table, case-insensitive unique matric indices, and attendance linkages.
3. `supabase/migrations/03_add_email_to_profiles.sql`
   - Adds email tracking to profiles and allows principals to review/disapprove registrations.
4. `supabase/migrations/04_events_and_attendance_rooms.sql`
   - Sets up `events` table, event status triggers, open-room constraints, and attendance check-in rules.
5. `supabase/migrations/05_production_security_hardening.sql`
   - Hardens database integrity, prevents unauthorized role escalation, enforces principal-only student deletions, and locks down public permissions.

### Creating the 2 Principal Accounts in the Backend
Principals do not need to sign up through the website. You can create both accounts directly in the Supabase dashboard:

1. In Supabase Dashboard, go to **Authentication** -> **Users** -> click **Add user** -> **Create user**.
2. Enter the principal's email and set their initial password (toggle **Auto Confirm User** on so they don't need email verification).
3. The database trigger automatically creates their row in `public.profiles`.
4. Go to **Table Editor** -> **`profiles`** (or use the SQL editor below) and set:
   - `role` = `'principal'`
   - `approved` = `true`
   - `full_name` = the principal's actual name

Or run this once in the SQL Editor after creating the two users:

```sql
update public.profiles
set role = 'principal', 
    approved = true, 
    full_name = 'First Principal Name'
where email = 'first_principal@example.com';

update public.profiles
set role = 'principal', 
    approved = true, 
    full_name = 'Second Principal Name'
where email = 'second_principal@example.com';
```

Principals can immediately sign in on the app using these credentials, and can change or reset their password at any time via the **Forgot password?** link on the sign-in screen.

---

## Deployment

### Vercel
1. Import the repository in Vercel.
2. Set Build Command: `npm run build`
3. Set Output Directory: `dist`
4. Add the Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. `vercel.json` is preconfigured to handle SPA client-side routing and security headers.

### Netlify
1. Connect repository in Netlify.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add environment variables under Site configuration > Environment variables.
5. `netlify.toml` and `public/_redirects` are preconfigured.
