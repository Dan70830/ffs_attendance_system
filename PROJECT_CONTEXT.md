# FFS Attendance System: Project Context

Read this file fully before making any change. It describes what the app is, who uses it, how the data is shaped, the rules that must never be broken, and how it should look. When a request I send later conflicts with this file, ask me before proceeding.

---

## 1. What this is

**FFS Attendance System** is a small web app for taking attendance in one unit of a church.

- About 40 to 50 students, a handful of teachers, one or more principals.
- Classes happen about three times a week.
- Used mostly on **phones**, sometimes on tablets and laptops.
- Timezone is **Africa/Lagos (UTC+1)**. All dates and "today" logic must use this timezone, not UTC.

The defining idea is **kiosk-style check-in**: a teacher signs in on their own phone, opens an attendance room for an event, and hands the phone to students. Each student searches for their own name, taps it, and is marked present. Students never log in and never see anything except the check-in screen.

---

## 2. Users and roles

### Students
- **Have no accounts.** They never sign up, never log in, never get passwords.
- They exist only as records created by teachers.
- They interact with the app only through the check-in screen, on a teacher's logged-in device.

### Teachers (admin)
- Create their own account on the sign-in page ("Create account").
- A new teacher account is **not approved** and can do nothing until a principal approves it.
- Once approved, a teacher can:
  - add and edit students
  - create events
  - open and close an event's attendance room
  - open the check-in screen for an open event
  - see who is present and undo a wrong check-in
  - view the full student list and any student's page

### Principals (super admin)
- Can do everything a teacher can.
- Plus: approve new teachers, remove a teacher's access, promote a teacher to principal, and see reports (see section 9).
- The first principal is created manually in the database. After that, principals can promote others from the app.

### Future (do not build unless asked)
Students will later be assigned to individual teachers, and each teacher will see only their own students. Keep a nullable `teacher_id` on students now so this is easy later, but today every approved teacher sees every student.

---

## 3. Core rules (never break these)

1. **Students never authenticate.** Do not add student login, student sign-up, or any student-facing page besides the check-in screen.
2. **No attendance without an open event.** A check-in can only be recorded against an event whose status is `open`.
3. **No double marking.** A student can be marked present only once per event. Enforce this in the database with a unique constraint, not only in the interface.
4. **Matric number identifies a student.** It must be unique (case-insensitive). Two students may share a name, but never a matric number.
5. **Unapproved teachers see no data.** Until approved, they see only a "Waiting for approval" screen.
6. **Security lives in the database.** Use row-level security. Never rely on hiding buttons.
7. **Never expose full matric numbers on the check-in screen.** Students see other students' names there, so show only the last three characters of a matric number.
8. **Do not delete history.** Removing a teacher's access sets `approved = false`; it never deletes their past attendance records.

---

## 4. Data model

If these tables already exist in the connected database, update them to match. Do not drop existing data.

### profiles
One row per teacher or principal, linked to the auth user.

| Column | Type | Notes |
|---|---|---|
| id | uuid, primary key | same as the auth user id |
| full_name | text, required | |
| role | text | `teacher` or `principal`, default `teacher` |
| approved | boolean | default `false` |
| created_at | timestamp | |

A profile is created automatically when someone signs up, using the full name entered on the sign-up form.

### students
| Column | Type | Notes |
|---|---|---|
| id | uuid, primary key | |
| full_name | text, required | |
| matric_no | text | unique ignoring case; required for new students in the app, nullable in the database so older records still work |
| detail | text, optional | short note to tell same-named students apart, for example an age group or a surname initial |
| teacher_id | uuid, nullable | reserved for the future teacher assignment feature |
| active | boolean | default `true` |
| created_at | timestamp | |

### events
| Column | Type | Notes |
|---|---|---|
| id | uuid, primary key | |
| title | text, required | for example "Sunday class" |
| event_date | date, required | Lagos date |
| status | text | `scheduled`, `open` or `closed`; default `scheduled` |
| created_by | uuid | the teacher who created it |
| opened_at | timestamp, nullable | set when the room is opened |
| closed_at | timestamp, nullable | set when the room is closed |
| created_at | timestamp | |

### attendance
| Column | Type | Notes |
|---|---|---|
| id | uuid, primary key | |
| event_id | uuid | references events |
| student_id | uuid | references students |
| marked_by | uuid | the teacher whose device was used |
| created_at | timestamp | |

Unique constraint on `(event_id, student_id)`.

If old attendance rows exist that have a date but no event, create one closed event per distinct date and link the rows to it. Do not lose any of them.

---

## 5. Security (row-level security)

Enable row-level security on every table. Required behaviour:

- Only **logged-in and approved** users can read or write `students`, `events` and `attendance`.
- An attendance row can be inserted only when the related event's status is `open`, and only with `marked_by` equal to the signed-in user.
- Approved users can delete an attendance row (this is the undo action).
- Everyone signed in can read `profiles` (names are needed for display).
- Only **principals** can change another user's `role` or `approved` value. A user must never be able to change their own role or approval.
- Only principals can delete students.

---

## 6. Screens and flows

### 6.1 Sign in / Create account
- One page with two tabs: **Sign in** and **Create account**.
- Create account asks for full name, email and password (minimum 6 characters).
- After creating an account, the teacher lands on the Waiting for approval screen.
- Sign-in errors say "Email or password is incorrect." Do not reveal which one is wrong.

### 6.2 Waiting for approval
- Shown to any signed-in user who is not approved.
- Short explanation, a **Check again** button and a **Sign out** button.
- No student data is loaded on this screen.

### 6.3 Home (teachers and principals)
- Greeting with first name and role, and today's date.
- Today's events, each showing status and number present, with a clear way to open or create one.
- Past events list.
- **Add a student** form: full name, matric number (required), optional detail.
- **All students** list: count, search box that matches name or matric number, each row showing name, matric number and detail. Tapping a row opens the student page.
- Principals also see a **Manage teachers** entry point and, later, **Reports**.
- Sign out button.

### 6.4 Event page
- Event title, date and status.
- Buttons: **Open attendance room**, **Close room** (and reopen after closing).
- Opening the room records `opened_at`; closing records `closed_at`.
- List of students present, with a count and an **Undo** button on each.
- When the room is open, a prominent **Open check-in screen** button.

### 6.5 Check-in screen (the kiosk)
Only available for an event whose room is open. If the room is closed, show "This attendance room is closed."

- Large search box, focused automatically.
- Search starts after **two characters** and matches the start of the full name, the start of any word in the name, or the start of the matric number.
- Show up to 8 matches as large tappable buttons (one column on phones, two on wider screens). Under each name show the `detail` and "Matric ends 482" (last three characters only).
- Tapping a name marks that student present for the event.
- **Success:** full-screen green message "Thank you, [first name]. You are marked present." with a check icon, for about 2.5 seconds, then the screen resets.
- **Already marked:** full-screen yellow message "[first name], you have already marked attendance for this event."
- **Error:** full-screen red message "Something went wrong. Please tell your teacher."
- If nothing matches: "No name found. Check the spelling or ask your teacher to add you."
- No menu, no links, no other student data on this screen.
- **Teacher exit:** a small button that asks for the teacher's password. Only a correct password returns to the home screen.

### 6.6 Student page
- Name, matric number and detail, editable by teachers and principals. Saving a duplicate matric number shows "That matric number belongs to another student."
- Attendance history: every event the student was present at, with the event title and date, newest first, plus a total count.
- Students with no matric number yet show "No matric number yet" and remain fully usable.

### 6.7 Manage teachers (principals only)
- **Waiting for approval:** each person with an **Approve** button.
- **Active:** each teacher with **Make principal** (confirm first) and **Remove access** (sets `approved = false`).
- Principals appear in the list without those buttons.

---

## 7. Design system

### Feel
Calm, clear and professional. It should look like a purpose-built tool for a small organisation, not a generated template.

### Colours
| Role | Name | Hex |
|---|---|---|
| Primary | Brand teal | `#0b5d5b` |
| Primary hover | Dark teal | `#084543` |
| Text | Ink | `#0d2321` |
| Page background | Mist | `#f2f5f4` |
| Borders | Line | `#d5dedc` |
| Warning | Sun yellow | `#f5c84c` |
| Success | Green | `#1e8e4f` |
| Error | Red | `#b91c1c` |

Cards and inputs are white on the mist background. Use the brand teal for primary actions and the header panel on the sign-in page.

### Typography
- **Manrope**, weights 400 to 800, for everything.
- Page headings 800 weight. Body 400 to 500. Buttons 700.
- Keep line lengths short and sentences in sentence case.

### Shape and spacing
- Small to medium corner radius (about 6 to 12 px). Do not use one identical large radius everywhere.
- Plain 1 px borders instead of heavy shadows.
- Generous spacing. Touch targets at least 44 px tall.

### Icons
Use a distinctive icon set such as Phosphor or Iconoir. **Do not use default Lucide icons and do not use emojis as icons.**

### Things to avoid (these make an app look generated)
- Gradients, glowing backgrounds, glassmorphism.
- Animation or hover effects on every element. Motion is only for confirming an action, such as the check-in result screen.
- Rows of three identical rounded feature cards.
- The default shadcn colour palette.
- Generic copy like "Elevate your experience" or "Unlock your potential".
- All-caps labels and small decorative eyebrow labels above headings.

### Copy
Write plain sentences that say exactly what a screen does or what went wrong and how to fix it. Buttons name the action ("Open attendance room", "Save student"). The same action keeps the same name everywhere. Errors do not apologise and are never vague.

The app name is written **FFS Attendance System**.

---

## 8. Responsive and adaptive requirements

Design **mobile first**, then enhance for larger screens. Every screen must work from a 360 px phone up to a wide laptop.

- **Phones:** single column, large touch targets, no horizontal scrolling.
- **Tablets:** two-column lists and grids where it helps.
- **Laptops:** the home screen can split into a two-column layout (actions on the left, lists on the right) with a maximum content width of about 1150 px.
- The check-in screen must scale its text and buttons up on large tablets so students can read it from arm's length.
- Respect the device's safe areas on phones.
- Keyboard focus must always be visible. Text and buttons must have enough contrast.

---

## 9. Reports (planned, build only when asked)

For principals only, in this order of priority:

1. Attendance per event: who came, who did not, total count.
2. Attendance rate per student across a chosen date range.
3. Students who have missed several events in a row, so someone can follow up.
4. Export of any of these to Excel or CSV.

These are derived from the existing tables. Do not add extra columns for them.

---

## 10. Build order

Features are built one at a time. Do only the one I ask for in each message, and do not change or remove other features.

1. Teacher sign-up, approval and roles
2. Students with matric numbers, the all-students list and the student page
3. Events and attendance rooms
4. Check-in screen for an open event
5. Principal reports and Excel export
6. Later: assigning students to teachers, bulk student import, offline support

---

## 11. Working rules for the agent

- Read this file first. Follow it unless I say otherwise in a message.
- Implement only what I ask in each message.
- Never delete or overwrite existing data. If a change needs a database migration, show me the migration and keep existing rows working.
- Enforce rules in the database, not just in the interface.
- After each change, tell me in plain language what changed and how to test it, in a few short steps.
- If something in a request is unclear or conflicts with this file, ask one short question before building.
- Do not add features, pages or settings I did not ask for.

---

## 12. Acceptance checklist

A feature is only done when all of these are true:

- It works on a 360 px phone and on a laptop.
- A teacher who is not approved cannot read or change any student, event or attendance data.
- A student cannot be marked twice for the same event.
- Attendance cannot be added to an event that is not open.
- Nothing on the check-in screen shows a full matric number or any data beyond names, details and the last three matric characters.
- The visual rules in section 7 are followed.
