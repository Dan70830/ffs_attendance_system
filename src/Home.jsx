import { useEffect, useState } from 'react'
import { supabase, today } from './supabase'
import {
  UserPlusIcon,
  UsersIcon,
  SearchIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  PlusIcon,
  CalendarIcon,
  DoorOpenIcon,
  CheckCircleIcon,
  DashboardIcon,
  GraduationCapIcon,
  LayersIcon,
  BellIcon,
  BookOpenIcon,
  TrashIcon,
  WhatsAppIcon,
} from './Icons'
import GroupBadge from './GroupBadge'
import { getWhatsAppUrl } from './whatsapp'

function formatLagosDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(`${dateStr}T12:00:00`)
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Africa/Lagos',
  })
}

function formatFullHeaderDate() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  })
}

function getLagosGreeting() {
  const hour = parseInt(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Africa/Lagos',
    }).format(new Date()),
    10
  )
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Home({
  profile,
  currentTab = 'overview',
  onTabChange,
  onOpenDashboard,
  onOpenAttendance,
  onManageTeachers,
  onManageGroups,
  onSelectStudent,
  onSelectEvent,
  onCountsLoaded,
}) {
  const [events, setEvents] = useState([])
  const [students, setStudents] = useState([])
  const [groups, setGroups] = useState([])
  const [teachers, setTeachers] = useState([])
  const [internalTab, setInternalTab] = useState(currentTab || 'overview')
  const activeTab = currentTab || internalTab

  function setTab(tab) {
    setInternalTab(tab)
    if (onTabChange) onTabChange(tab)
  }

  const [groupFilter, setGroupFilter] = useState('all') // 'all' | 'unassigned' | groupId
  const [studentSearch, setStudentSearch] = useState('')
  const [myStudentsSearch, setMyStudentsSearch] = useState('')
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventDate, setNewEventDate] = useState(today())
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [eventError, setEventError] = useState('')
  const [tableMissing, setTableMissing] = useState(false)
  const [attendanceTimeframe, setAttendanceTimeframe] = useState('this_week') // 'this_week' | 'today' | 'this_month' | 'latest'
  const [deleteStudentTarget, setDeleteStudentTarget] = useState(null)
  const [deletingStudent, setDeletingStudent] = useState(false)

  async function handleDeleteStudent(targetStudent) {
    if (!targetStudent) return
    setDeletingStudent(true)
    try {
      const { data, error } = await supabase
        .from('students')
        .delete()
        .eq('id', targetStudent.id)
        .select('id')

      if (error) {
        alert('Could not delete student: ' + error.message)
      } else if (!data || data.length === 0) {
        alert(
          'Student was not deleted in the database (permission blocked). Please ensure the Principal delete policy in supabase/migrations/05_production_security_hardening.sql has been applied in your Supabase SQL Editor.'
        )
      } else {
        setStudents((prev) => prev.filter((s) => s.id !== targetStudent.id))
        setDeleteStudentTarget(null)
      }
    } catch (err) {
      alert('Error deleting student: ' + err.message)
    } finally {
      setDeletingStudent(false)
    }
  }

  useEffect(() => {
    if (onCountsLoaded) {
      const pendingTeachersCount = teachers.filter((t) => !t.approved).length
      const assignedGroupIds = new Set(
        groups.filter((g) => g.lead_teacher_id === profile?.id).map((g) => g.id)
      )
      const myCount = students.filter(
        (s) => s.group_id && assignedGroupIds.has(s.group_id)
      ).length

      onCountsLoaded({
        students: students.length,
        groups: groups.length,
        pendingTeachers: pendingTeachersCount,
        myAssignedStudentsCount: myCount,
      })
    }
  }, [students, groups, teachers, profile?.id, onCountsLoaded])

  // Add student form state
  const [name, setName] = useState('')
  const [matricNo, setMatricNo] = useState('')
  const [phone, setPhone] = useState('')
  const [detail, setDetail] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [addMsg, setAddMsg] = useState('')
  const [addError, setAddError] = useState('')
  const [savingStudent, setSavingStudent] = useState(false)

  async function loadEvents() {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, event_date, status, created_by, opened_at, closed_at, attendance(id, created_at, student_id)')
      .order('event_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error && error.code === 'PGRST205') {
      setTableMissing(true)
    } else if (data) {
      setTableMissing(false)
      setEvents(data)
    }
  }

  async function loadStudents() {
    const { data } = await supabase
      .from('students')
      .select('id, full_name, matric_no, phone, detail, active, created_at, group_id, student_groups(id, name, color)')
      .eq('active', true)
      .order('full_name')

    if (data) {
      setStudents(data)
    }
  }

  async function loadGroups() {
    const { data } = await supabase
      .from('student_groups')
      .select('id, name, color, lead_teacher_id')
      .eq('active', true)
      .order('name')

    if (data) {
      setGroups(data)
    }
  }

  async function loadTeachers() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, approved')
      .order('full_name')

    if (data) {
      setTeachers(data)
    }
  }

  useEffect(() => {
    let mounted = true
    async function init() {
      await Promise.all([
        loadEvents(),
        loadStudents(),
        loadGroups(),
        loadTeachers(),
      ])
      if (!mounted) return
    }
    init()
    return () => {
      mounted = false
    }
  }, [])

  async function handleCreateEvent(e) {
    e.preventDefault()
    setEventError('')

    const title = newEventTitle.trim()
    if (!title) {
      setEventError('Event title is required.')
      return
    }

    setCreatingEvent(true)

    const { data, error } = await supabase
      .from('events')
      .insert({
        title,
        event_date: newEventDate,
        status: 'scheduled',
        created_by: profile.id,
      })
      .select()
      .single()

    setCreatingEvent(false)

    if (error) {
      if (error.code === 'PGRST205') {
        setEventError('Events table not found. Please run the database migration in Supabase SQL editor.')
      } else {
        setEventError('Could not create event. Please try again.')
      }
    } else {
      setNewEventTitle('')
      setNewEventDate(today())
      setShowCreateEvent(false)
      loadEvents()
      if (data) {
        onSelectEvent(data)
      }
    }
  }

  async function addStudent(e) {
    e.preventDefault()
    setAddError('')
    setAddMsg('')

    const cleanName = name.trim()
    const cleanMatric = matricNo.trim() || null
    const cleanPhone = phone.trim() || null
    const cleanDetail = detail.trim() || null

    if (!cleanName) {
      setAddError('Full name is required.')
      return
    }

    setSavingStudent(true)

    if (cleanMatric) {
      const { data: existing } = await supabase
        .from('students')
        .select('id, matric_no')
        .ilike('matric_no', cleanMatric)

      if (existing && existing.length > 0) {
        setAddError('A student with that matric number already exists.')
        setSavingStudent(false)
        return
      }
    }

    const { error } = await supabase.from('students').insert({
      full_name: cleanName,
      matric_no: cleanMatric,
      phone: cleanPhone,
      detail: cleanDetail,
      group_id: selectedGroupId || null,
      active: true,
    })

    setSavingStudent(false)

    if (error) {
      if (error.code === '23505' || error.message?.toLowerCase().includes('matric')) {
        setAddError('A student with that matric number already exists.')
      } else {
        setAddError('Could not add the student. Try again.')
      }
    } else {
      setAddMsg(`${cleanName} was added successfully.`)
      setName('')
      setMatricNo('')
      setPhone('')
      setDetail('')
      setSelectedGroupId('')
      loadStudents()
      loadGroups()
      setTimeout(() => {
        setAddMsg('')
        setShowAddStudent(false)
      }, 1500)
    }
  }

  const isPrincipal = profile?.role === 'principal'
  const first = (profile?.full_name || (isPrincipal ? 'Principal' : 'Teacher')).split(' ')[0]

  const todayStr = today()
  const todaysEvents = events.filter((e) => e.event_date === todayStr)
  const pastEvents = events.filter((e) => e.event_date < todayStr)
  const openRoomToday = todaysEvents.find((e) => e.status === 'open')
  const myAssignedGroups = groups.filter((g) => g.lead_teacher_id === profile?.id)
  const myLeadGroup = myAssignedGroups[0] || null
  const myAssignedGroupIds = new Set(myAssignedGroups.map((g) => g.id))
  const myAssignedStudents = students.filter(
    (s) => s.group_id && myAssignedGroupIds.has(s.group_id)
  )

  const eligibleEvents = events.filter(
    (e) => e.status !== 'scheduled' || (e.attendance && e.attendance.length > 0)
  )

  function getStudentScore(studentId) {
    const total = eligibleEvents.length
    if (total === 0) return { attended: 0, total: 0, pct: 0 }
    const attended = eligibleEvents.filter((e) =>
      e.attendance?.some((a) => a.student_id === studentId)
    ).length
    return {
      attended,
      total,
      pct: Math.round((attended / total) * 100),
    }
  }

  const filteredMyAssignedStudents = myAssignedStudents.filter((s) => {
    if (!myStudentsSearch.trim()) return true
    const q = myStudentsSearch.trim().toLowerCase()
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.matric_no?.toLowerCase().includes(q) ||
      s.detail?.toLowerCase().includes(q)
    )
  })

  const unassignedStudentsCount = students.filter((s) => !s.group_id).length
  const approvedTeachersCount = teachers.filter((t) => t.approved).length
  const pendingTeachersCount = teachers.filter((t) => !t.approved).length

  // Attendance rate calculations for the Donut Chart (Present vs Absent only)
  function computeOverviewMetrics() {
    const totalStudents = students.length

    // If no students registered in the system
    if (totalStudents === 0) {
      return {
        presentCount: 0,
        absentCount: 0,
        presentPct: 0,
        absentPct: 0,
      }
    }

    // Determine target events based on timeframe
    let targetEvents
    if (attendanceTimeframe === 'today') {
      targetEvents = todaysEvents
    } else if (attendanceTimeframe === 'this_week') {
      const now = new Date()
      const dayOfWeek = now.getDay() || 7 // 1 is Monday, 7 is Sunday
      const monday = new Date(now)
      monday.setDate(now.getDate() - dayOfWeek + 1)
      const mondayStr = monday.toISOString().split('T')[0]
      targetEvents = events.filter((e) => e.event_date >= mondayStr && e.event_date <= todayStr)
      // Fallback: if no sessions occurred this week yet, use the most recent event with attendance or latest event
      if (targetEvents.length === 0 && events.length > 0) {
        const withAtt = events.find((e) => (e.attendance?.length || 0) > 0)
        targetEvents = [withAtt || events[0]]
      }
    } else if (attendanceTimeframe === 'this_month') {
      const monthPrefix = todayStr.slice(0, 7) // YYYY-MM
      targetEvents = events.filter((e) => e.event_date.startsWith(monthPrefix))
      if (targetEvents.length === 0 && events.length > 0) {
        const withAtt = events.find((e) => (e.attendance?.length || 0) > 0)
        targetEvents = [withAtt || events[0]]
      }
    } else {
      // 'latest'
      const withAtt = events.find((e) => (e.attendance?.length || 0) > 0)
      targetEvents = [withAtt || events[0] || null].filter(Boolean)
    }

    if (!targetEvents || targetEvents.length === 0) {
      return {
        presentCount: 0,
        absentCount: totalStudents,
        presentPct: 0,
        absentPct: 100,
      }
    }

    // Collect unique student IDs marked present across target event(s)
    const presentStudentIds = new Set()
    targetEvents.forEach((evt) => {
      ;(evt.attendance || []).forEach((rec) => {
        if (rec.student_id) {
          presentStudentIds.add(rec.student_id)
        }
      })
    })

    const presentCount = Math.min(totalStudents, presentStudentIds.size)
    const absentCount = Math.max(0, totalStudents - presentCount)
    const presentPct = Math.round((presentCount / totalStudents) * 100)
    const absentPct = Math.max(0, 100 - presentPct)

    return {
      presentCount,
      absentCount,
      presentPct,
      absentPct,
    }
  }

  const overviewMetrics = computeOverviewMetrics()

  // Filtered students for student directory tab
  const searchTerm = studentSearch.trim().toLowerCase()
  const filteredStudents = students.filter((s) => {
    if (groupFilter === 'unassigned') {
      if (s.group_id) return false
    } else if (groupFilter !== 'all') {
      if (s.group_id !== groupFilter) return false
    }

    if (!searchTerm) return true
    const nameMatch = s.full_name?.toLowerCase().includes(searchTerm)
    const matricMatch = s.matric_no?.toLowerCase().includes(searchTerm)
    const phoneMatch = s.phone?.toLowerCase().includes(searchTerm)
    const detailMatch = s.detail?.toLowerCase().includes(searchTerm)
    const groupNameMatch = s.student_groups?.name?.toLowerCase().includes(searchTerm)
    return nameMatch || matricMatch || phoneMatch || detailMatch || groupNameMatch
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* Database Setup Banner (if events table missing) */}
      {tableMissing && (
        <div className="rounded-xl border border-sun bg-sun/15 p-4 text-xs font-semibold text-ink">
          <p className="text-sm font-extrabold">Database setup required:</p>
          <p className="mt-1 text-ink/80">
            The events table has not been created yet in your Supabase database. Please execute the SQL migrations in your Supabase SQL editor.
          </p>
        </div>
      )}

      {/* Top Page Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-0.5 text-xs text-ink/65 sm:text-sm">
            Overview of attendance and school activities.
          </p>
        </div>

        {/* Right utility buttons: Lagos Date Pill & Notification Bell */}
        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-2xs">
            <CalendarIcon className="h-4 w-4 text-ink/50" />
            <span>{formatFullHeaderDate()}</span>
          </div>

          <div className="relative">
            <button
              type="button"
              title="Notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white text-ink/65 shadow-2xs hover:bg-mist transition-colors cursor-pointer"
            >
              <BellIcon className="h-4 w-4" />
              {openRoomToday && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-ok animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Tab Segmented Switcher (< 1024px) */}
      <div className="flex rounded-xl border border-line bg-white p-1 shadow-2xs lg:hidden">
        <button
          type="button"
          onClick={() => setTab('overview')}
          className={`flex flex-1 min-h-[38px] items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-brand text-white shadow-xs'
              : 'text-ink/65 hover:text-ink'
          }`}
        >
          <DashboardIcon className="h-4 w-4" />
          <span>Dashboard</span>
        </button>

        {/* Assigned Group (Between Dashboard and Students for Teachers) */}
        {!isPrincipal && (
          <button
            type="button"
            onClick={() => setTab('assigned-group')}
            className={`flex flex-1 min-h-[38px] items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'assigned-group'
                ? 'bg-brand text-white shadow-xs'
                : 'text-ink/65 hover:text-ink'
            }`}
          >
            <LayersIcon className="h-4 w-4" />
            <span>My Group</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setTab('students')}
          className={`flex flex-1 min-h-[38px] items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'students'
              ? 'bg-brand text-white shadow-xs'
              : 'text-ink/65 hover:text-ink'
          }`}
        >
          <UsersIcon className="h-4 w-4" />
          <span>Students</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* VIEW: OVERVIEW (Default Dashboard)                           */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Welcome Hero Card */}
              <section className="rounded-2xl border border-line bg-white p-5 sm:p-7 relative overflow-hidden shadow-2xs">
                {/* Soft mint base gradient from white on the left to calm mint-teal on the right */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white via-[#f6faf8] to-[#e7f4f0]" />

                {/* Flowing Organic Wave Ribbons on the right */}
                <svg
                  className="pointer-events-none absolute right-0 top-0 h-full w-full sm:w-3/5 lg:w-1/2 object-cover overflow-hidden opacity-40 sm:opacity-85 transition-opacity"
                  viewBox="0 0 500 200"
                  preserveAspectRatio="none"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="mint-grad-1" x1="500" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#0b5d5b" stopOpacity="0.14" />
                      <stop stopColor="#10b981" stopOpacity="0.04" />
                    </linearGradient>
                    <linearGradient id="mint-grad-2" x1="450" y1="20" x2="160" y2="180" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#10b981" stopOpacity="0.16" />
                      <stop stopColor="#34d399" stopOpacity="0.05" />
                    </linearGradient>
                    <linearGradient id="mint-grad-3" x1="500" y1="100" x2="300" y2="200" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#059669" stopOpacity="0.11" />
                      <stop stopColor="#6ee7b7" stopOpacity="0.03" />
                    </linearGradient>
                  </defs>

                  {/* Organic Layer 1 - Deep Background Flow */}
                  <path
                    d="M180 0C250 80 320 20 420 70C470 95 490 60 500 40V200H220C280 160 310 110 240 70C200 45 185 20 180 0Z"
                    fill="url(#mint-grad-1)"
                  />

                  {/* Organic Layer 2 - Translucent Ribbon Wave */}
                  <path
                    d="M260 0C320 60 360 40 430 85C480 115 495 100 500 90V200H320C380 150 370 90 320 60C290 40 270 20 260 0Z"
                    fill="url(#mint-grad-2)"
                  />

                  {/* Organic Layer 3 - Foreground Soft Swell */}
                  <path
                    d="M340 0C390 50 430 45 470 90C490 112 498 130 500 140V200H400C450 160 440 100 390 70C365 52 350 25 340 0Z"
                    fill="url(#mint-grad-3)"
                  />

                  {/* Delicate Wave Lines for Elegance & Depth */}
                  <path
                    d="M210 0C285 75 350 30 440 78C480 98 495 88 500 82"
                    stroke="#10b981"
                    strokeOpacity="0.22"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M295 0C355 65 390 48 460 92C485 108 495 102 500 98"
                    stroke="#0b5d5b"
                    strokeOpacity="0.16"
                    strokeWidth="1"
                    strokeLinecap="round"
                  />
                </svg>

                <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-xl font-black text-ink sm:text-2xl">
                        {getLagosGreeting()}, {first}
                      </h2>
                      <span className="rounded-full bg-brand/10 border border-brand/20 px-2.5 py-0.5 text-xs font-extrabold text-brand">
                        {isPrincipal ? 'Principal' : 'Teacher'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs sm:text-sm text-ink/70">
                      Here&apos;s what&apos;s happening at Firm Foundation School today.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowCreateEvent(true)}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-2xs hover:bg-brand-dark transition-all cursor-pointer active:scale-95"
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span>Create event</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddError('')
                        setAddMsg('')
                        setShowAddStudent(true)
                      }}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-xs sm:text-sm font-bold text-ink shadow-2xs hover:bg-mist transition-all cursor-pointer active:scale-95"
                    >
                      <UserPlusIcon className="h-4 w-4 text-ink/65" />
                      <span>Add student</span>
                    </button>
                  </div>
                </div>
              </section>

              {/* 4 High-Level KPI Summary Cards */}
              <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {isPrincipal ? (
                  <>
                    {/* 1. Total Students */}
                    <div
                      onClick={() => setTab('students')}
                      className="flex flex-col justify-between rounded-xl border border-line bg-white p-4 sm:p-5 shadow-2xs hover:border-brand/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand shadow-2xs">
                          <UsersIcon className="h-5 w-5" />
                        </span>
                        <span className="text-xs font-bold text-ink/50">Students</span>
                      </div>
                      <div className="mt-4">
                        <p className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
                          {students.length}
                        </p>
                        <p className="mt-0.5 text-xs font-bold text-emerald-700">
                          ↑ All active roster
                        </p>
                      </div>
                    </div>

                    {/* 2. Student Groups */}
                    <div
                      onClick={onManageGroups}
                      className="flex flex-col justify-between rounded-xl border border-line bg-white p-4 sm:p-5 shadow-2xs hover:border-brand/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand shadow-2xs">
                          <LayersIcon className="h-5 w-5" />
                        </span>
                        <span className="text-xs font-bold text-ink/50">Groups</span>
                      </div>
                      <div className="mt-4">
                        <p className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
                          {groups.length}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-ink/60 truncate">
                          {unassignedStudentsCount > 0
                            ? `${unassignedStudentsCount} unassigned`
                            : 'All assigned'}
                        </p>
                      </div>
                    </div>

                    {/* 3. Teachers */}
                    <div
                      onClick={onManageTeachers}
                      className="flex flex-col justify-between rounded-xl border border-line bg-white p-4 sm:p-5 shadow-2xs hover:border-brand/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand shadow-2xs">
                          <GraduationCapIcon className="h-5 w-5" />
                        </span>
                        <span className="text-xs font-bold text-ink/50">Teachers</span>
                      </div>
                      <div className="mt-4">
                        <p className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
                          {approvedTeachersCount || 1}
                        </p>
                        <p
                          className={`mt-0.5 text-xs font-bold truncate ${
                            pendingTeachersCount > 0 ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          {pendingTeachersCount > 0
                            ? `↑ ${pendingTeachersCount} pending approval`
                            : 'All approved'}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Teacher Card 1: My Assigned Students */}
                    <div
                      onClick={() => setTab('assigned-group')}
                      className="flex flex-col justify-between rounded-xl border border-line bg-white p-4 sm:p-5 shadow-2xs hover:border-brand/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand shadow-2xs">
                          <UsersIcon className="h-5 w-5" />
                        </span>
                        <span className="text-xs font-bold text-ink/50">My Students</span>
                      </div>
                      <div className="mt-4">
                        <p className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
                          {myAssignedStudents.length}
                        </p>
                        <p className="mt-0.5 text-xs font-bold text-emerald-700 truncate">
                          {myLeadGroup ? `Assigned to ${myLeadGroup.name}` : 'No group assigned'}
                        </p>
                      </div>
                    </div>

                    {/* Teacher Card 2: My Assigned Group */}
                    <div
                      onClick={() => setTab('assigned-group')}
                      className="flex flex-col justify-between rounded-xl border border-line bg-white p-4 sm:p-5 shadow-2xs hover:border-brand/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-xl shadow-2xs text-white"
                          style={{ backgroundColor: myLeadGroup?.color || '#0b5d5b' }}
                        >
                          <LayersIcon className="h-5 w-5" />
                        </span>
                        <span className="text-xs font-bold text-ink/50">My Group</span>
                      </div>
                      <div className="mt-4">
                        <p className="text-xl font-black tracking-tight text-ink sm:text-2xl truncate">
                          {myLeadGroup ? myLeadGroup.name : 'None'}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-ink/60 truncate">
                          {myLeadGroup ? 'You are Group Head' : 'Not assigned'}
                        </p>
                      </div>
                    </div>

                    {/* Teacher Card 3: School Total */}
                    <div
                      onClick={() => {
                        setTab('students')
                        setGroupFilter('all')
                      }}
                      className="flex flex-col justify-between rounded-xl border border-line bg-white p-4 sm:p-5 shadow-2xs hover:border-brand/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand shadow-2xs">
                          <GraduationCapIcon className="h-5 w-5" />
                        </span>
                        <span className="text-xs font-bold text-ink/50">School Total</span>
                      </div>
                      <div className="mt-4">
                        <p className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
                          {students.length}
                        </p>
                        <p className="mt-0.5 text-xs font-bold text-emerald-700 truncate">
                          Active students list
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* 4. Today's Sessions (Shared) */}
                <div
                  onClick={onOpenAttendance || onOpenDashboard}
                  className="flex flex-col justify-between rounded-xl border border-line bg-white p-4 sm:p-5 shadow-2xs hover:border-brand/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand shadow-2xs">
                      <CalendarIcon className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-bold text-ink/50">Sessions</span>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
                      {todaysEvents.length}
                    </p>
                    <p
                      className={`mt-0.5 text-xs font-bold truncate ${
                        openRoomToday ? 'text-emerald-700' : 'text-ink/60'
                      }`}
                    >
                      {openRoomToday ? '● 1 session live' : 'No rooms open'}
                    </p>
                  </div>
                </div>
              </section>

              {/* Middle Row: Today's Sessions & Attendance Overview Donut Chart */}
              <div className="grid gap-6 lg:grid-cols-12">
                {/* LEFT: Today's Sessions (7 cols on Desktop) */}
                <section className="rounded-xl border border-line bg-white p-5 shadow-2xs lg:col-span-7 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-line pb-3.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-ink">Today&apos;s Sessions</h3>
                        <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-black text-ink/70">
                          {todaysEvents.length}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCreateEvent(true)}
                        className="text-xs font-bold text-brand hover:underline cursor-pointer"
                      >
                        + New session
                      </button>
                    </div>

                    {/* Today's Events Rows */}
                    {todaysEvents.length === 0 ? (
                      <div className="py-8 text-center space-y-2">
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-mist text-ink/40">
                          <BookOpenIcon className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-bold text-ink/70">
                          No sessions scheduled for today yet.
                        </p>
                        <p className="text-[11px] text-ink/50">
                          Create a session to begin taking student attendance.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 divide-y divide-line/70">
                        {todaysEvents.map((evt) => {
                          const count = evt.attendance?.length || 0
                          const isLive = evt.status === 'open'

                          return (
                            <div
                              key={evt.id}
                              onClick={() => onSelectEvent(evt)}
                              className="group flex cursor-pointer items-center justify-between gap-3 py-3 transition-colors hover:bg-mist/40 px-2 rounded-xl"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                                  <BookOpenIcon className="h-5 w-5" />
                                </span>
                                <div className="min-w-0">
                                  <p className="font-extrabold text-ink text-sm truncate group-hover:text-brand">
                                    {evt.title}
                                  </p>
                                  <p className="text-[11px] text-ink/60 truncate">
                                    <span className="font-bold text-brand">{count}</span> marked present · Lagos Time
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {isLive ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Ongoing
                                  </span>
                                ) : evt.status === 'closed' ? (
                                  <span className="rounded-full bg-mist px-2.5 py-0.5 text-[11px] font-bold text-ink/50">
                                    Closed
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-mist px-2.5 py-0.5 text-[11px] font-bold text-ink/65">
                                    Upcoming
                                  </span>
                                )}
                                <ChevronRightIcon className="h-4 w-4 text-ink/30 group-hover:text-brand" />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {openRoomToday && (
                    <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                        <p className="text-xs font-bold text-emerald-900">
                          {openRoomToday.title} is currently open for attendance
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectEvent(openRoomToday)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition-colors"
                      >
                        <DoorOpenIcon className="h-3.5 w-3.5" />
                        <span>Open kiosk</span>
                      </button>
                    </div>
                  )}
                </section>

                {/* RIGHT: Attendance Overview Card (5 cols on Desktop) */}
                <section className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-2xs lg:col-span-5 flex flex-col justify-between">
                  <div>
                    {/* Card Header: Title + Dropdown */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base sm:text-lg font-bold text-ink">
                        Attendance Overview
                      </h3>
                      <div className="relative">
                        <select
                          value={attendanceTimeframe}
                          onChange={(e) => setAttendanceTimeframe(e.target.value)}
                          className="appearance-none rounded-xl border border-line/80 bg-white pl-3.5 pr-8 py-1.5 text-xs font-semibold text-ink/75 shadow-2xs hover:border-brand/40 focus:border-brand cursor-pointer"
                        >
                          <option value="this_week">This Week</option>
                          <option value="today">Today</option>
                          <option value="this_month">This Month</option>
                          <option value="latest">Latest Session</option>
                        </select>
                        <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink/40" />
                      </div>
                    </div>

                    {/* Donut Chart & Legend Composition */}
                    <div className="flex items-center justify-between gap-4 sm:gap-6 py-2">
                      {/* Left: SVG Donut Ring (Present Green & Absent Coral) */}
                      <div className="relative flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 100 100" className="h-32 w-32 -rotate-90 transform">
                          {/* Background Track (Coral Red #f87171 if students exist, else Light Grey #f1f5f9) */}
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke={overviewMetrics.absentCount > 0 ? '#f87171' : '#f1f5f9'}
                            strokeWidth="11"
                            fill="transparent"
                          />
                          {/* Present Segment (Emerald Green #10b981) */}
                          {overviewMetrics.presentPct > 0 && (
                            <circle
                              cx="50"
                              cy="50"
                              r="38"
                              stroke="#10b981"
                              strokeWidth="11"
                              fill="transparent"
                              strokeDasharray={`${(overviewMetrics.presentPct / 100) * 238.761} 238.761`}
                              strokeDashoffset="0"
                            />
                          )}
                        </svg>
                        {/* Center Metric Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                          <span className="text-2xl font-black text-ink leading-tight">
                            {overviewMetrics.presentPct}%
                          </span>
                          <span className="text-xs font-medium text-slate-400">
                            Attendance
                          </span>
                        </div>
                      </div>

                      {/* Right: Legend Breakdown List (Present & Absent only) */}
                      <div className="flex-1 space-y-4 pl-2 sm:pl-4">
                        {/* Present Row */}
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <div className="flex items-center gap-2.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#10b981] shrink-0" />
                            <span className="font-semibold text-ink">Present</span>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4 text-right">
                            <span className="font-bold text-ink min-w-[20px]">{overviewMetrics.presentCount}</span>
                            <span className="font-normal text-slate-400 min-w-[32px]">{overviewMetrics.presentPct}%</span>
                          </div>
                        </div>

                        {/* Absent Row */}
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <div className="flex items-center gap-2.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#f87171] shrink-0" />
                            <span className="font-semibold text-ink">Absent</span>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4 text-right">
                            <span className="font-bold text-ink min-w-[20px]">{overviewMetrics.absentCount}</span>
                            <span className="font-normal text-slate-400 min-w-[32px]">{overviewMetrics.absentPct}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* TEACHER-ONLY SECTION: My Assigned Group & Students */}
              {!isPrincipal && (
                <section className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-2xs space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-2xs"
                        style={{ backgroundColor: myLeadGroup?.color || '#0b5d5b' }}
                      >
                        <UsersIcon className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base sm:text-lg font-black text-ink">
                            My Assigned Group & Students
                          </h3>
                          {myLeadGroup && (
                            <GroupBadge group={myLeadGroup} size="sm" />
                          )}
                        </div>
                        <p className="text-xs text-ink/65 mt-0.5">
                          {myLeadGroup
                            ? `You are assigned as the lead teacher of ${myLeadGroup.name}. Here are the students under your supervision.`
                            : 'You have not been assigned to a student group yet. Contact the principal to be assigned.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {myLeadGroup && (
                        <button
                          type="button"
                          onClick={() => {
                            setTab('students')
                            setGroupFilter(myLeadGroup.id)
                          }}
                          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-line bg-mist/50 px-3 py-1.5 text-xs font-bold text-ink hover:bg-mist transition-colors cursor-pointer"
                        >
                          <span>Full student directory</span>
                          <ChevronRightIcon className="h-3.5 w-3.5 text-ink/60" />
                        </button>
                      )}
                    </div>
                  </div>

                  {myLeadGroup ? (
                    myAssignedStudents.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-line bg-mist/30 p-8 text-center">
                        <p className="text-sm font-bold text-ink">
                          No students placed in {myLeadGroup.name} yet
                        </p>
                        <p className="mt-1 text-xs text-ink/50 max-w-md mx-auto">
                          The principal can place students into your group from Group Management or the Student Directory. Once students are added, they will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Search in assigned students */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="relative flex-1 max-w-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                              <SearchIcon className="h-3.5 w-3.5 text-ink/40" />
                            </div>
                            <input
                              type="text"
                              value={myStudentsSearch}
                              onChange={(e) => setMyStudentsSearch(e.target.value)}
                              placeholder={`Search ${myAssignedStudents.length} assigned students…`}
                              className="w-full rounded-lg border border-line bg-white py-1.5 pl-8 pr-3 text-xs font-medium text-ink placeholder:text-ink/40 focus:border-brand focus:outline-hidden"
                            />
                            {myStudentsSearch && (
                              <button
                                type="button"
                                onClick={() => setMyStudentsSearch('')}
                                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-xs font-bold text-ink/40 hover:text-ink cursor-pointer"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          <span className="text-xs font-bold text-ink/55">
                            Showing {filteredMyAssignedStudents.length} of {myAssignedStudents.length} students
                          </span>
                        </div>

                        {/* Roster table */}
                        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-2xs">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                              <thead className="border-b border-line bg-mist/60 text-xs font-extrabold text-ink/60">
                                <tr>
                                  <th className="px-4 py-3">Student Name</th>
                                  <th className="px-4 py-3">Matric No.</th>
                                  <th className="px-4 py-3">Detail</th>
                                  <th className="px-4 py-3">Group</th>
                                  <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-line">
                                {filteredMyAssignedStudents.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="p-6 text-center text-xs text-ink/50">
                                      No students match your search.
                                    </td>
                                  </tr>
                                ) : (
                                  filteredMyAssignedStudents.map((s) => (
                                    <tr
                                      key={s.id}
                                      onClick={() => onSelectStudent && onSelectStudent(s)}
                                      className="transition-colors hover:bg-mist/40 cursor-pointer"
                                    >
                                      <td className="px-4 py-3 font-extrabold text-ink">
                                        <div className="flex items-center gap-2.5">
                                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-xs font-black text-brand shrink-0">
                                            {s.full_name ? s.full_name.charAt(0).toUpperCase() : '?'}
                                          </span>
                                          <span>{s.full_name}</span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-xs font-semibold text-brand">
                                        {s.matric_no || <span className="italic text-ink/40">No matric</span>}
                                      </td>
                                      <td className="px-4 py-3 text-xs text-ink/65">
                                        {s.detail || '-'}
                                      </td>
                                      <td className="px-4 py-3">
                                        <GroupBadge group={myLeadGroup} size="xs" />
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            if (onSelectStudent) onSelectStudent(s)
                                          }}
                                          className="inline-flex items-center gap-1 rounded-lg bg-mist/80 px-2.5 py-1 text-xs font-bold text-ink hover:bg-line/40 transition-colors cursor-pointer"
                                        >
                                          <span>View history</span>
                                          <ChevronRightIcon className="h-3 w-3 text-ink/60" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="rounded-xl border border-dashed border-line bg-mist/30 p-8 text-center space-y-2">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-mist text-ink/40">
                        <LayersIcon className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-bold text-ink">No group assigned yet</p>
                      <p className="text-xs text-ink/50 max-w-md mx-auto">
                        The principal has not assigned you as head of a student group yet. Once assigned, your group roster and student records will appear right here.
                      </p>
                    </div>
                  )}
                </section>
              )}

              {/* Bottom Row: Recent Events & Quick Actions */}
              <div className="grid gap-6 lg:grid-cols-12">
                {/* LEFT: Recent Events (7 cols on Desktop) */}
                <section className="rounded-xl border border-line bg-white p-5 shadow-2xs lg:col-span-7">
                  <div className="flex items-center justify-between border-b border-line pb-3.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-ink">Recent Events</h3>
                      <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-black text-ink/70">
                        {pastEvents.length}
                      </span>
                    </div>
                    {pastEvents.length > 0 && (
                      <button
                        type="button"
                        onClick={onOpenAttendance || onOpenDashboard}
                        className="text-xs font-bold text-brand hover:underline cursor-pointer"
                      >
                        View all →
                      </button>
                    )}
                  </div>

                  {pastEvents.length === 0 ? (
                    <p className="py-6 text-center text-xs text-ink/50">
                      No previous sessions recorded yet.
                    </p>
                  ) : (
                    <div className="mt-2 divide-y divide-line/60">
                      {pastEvents.slice(0, 4).map((evt) => {
                        const count = evt.attendance?.length || 0

                        return (
                          <div
                            key={evt.id}
                            onClick={() => onSelectEvent(evt)}
                            className="group flex cursor-pointer items-center justify-between gap-3 py-3 transition-colors hover:bg-mist/40 px-2 rounded-xl"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                                <CalendarIcon className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="font-bold text-ink text-sm truncate group-hover:text-brand">
                                  {evt.title}
                                </p>
                                <p className="text-[11px] text-ink/60">
                                  {formatLagosDate(evt.event_date)} · {count} student{count === 1 ? '' : 's'}
                                </p>
                              </div>
                            </div>

                            <span className="rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 shrink-0">
                              Completed
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>

                {/* RIGHT: Quick Actions (5 cols on Desktop) */}
                <section className="rounded-xl border border-line bg-white p-5 shadow-2xs lg:col-span-5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-black text-ink border-b border-line pb-3.5">
                      Quick Actions
                    </h3>

                    {isPrincipal ? (
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        {/* Action 1: Add Student */}
                        <button
                          type="button"
                          onClick={() => {
                            setAddError('')
                            setAddMsg('')
                            setShowAddStudent(true)
                          }}
                          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-line bg-mist/30 p-3 text-center transition-all hover:bg-mist hover:border-brand/30 cursor-pointer group active:scale-95"
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                            <UserPlusIcon className="h-5 w-5" />
                          </span>
                          <span className="text-[11px] font-bold text-ink leading-tight">
                            Add Student
                          </span>
                        </button>

                        {/* Action 2: Approve Teacher */}
                        <button
                          type="button"
                          onClick={onManageTeachers}
                          className="relative flex flex-col items-center justify-center gap-2 rounded-xl border border-line bg-mist/30 p-3 text-center transition-all hover:bg-mist hover:border-brand/30 cursor-pointer group active:scale-95"
                        >
                          {pendingTeachersCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white shadow-xs">
                              {pendingTeachersCount}
                            </span>
                          )}
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                            <GraduationCapIcon className="h-5 w-5" />
                          </span>
                          <span className="text-[11px] font-bold text-ink leading-tight">
                            Approve Teacher
                          </span>
                        </button>

                        {/* Action 3: Manage Groups */}
                        <button
                          type="button"
                          onClick={onManageGroups}
                          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-line bg-mist/30 p-3 text-center transition-all hover:bg-mist hover:border-brand/30 cursor-pointer group active:scale-95"
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                            <LayersIcon className="h-5 w-5" />
                          </span>
                          <span className="text-[11px] font-bold text-ink leading-tight">
                            Manage Groups
                          </span>
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {/* Teacher Action 1: Add Student */}
                        <button
                          type="button"
                          onClick={() => {
                            setAddError('')
                            setAddMsg('')
                            setShowAddStudent(true)
                          }}
                          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-line bg-mist/30 p-3 text-center transition-all hover:bg-mist hover:border-brand/30 cursor-pointer group active:scale-95"
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                            <UserPlusIcon className="h-5 w-5" />
                          </span>
                          <span className="text-[11px] font-bold text-ink leading-tight">
                            Add Student
                          </span>
                        </button>

                        {/* Teacher Action 2: Mark Attendance */}
                        <button
                          type="button"
                          onClick={onOpenAttendance || onOpenDashboard}
                          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-line bg-mist/30 p-3 text-center transition-all hover:bg-mist hover:border-brand/30 cursor-pointer group active:scale-95"
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                            <CalendarIcon className="h-5 w-5" />
                          </span>
                          <span className="text-[11px] font-bold text-ink leading-tight">
                            Mark Attendance
                          </span>
                        </button>

                        {/* Teacher Action 3: My Assigned Group */}
                        <button
                          type="button"
                          onClick={() => setTab('assigned-group')}
                          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-line bg-mist/30 p-3 text-center transition-all hover:bg-mist hover:border-brand/30 cursor-pointer group active:scale-95"
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                            <LayersIcon className="h-5 w-5" />
                          </span>
                          <span className="text-[11px] font-bold text-ink leading-tight">
                            Assigned Group ({myAssignedStudents.length})
                          </span>
                        </button>

                        {/* Teacher Action 4: Create / Manage Groups */}
                        <button
                          type="button"
                          onClick={onManageGroups}
                          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-line bg-mist/30 p-3 text-center transition-all hover:bg-mist hover:border-brand/30 cursor-pointer group active:scale-95"
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                            <PlusIcon className="h-5 w-5" />
                          </span>
                          <span className="text-[11px] font-bold text-ink leading-tight">
                            Student Groups
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="mt-4 text-[11px] text-ink/50 text-center">
                    Authorized actions for {profile?.full_name} ({isPrincipal ? 'Principal' : 'Teacher'})
                  </p>
                </section>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW: ASSIGNED GROUP & STUDENTS (Dedicated Teacher View)     */}
          {/* ============================================================ */}
          {activeTab === 'assigned-group' && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-line bg-white p-5 sm:p-7 shadow-2xs space-y-6">
                {/* Top row: Title + Group Badge + Action */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-2xs"
                      style={{ backgroundColor: myLeadGroup?.color || '#0b5d5b' }}
                    >
                      <LayersIcon className="h-6 w-6" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-black text-ink">
                          {myLeadGroup ? myLeadGroup.name : 'Assigned Student Group'}
                        </h2>
                        {myLeadGroup && <GroupBadge group={myLeadGroup} size="sm" />}
                        <span className="rounded-full bg-brand/10 border border-brand/20 px-2.5 py-0.5 text-xs font-extrabold text-brand">
                          Lead Teacher: {profile?.full_name}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-ink/65 mt-0.5">
                        {myLeadGroup
                          ? `Roster of ${myAssignedStudents.length} students placed in your group for direct supervision.`
                          : 'You have not been assigned to a student group yet.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setAddError('')
                        setAddMsg('')
                        if (myLeadGroup) setSelectedGroupId(myLeadGroup.id)
                        setShowAddStudent(true)
                      }}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-brand-dark transition-all cursor-pointer active:scale-95"
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span>Add student to group</span>
                    </button>
                  </div>
                </div>

                {/* 3 Metric Summary Cards for the Group */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                  <div className="rounded-xl border border-line bg-mist/30 p-4 shadow-2xs">
                    <span className="text-xs font-bold text-ink/50 uppercase tracking-wide">
                      Assigned Students
                    </span>
                    <p className="mt-1 text-2xl font-black text-ink">
                      {myAssignedStudents.length}
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-emerald-700">
                      Active in your group
                    </p>
                  </div>

                  <div className="rounded-xl border border-line bg-mist/30 p-4 shadow-2xs">
                    <span className="text-xs font-bold text-ink/50 uppercase tracking-wide">
                      School Attendance Total
                    </span>
                    <p className="mt-1 text-2xl font-black text-ink">
                      {students.length}
                    </p>
                    <p className="mt-0.5 text-xs text-ink/60">
                      Registered school-wide
                    </p>
                  </div>

                  <div className="rounded-xl border border-line bg-mist/30 p-4 shadow-2xs">
                    <span className="text-xs font-bold text-ink/50 uppercase tracking-wide">
                      Sessions Held Today
                    </span>
                    <p className="mt-1 text-2xl font-black text-ink">
                      {todaysEvents.length}
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-brand">
                      {openRoomToday ? '● 1 session live' : 'All sessions closed'}
                    </p>
                  </div>
                </div>

                {/* Student Search & Roster */}
                {myLeadGroup ? (
                  myAssignedStudents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-line bg-mist/30 p-10 text-center space-y-2">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-mist text-ink/40">
                        <UsersIcon className="h-6 w-6" />
                      </div>
                      <h3 className="text-base font-extrabold text-ink">
                        No students assigned to {myLeadGroup.name} yet
                      </h3>
                      <p className="text-xs text-ink/55 max-w-md mx-auto">
                        Students will appear here once placed into this group by the principal, or you can add a new student using the button above.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="relative flex-1 max-w-sm">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <SearchIcon className="h-4 w-4 text-ink/40" />
                          </div>
                          <input
                            type="text"
                            value={myStudentsSearch}
                            onChange={(e) => setMyStudentsSearch(e.target.value)}
                            placeholder="Search student name, matric no, or details…"
                            className="w-full rounded-xl border border-line bg-white py-2 pl-9 pr-3 text-xs font-medium text-ink placeholder:text-ink/40 focus:border-brand focus:outline-hidden"
                          />
                          {myStudentsSearch && (
                            <button
                              type="button"
                              onClick={() => setMyStudentsSearch('')}
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-bold text-ink/40 hover:text-ink cursor-pointer"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <span className="text-xs font-bold text-ink/55">
                          Showing {filteredMyAssignedStudents.length} of {myAssignedStudents.length} students
                        </span>
                      </div>

                      {/* Student Table */}
                      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-2xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="border-b border-line bg-mist/60 text-xs font-extrabold text-ink/60">
                              <tr>
                                <th className="px-5 py-3.5">Student Name</th>
                                <th className="px-4 py-3.5">Attendance Score</th>
                                <th className="px-4 py-3.5">Matric Number</th>
                                <th className="px-4 py-3.5">Class / Detail</th>
                                <th className="px-4 py-3.5 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                              {filteredMyAssignedStudents.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="p-8 text-center text-xs text-ink/50">
                                    No students match your search query.
                                  </td>
                                </tr>
                              ) : (
                                filteredMyAssignedStudents.map((s) => {
                                  const score = getStudentScore(s.id)
                                  const barColor =
                                    score.pct >= 75
                                      ? 'bg-emerald-600'
                                      : score.pct >= 50
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  const textColor =
                                    score.pct >= 75
                                      ? 'text-emerald-700'
                                      : score.pct >= 50
                                      ? 'text-amber-700'
                                      : 'text-rose-700'

                                  return (
                                  <tr
                                    key={s.id}
                                    onClick={() => onSelectStudent && onSelectStudent(s)}
                                    className="transition-colors hover:bg-mist/40 cursor-pointer"
                                  >
                                    <td className="px-5 py-3.5 font-extrabold text-ink">
                                      <div className="flex items-center gap-3">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-xs font-black text-brand shrink-0">
                                          {s.full_name ? s.full_name.charAt(0).toUpperCase() : '?'}
                                        </span>
                                        <span>{s.full_name}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3.5">
                                      {score.total === 0 ? (
                                        <span className="text-xs italic text-ink/40">No sessions yet</span>
                                      ) : (
                                        <div className="w-36 space-y-1">
                                          <div className="flex items-center justify-between text-xs font-bold">
                                            <span className="text-ink">
                                              {score.attended}/{score.total} {score.total === 1 ? 'class' : 'classes'}
                                            </span>
                                            <span className={textColor}>{score.pct}%</span>
                                          </div>
                                          <div className="h-2 w-full overflow-hidden rounded-full bg-mist">
                                            <div
                                              className={`h-full rounded-full transition-all ${barColor}`}
                                              style={{ width: `${score.pct}%` }}
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-3.5 text-xs font-semibold text-brand">
                                      {s.matric_no || <span className="italic text-ink/40">No matric</span>}
                                    </td>
                                    <td className="px-4 py-3.5 text-xs text-ink/65">
                                      {s.detail || '-'}
                                    </td>
                                    <td className="px-4 py-3.5 text-right">
                                      <div className="inline-flex items-center justify-end gap-2">
                                        {getWhatsAppUrl(s.phone) && (
                                          <a
                                            href={getWhatsAppUrl(s.phone)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            title={`Message ${s.full_name} on WhatsApp`}
                                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                                          >
                                            <WhatsAppIcon className="h-3.5 w-3.5" />
                                            <span>WhatsApp</span>
                                          </a>
                                        )}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            if (onSelectStudent) onSelectStudent(s)
                                          }}
                                          className="inline-flex items-center gap-1 rounded-lg bg-mist/80 px-3 py-1.5 text-xs font-bold text-ink hover:bg-line/40 transition-colors cursor-pointer"
                                        >
                                          <span>View missed</span>
                                          <ChevronRightIcon className="h-3.5 w-3.5 text-ink/60" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                  )
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="rounded-xl border border-dashed border-line bg-mist/30 p-10 text-center space-y-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-mist text-ink/40">
                      <LayersIcon className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-extrabold text-ink">No group assigned yet</h3>
                    <p className="text-xs text-ink/55 max-w-md mx-auto">
                      The principal has not assigned you as head of a student group yet. Once assigned, your group roster and student records will appear right here.
                    </p>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW: STUDENTS DIRECTORY (When Students Tab is active)       */}
          {/* ============================================================ */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              <section className="rounded-xl border border-line bg-white p-5 shadow-2xs sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                  <div>
                    <h2 className="text-xl font-black text-ink">Student Roster</h2>
                    <p className="text-xs text-ink/65">
                      Search, view matriculation numbers, and manage student group placements.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAddError('')
                      setAddMsg('')
                      setShowAddStudent(true)
                    }}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-brand-dark"
                  >
                    <PlusIcon className="h-4 w-4" /> Add student
                  </button>
                </div>

                {/* Search Bar & Group Filter Chips */}
                <div className="mt-4 space-y-3">
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                      <SearchIcon className="h-4 w-4 text-ink/40" />
                    </div>
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search name, matric number, or group…"
                      className="min-h-[40px] w-full rounded-lg border border-line bg-white py-2 pl-10 pr-4 text-sm font-medium text-ink placeholder:text-ink/40 focus:border-brand"
                    />
                    {studentSearch && (
                      <button
                        type="button"
                        onClick={() => setStudentSearch('')}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-bold text-ink/40 hover:text-ink cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Group Filter Chips */}
                  {groups.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                      <button
                        type="button"
                        onClick={() => setGroupFilter('all')}
                        className={`inline-flex min-h-[36px] items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                          groupFilter === 'all'
                            ? 'bg-brand text-white shadow-xs'
                            : 'bg-mist text-ink/70 hover:bg-line/50'
                        }`}
                      >
                        All ({students.length})
                      </button>

                      {myLeadGroup && (
                        <button
                          type="button"
                          onClick={() => setGroupFilter(myLeadGroup.id)}
                          className={`inline-flex min-h-[36px] items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                            groupFilter === myLeadGroup.id
                              ? 'bg-brand text-white shadow-xs'
                              : 'bg-brand/10 text-brand border border-brand/20 hover:bg-brand/15'
                          }`}
                        >
                          ★ My Group ({students.filter((s) => s.group_id === myLeadGroup.id).length})
                        </button>
                      )}

                      {groups.map((g) => {
                        if (myLeadGroup && g.id === myLeadGroup.id) return null
                        const count = students.filter((s) => s.group_id === g.id).length
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setGroupFilter(g.id)}
                            className={`inline-flex min-h-[36px] items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                              groupFilter === g.id
                                ? 'bg-brand text-white shadow-xs'
                                : 'bg-mist text-ink/70 hover:bg-line/50'
                            }`}
                          >
                            {g.name} ({count})
                          </button>
                        )
                      })}

                      <button
                        type="button"
                        onClick={() => setGroupFilter('unassigned')}
                        className={`inline-flex min-h-[36px] items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                          groupFilter === 'unassigned'
                            ? 'bg-amber-600 text-white shadow-xs font-bold'
                            : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        Unassigned ({students.filter((s) => !s.group_id).length})
                      </button>
                    </div>
                  )}

                  {/* Active Teacher Group Filter Banner */}
                  {myLeadGroup && groupFilter === myLeadGroup.id && (
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-brand/20 bg-brand/5 p-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-xs font-black text-white">
                          ★
                        </span>
                        <div>
                          <p className="text-xs font-bold text-ink">
                            Showing students assigned to your group:{' '}
                            <span className="font-extrabold text-brand">{myLeadGroup.name}</span>
                          </p>
                          <p className="text-[11px] text-ink/65">
                            You are the lead teacher for this group of {myAssignedStudents.length} students.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGroupFilter('all')}
                        className="text-xs font-bold text-brand hover:underline cursor-pointer"
                      >
                        View all
                      </button>
                    </div>
                  )}
                </div>

                {/* Students List */}
                {students.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-line bg-mist/20 p-8 text-center text-xs text-ink/60">
                    No students added yet.
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-line bg-mist/20 p-8 text-center text-xs text-ink/60">
                    No students matching &ldquo;{studentSearch || groupFilter}&rdquo;.
                  </div>
                ) : (
                  <div className="mt-4 divide-y divide-line rounded-xl border border-line overflow-hidden bg-white">
                    {filteredStudents.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => onSelectStudent?.(s)}
                        className="group flex cursor-pointer items-center justify-between gap-3 p-3.5 transition-colors hover:bg-mist/50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-bold text-ink text-sm sm:text-base group-hover:text-brand">
                              {s.full_name}
                            </p>
                            <GroupBadge group={s.student_groups} size="xs" />
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink/60">
                            {s.matric_no ? (
                              <span className="font-semibold text-brand">
                                {s.matric_no}
                              </span>
                            ) : (
                              <span className="italic text-ink/40">No matric number</span>
                            )}
                            {s.detail && <span className="text-ink/30">·</span>}
                            {s.detail && <span>{s.detail}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getWhatsAppUrl(s.phone) && (
                            <a
                              href={getWhatsAppUrl(s.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title={`WhatsApp DM: ${s.phone}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors shrink-0"
                            >
                              <WhatsAppIcon className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">{s.phone}</span>
                              <span className="sm:hidden">WhatsApp</span>
                            </a>
                          )}
                          {isPrincipal && (
                            <button
                              type="button"
                              title="Delete student"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteStudentTarget(s)
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-ink/40 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                          <ChevronRightIcon className="h-4 w-4 shrink-0 text-ink/30 group-hover:text-brand" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

      {/* ============================================================== */}
      {/* MODALS: CREATE EVENT & ADD STUDENT                            */}
      {/* ============================================================== */}
      {showCreateEvent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-xs"
          onClick={() => setShowCreateEvent(false)}
        >
          <form
            onSubmit={handleCreateEvent}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl sm:p-7"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-brand">
                <CalendarIcon className="h-5 w-5" />
                <h3 className="text-xl font-black text-ink">Create Event</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateEvent(false)}
                aria-label="Close modal"
                className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg bg-mist text-ink/65 hover:text-ink transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-xs text-ink/65">
              Schedule a class session to open an attendance room for your students.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink/80" htmlFor="new-event-title">
                  Event title *
                </label>
                <input
                  id="new-event-title"
                  required
                  autoFocus
                  placeholder="e.g. Sunday class, Bible study"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm font-medium focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/80" htmlFor="new-event-date">
                  Event date (Lagos date) *
                </label>
                <input
                  id="new-event-date"
                  type="date"
                  required
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm font-medium focus:border-brand"
                />
              </div>
            </div>

            {eventError && (
              <p className="mt-3 text-xs font-bold text-red">{eventError}</p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={creatingEvent}
                className="flex-1 min-h-[44px] rounded-lg bg-brand py-2.5 text-sm font-bold text-white shadow-xs hover:bg-brand-dark transition-colors disabled:opacity-50 cursor-pointer"
              >
                {creatingEvent ? 'Creating…' : 'Create event'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateEvent(false)
                  setEventError('')
                }}
                className="flex-1 min-h-[44px] rounded-lg border border-line bg-white py-2.5 text-sm font-semibold text-ink hover:bg-mist transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showAddStudent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-xs"
          onClick={() => setShowAddStudent(false)}
        >
          <form
            onSubmit={addStudent}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl sm:p-7"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-brand">
                <UserPlusIcon className="h-5 w-5" />
                <h3 className="text-xl font-black text-ink">Add a Student</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStudent(false)}
                aria-label="Close modal"
                className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg bg-mist text-ink/65 hover:text-ink transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-xs text-ink/65">
              Add a student to the unit roster. Matric numbers can be added later.
            </p>

            <div className="mt-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-ink/80" htmlFor="add-student-name">
                  Full name *
                </label>
                <input
                  id="add-student-name"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Samuel Ade"
                  className="mt-1 w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm font-medium focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/80" htmlFor="add-student-matric">
                  Matric number <span className="font-normal text-ink/50">(optional)</span>
                </label>
                <input
                  id="add-student-matric"
                  value={matricNo}
                  onChange={(e) => setMatricNo(e.target.value)}
                  placeholder="e.g. FFS-042"
                  className="mt-1 w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm font-medium focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/80" htmlFor="add-student-phone">
                  Phone / WhatsApp number <span className="font-normal text-ink/50">(optional)</span>
                </label>
                <input
                  id="add-student-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 08103569660"
                  className="mt-1 w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm font-medium focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/80" htmlFor="add-student-detail">
                  Detail <span className="font-normal text-ink/50">(optional)</span>
                </label>
                <input
                  id="add-student-detail"
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="e.g. Senior class, Department"
                  className="mt-1 w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm font-medium focus:border-brand"
                />
              </div>

              {groups.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-ink/80" htmlFor="add-student-group">
                    Student Group <span className="font-normal text-ink/50">(optional)</span>
                  </label>
                  <select
                    id="add-student-group"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm font-medium focus:border-brand"
                  >
                    <option value="">Leave unassigned</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {addError && <p className="mt-3 text-xs font-bold text-red">{addError}</p>}
            {addMsg && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-ok">
                <CheckCircleIcon className="h-4 w-4" /> {addMsg}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={savingStudent}
                className="flex-1 min-h-[44px] rounded-lg bg-brand py-2.5 text-sm font-bold text-white shadow-xs hover:bg-brand-dark transition-colors disabled:opacity-50 cursor-pointer"
              >
                {savingStudent ? 'Saving student…' : 'Save student'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddStudent(false)
                  setAddError('')
                  setAddMsg('')
                }}
                className="flex-1 min-h-[44px] rounded-lg border border-line bg-white py-2.5 text-sm font-semibold text-ink hover:bg-mist transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* DELETE STUDENT CONFIRMATION MODAL (Principal only)             */}
      {/* ============================================================== */}
      {deleteStudentTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-xs"
          onClick={() => {
            if (!deletingStudent) setDeleteStudentTarget(null)
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-7 border border-line"
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 border border-rose-200">
                <TrashIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink">Delete Student</h3>
                <p className="text-xs text-ink/60">This action cannot be undone.</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 text-xs text-rose-900 space-y-1">
              <p>
                Are you sure you want to permanently remove <strong className="font-bold text-rose-950">{deleteStudentTarget.full_name}</strong>
                {deleteStudentTarget.matric_no ? ` (${deleteStudentTarget.matric_no})` : ''}?
              </p>
              <p className="text-[11px] text-rose-800/80">
                All associated attendance history records for this student will also be removed.
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={deletingStudent}
                onClick={() => setDeleteStudentTarget(null)}
                className="flex-1 min-h-[42px] rounded-lg border border-line bg-white py-2.5 text-sm font-semibold text-ink hover:bg-mist transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingStudent}
                onClick={() => handleDeleteStudent(deleteStudentTarget)}
                className="flex-1 min-h-[42px] rounded-lg bg-rose-600 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {deletingStudent ? 'Deleting…' : 'Yes, Delete Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
