import { useEffect, useMemo, useState } from 'react'
import { supabase, today } from './supabase'
import {
  ArrowLeftIcon,
  DownloadIcon,
  SearchIcon,
  UsersIcon,
  CalendarIcon,
  AlertCircleIcon,
  ChevronRightIcon,
  CheckIcon,
} from './Icons'
import GroupBadge from './GroupBadge'
import ClassTrendChart from './ClassTrendChart'

function formatLagosDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(`${dateStr}T12:00:00`)
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  })
}

function formatCheckInTime(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Africa/Lagos',
  })
}

function downloadCSV(filename, rows) {
  const csvContent =
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((cell) => {
            const str = cell === null || cell === undefined ? '' : String(cell)
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`
            }
            return str
          })
          .join(',')
      )
      .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function ReportsPage({
  onBack,
  onSelectStudent,
  onSelectEvent,
}) {
  const [events, setEvents] = useState([])
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)

  // Navigation tab: 'classes' | 'events' | 'students' | 'followup'
  const [activeTab, setActiveTab] = useState('classes')

  // Selected event for deep breakdown modal/card
  const [selectedEventId, setSelectedEventId] = useState(null)

  // Filters & search
  const [studentSearch, setStudentSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('all') // 'all' | '30days' | '90days'

  useEffect(() => {
    let mounted = true

    async function loadData() {
      setLoading(true)

      const [eventsRes, studentsRes, attendanceRes] = await Promise.all([
        supabase
          .from('events')
          .select('id, title, event_date, status, created_at, opened_at, closed_at')
          .order('event_date', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('students')
          .select('id, full_name, matric_no, detail, active, created_at, group_id, student_groups(id, name, color)')
          .eq('active', true)
          .order('full_name'),
        supabase
          .from('attendance')
          .select('id, event_id, student_id, created_at, group_id, student_groups(id, name, color), marked_by, profiles:marked_by(full_name)')
          .order('created_at', { ascending: false }),
      ])

      if (!mounted) return

      setEvents(eventsRes.data || [])
      setStudents(studentsRes.data || [])
      setAttendance(attendanceRes.data || [])
      setLoading(false)
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [])

  // Fast attendance lookup map: eventId -> Set of studentIds
  const attendanceByEvent = useMemo(() => {
    const map = new Map()
    for (const record of attendance) {
      if (!map.has(record.event_id)) {
        map.set(record.event_id, new Map())
      }
      map.get(record.event_id).set(record.student_id, record)
    }
    return map
  }, [attendance])

  // Fast attendance lookup map: studentId -> Set of eventIds
  const attendanceByStudent = useMemo(() => {
    const map = new Map()
    for (const record of attendance) {
      if (!map.has(record.student_id)) {
        map.set(record.student_id, new Set())
      }
      map.get(record.student_id).add(record.event_id)
    }
    return map
  }, [attendance])

  // Events filtered by date range for calculation
  const filteredEvents = useMemo(() => {
    const todayStr = today()
    if (dateFilter === 'all') return events

    const days = dateFilter === '30days' ? 30 : 90
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString().split('T')[0]

    return events.filter((e) => e.event_date >= cutoffStr && e.event_date <= todayStr)
  }, [events, dateFilter])

  // Past & closed events in order
  const eligibleEvents = useMemo(() => {
    return filteredEvents.filter((e) => e.status !== 'scheduled' || attendanceByEvent.has(e.id))
  }, [filteredEvents, attendanceByEvent])

  // Key metrics
  const totalActiveStudents = students.length
  const totalEventsCount = eligibleEvents.length
  const totalCheckIns = attendance.length

  const avgAttendancePerEvent = totalEventsCount > 0
    ? Math.round((eligibleEvents.reduce((acc, e) => acc + (attendanceByEvent.get(e.id)?.size || 0), 0) / totalEventsCount) * 10) / 10
    : 0

  const avgRatePerEvent = totalActiveStudents > 0 && totalEventsCount > 0
    ? Math.round((avgAttendancePerEvent / totalActiveStudents) * 100)
    : 0

  // Follow-up calculations: Find students who missed last 2+ consecutive events
  const followUpStudents = useMemo(() => {
    // Past events sorted strictly descending by date
    const pastCompletedEvents = events
      .filter((e) => e.status === 'closed' || e.event_date < today())
      .sort((a, b) => (a.event_date < b.event_date ? 1 : -1))

    if (pastCompletedEvents.length === 0) return []

    const list = []

    for (const student of students) {
      let consecutiveMisses = 0
      let lastAttended = null

      for (const evt of pastCompletedEvents) {
        const studentRecord = attendanceByEvent.get(evt.id)?.get(student.id)
        if (studentRecord) {
          if (!lastAttended) lastAttended = evt
          break // stopped consecutive misses
        } else {
          consecutiveMisses++
        }
      }

      // Check if student missed 2 or more recent events
      if (consecutiveMisses >= 2) {
        list.push({
          student,
          consecutiveMisses,
          lastAttended,
        })
      }
    }

    return list.sort((a, b) => b.consecutiveMisses - a.consecutiveMisses)
  }, [events, students, attendanceByEvent])

  // Student list with attendance rates
  const studentRates = useMemo(() => {
    const totalCount = eligibleEvents.length

    return students.map((s) => {
      const studentEvents = attendanceByStudent.get(s.id) || new Set()
      // count how many of the eligible events this student attended
      let attendedInScope = 0
      for (const evt of eligibleEvents) {
        if (studentEvents.has(evt.id)) attendedInScope++
      }

      const rate = totalCount > 0 ? Math.round((attendedInScope / totalCount) * 100) : 0

      return {
        ...s,
        attendedCount: attendedInScope,
        totalCount,
        rate,
      }
    })
  }, [students, eligibleEvents, attendanceByStudent])

  // Filtered student rates
  const filteredStudentRates = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    if (!q) return studentRates
    return studentRates.filter((s) => {
      return (
        s.full_name?.toLowerCase().includes(q) ||
        s.matric_no?.toLowerCase().includes(q) ||
        s.detail?.toLowerCase().includes(q)
      )
    })
  }, [studentRates, studentSearch])

  // Selected event object & detail breakdown
  const selectedEventData = useMemo(() => {
    if (!selectedEventId) return null
    const evt = events.find((e) => e.id === selectedEventId)
    if (!evt) return null

    const presentMap = attendanceByEvent.get(evt.id) || new Map()

    const present = []
    const absent = []

    for (const s of students) {
      const record = presentMap.get(s.id)
      if (record) {
        present.push({ student: s, record })
      } else {
        absent.push(s)
      }
    }

    // Sort present by check-in time
    present.sort((a, b) => (a.record.created_at < b.record.created_at ? -1 : 1))

    return {
      event: evt,
      present,
      absent,
      rate: students.length > 0 ? Math.round((present.length / students.length) * 100) : 0,
    }
  }, [selectedEventId, events, attendanceByEvent, students])

  // Class attendance trend analytics across sessions
  const classSessions = useMemo(() => {
    // Chronological order: oldest to newest for trend visualisation
    const sorted = [...eligibleEvents].sort((a, b) => {
      if (a.event_date === b.event_date) {
        return (a.created_at || '').localeCompare(b.created_at || '')
      }
      return (a.event_date || '').localeCompare(b.event_date || '')
    })

    return sorted.map((evt) => {
      const presentCount = attendanceByEvent.get(evt.id)?.size || 0
      const rate =
        totalActiveStudents > 0
          ? Math.round((presentCount / totalActiveStudents) * 100)
          : 0

      return {
        id: evt.id,
        title: evt.title,
        event_date: evt.event_date,
        status: evt.status,
        created_at: evt.created_at,
        presentCount,
        totalStudents: totalActiveStudents,
        rate,
      }
    })
  }, [eligibleEvents, attendanceByEvent, totalActiveStudents])

  // Top attended class session
  const topClassSession = useMemo(() => {
    if (classSessions.length === 0) return null
    return [...classSessions].sort((a, b) => (b.presentCount || 0) - (a.presentCount || 0))[0]
  }, [classSessions])

  // Latest class session
  const latestClassSession = useMemo(() => {
    if (classSessions.length === 0) return null
    return classSessions[classSessions.length - 1]
  }, [classSessions])

  // Export functions
  function exportClassAnalytics() {
    const header = [
      'Class / Session Title',
      'Session Date',
      'Status',
      'Students Present',
      'Total Active Students',
      'Turnout Rate (%)',
    ]
    const rows = classSessions.map((c) => [
      c.title,
      c.event_date,
      c.status,
      c.presentCount,
      c.totalStudents,
      `${c.rate}%`,
    ])
    downloadCSV(`FFS_Class_Attendance_Analytics_${today()}.csv`, [header, ...rows])
  }

  function exportEventsSummary() {
    const header = ['Event Date', 'Event Title', 'Status', 'Present Count', 'Total Active Students', 'Turnout Rate (%)']
    const rows = eligibleEvents.map((e) => {
      const count = attendanceByEvent.get(e.id)?.size || 0
      const rate = totalActiveStudents > 0 ? Math.round((count / totalActiveStudents) * 100) : 0
      return [
        e.event_date,
        e.title,
        e.status,
        count,
        totalActiveStudents,
        `${rate}%`,
      ]
    })
    downloadCSV(`FFS_Events_Attendance_Summary_${today()}.csv`, [header, ...rows])
  }

  function exportStudentRates() {
    const header = ['Full Name', 'Matric Number', 'Group', 'Detail', 'Events Attended', 'Total Events', 'Attendance Rate (%)']
    const rows = studentRates.map((s) => [
      s.full_name,
      s.matric_no || 'None',
      s.student_groups?.name || 'Unassigned',
      s.detail || '',
      s.attendedCount,
      s.totalCount,
      `${s.rate}%`,
    ])
    downloadCSV(`FFS_Student_Attendance_Rates_${today()}.csv`, [header, ...rows])
  }

  function exportFollowUpList() {
    const header = ['Full Name', 'Matric Number', 'Group', 'Detail', 'Consecutive Missed Events', 'Last Attended Event', 'Last Attended Date']
    const rows = followUpStudents.map(({ student, consecutiveMisses, lastAttended }) => [
      student.full_name,
      student.matric_no || 'None',
      student.student_groups?.name || 'Unassigned',
      student.detail || '',
      consecutiveMisses,
      lastAttended ? lastAttended.title : 'Never attended',
      lastAttended ? lastAttended.event_date : 'N/A',
    ])
    downloadCSV(`FFS_FollowUp_List_${today()}.csv`, [header, ...rows])
  }

  function exportSingleEvent(eventData) {
    if (!eventData) return
    const { event, present, absent } = eventData
    const rows = [
      ['Event Title:', event.title],
      ['Event Date:', event.event_date],
      ['Status:', event.status],
      ['Total Present:', present.length],
      ['Total Absent:', absent.length],
      [''],
      ['Status', 'Full Name', 'Matric Number', 'Group', 'Detail', 'Check-in Time', 'Marked By'],
      ...present.map(({ student, record }) => [
        'Present',
        student.full_name,
        student.matric_no || 'None',
        student.student_groups?.name || record.student_groups?.name || 'Unassigned',
        student.detail || '',
        formatCheckInTime(record.created_at),
        record.profiles?.full_name || 'Teacher',
      ]),
      ...absent.map((s) => [
        'Absent',
        s.full_name,
        s.matric_no || 'None',
        s.student_groups?.name || 'Unassigned',
        s.detail || '',
        '-',
        '-',
      ]),
    ]
    downloadCSV(`FFS_${event.title.replace(/\s+/g, '_')}_${event.event_date}.csv`, rows)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* Top action row with back button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-2xs hover:bg-mist transition-colors cursor-pointer active:scale-95"
        >
          <ArrowLeftIcon className="h-4 w-4 text-ink/60" />
          <span>Back to Dashboard</span>
        </button>
      </div>

      <div className="space-y-6">
        {/* Title & Role Info */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-ink sm:text-3xl">
              Reports & Analytics
            </h1>
            <p className="mt-1 text-sm text-ink/65 sm:text-base">
              Principal analytical suite: events breakdown, student rates, group analytics, and follow-up reports.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-bold text-brand">
              <span className="h-2 w-2 rounded-full bg-brand" />
              Principal Access
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-sm font-semibold text-ink/60">
            Loading attendance records and analytics…
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {/* 4 Metric Summary Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <div className="rounded-xl border border-line bg-white p-4 shadow-xs sm:p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-ink/70">
                  <UsersIcon className="h-4 w-4 text-brand" /> Active Students
                </div>
                <p className="mt-2 text-2xl font-extrabold text-ink sm:text-3xl">
                  {totalActiveStudents}
                </p>
                <p className="mt-1 text-xs text-ink/65">{totalCheckIns} check-ins recorded</p>
              </div>

              <div className="rounded-xl border border-line bg-white p-4 shadow-xs sm:p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-ink/70">
                  <CalendarIcon className="h-4 w-4 text-brand" /> Events Held
                </div>
                <p className="mt-2 text-2xl font-extrabold text-ink sm:text-3xl">
                  {totalEventsCount}
                </p>
                <p className="mt-1 text-xs text-ink/65">Total tracked sessions</p>
              </div>

              <div className="rounded-xl border border-line bg-white p-4 shadow-xs sm:p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-ink/70">
                  <CheckIcon className="h-4 w-4 text-ok" /> Avg. Turnout
                </div>
                <p className="mt-2 text-2xl font-extrabold text-ink sm:text-3xl">
                  {avgAttendancePerEvent}{' '}
                  <span className="text-sm font-semibold text-ink/55 sm:text-base">
                    ({avgRatePerEvent}%)
                  </span>
                </p>
                <p className="mt-1 text-xs text-ink/65">Per event session</p>
              </div>

              <div className="rounded-xl border border-line bg-white p-4 shadow-xs sm:p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-ink/70">
                  <AlertCircleIcon className="h-4 w-4 text-sun" /> Follow-up Needed
                </div>
                <p className="mt-2 text-2xl font-extrabold text-amber-700 sm:text-3xl">
                  {followUpStudents.length}
                </p>
                <p className="mt-1 text-xs text-ink/65">Missed 2+ recent events</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2">
              <nav className="flex space-x-2 overflow-x-auto max-w-full pb-1 scrollbar-none" aria-label="Tabs">
                <button
                  type="button"
                  onClick={() => setActiveTab('classes')}
                  className={`min-h-[40px] rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    activeTab === 'classes'
                      ? 'bg-brand text-white shadow-xs'
                      : 'bg-white text-ink/70 hover:bg-mist'
                  }`}
                >
                  Class analytics ({classSessions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('events')}
                  className={`min-h-[40px] rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    activeTab === 'events'
                      ? 'bg-brand text-white shadow-xs'
                      : 'bg-white text-ink/70 hover:bg-mist'
                  }`}
                >
                  Events breakdown ({eligibleEvents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('students')}
                  className={`min-h-[40px] rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    activeTab === 'students'
                      ? 'bg-brand text-white shadow-xs'
                      : 'bg-white text-ink/70 hover:bg-mist'
                  }`}
                >
                  Student attendance rates ({students.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('followup')}
                  className={`relative min-h-[40px] rounded-lg px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    activeTab === 'followup'
                      ? 'bg-brand text-white shadow-xs'
                      : 'bg-white text-ink/70 hover:bg-mist'
                  }`}
                >
                  Needs follow-up
                  {followUpStudents.length > 0 && (
                    <span className="ml-2 inline-flex h-5 items-center justify-center rounded-full bg-sun px-1.5 text-xs font-black text-ink">
                      {followUpStudents.length}
                    </span>
                  )}
                </button>
              </nav>

              {/* Time Range Filter (For Student Rates & Events) */}
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="font-semibold text-ink/60">Scope:</span>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-bold text-ink shadow-2xs"
                >
                  <option value="all">All time</option>
                  <option value="30days">Last 30 days</option>
                  <option value="90days">Last 90 days</option>
                </select>
              </div>
            </div>

            {/* TAB 1: CLASS ANALYTICS & CURVED SPLINE TREND CHART */}
            {activeTab === 'classes' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-ink">
                      Class Attendance Analytics
                    </h2>
                    <p className="mt-0.5 text-xs text-ink/60">
                      Curved spline attendance trend tracking headcount across session classes.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {classSessions.length > 0 && (
                      <button
                        type="button"
                        onClick={exportClassAnalytics}
                        className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink hover:bg-mist cursor-pointer shadow-2xs"
                      >
                        <DownloadIcon className="h-4 w-4" /> Export class CSV
                      </button>
                    )}
                  </div>
                </div>

                {/* Spline Trend Chart Component */}
                <ClassTrendChart
                  sessions={classSessions}
                  onSelectSession={setSelectedEventId}
                  totalActiveStudents={totalActiveStudents}
                />

                {/* 3 Class Key Highlights */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                  <div className="rounded-xl border border-line bg-white p-4 shadow-xs">
                    <span className="text-xs font-bold text-ink/50 uppercase tracking-wide">
                      Highest Attendance
                    </span>
                    <p className="mt-1 text-lg font-black text-ink">
                      {topClassSession ? topClassSession.title : 'None'}
                    </p>
                    <p className="text-xs font-semibold text-ok mt-0.5">
                      {topClassSession ? `${topClassSession.presentCount} students (${topClassSession.rate}%)` : '-'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-line bg-white p-4 shadow-xs">
                    <span className="text-xs font-bold text-ink/50 uppercase tracking-wide">
                      Latest Class Headcount
                    </span>
                    <p className="mt-1 text-lg font-black text-ink">
                      {latestClassSession ? latestClassSession.title : 'None'}
                    </p>
                    <p className="text-xs font-semibold text-brand mt-0.5">
                      {latestClassSession ? `${latestClassSession.presentCount} students present` : '-'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-line bg-white p-4 shadow-xs">
                    <span className="text-xs font-bold text-ink/50 uppercase tracking-wide">
                      Average Class Headcount
                    </span>
                    <p className="mt-1 text-lg font-black text-ink">
                      {avgAttendancePerEvent} Students
                    </p>
                    <p className="text-xs font-semibold text-ink/60 mt-0.5">
                      {avgRatePerEvent}% average class turnout
                    </p>
                  </div>
                </div>

                {/* Class Session Headcount Breakdown Table */}
                <div className="rounded-2xl border border-line bg-white p-5 shadow-2xs sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-ink">
                        Class Session Headcount Log
                      </h3>
                      <p className="text-xs text-ink/50 mt-0.5">
                        Detailed attendance headcount per class attendance opening.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-line bg-mist/60 text-xs font-extrabold text-ink/60">
                        <tr>
                          <th className="px-5 py-3.5">Class / Session</th>
                          <th className="px-4 py-3.5">Date</th>
                          <th className="px-4 py-3.5">Status</th>
                          <th className="px-4 py-3.5 text-center">Students Present</th>
                          <th className="px-4 py-3.5 text-right">Turnout Rate</th>
                          <th className="px-4 py-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {classSessions.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-ink/60">
                              No class sessions recorded in this period.
                            </td>
                          </tr>
                        ) : (
                          // Display in reverse chronological order for the table
                          [...classSessions].reverse().map((session) => (
                            <tr key={session.id} className="transition-colors hover:bg-mist/40">
                              <td className="px-5 py-3.5 font-extrabold text-ink">
                                {session.title}
                              </td>
                              <td className="px-4 py-3.5 text-xs font-semibold text-ink/70">
                                {formatLagosDate(session.event_date)}
                              </td>
                              <td className="px-4 py-3.5">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                    session.status === 'open'
                                      ? 'bg-ok/15 text-ok'
                                      : 'bg-mist text-ink/60'
                                  }`}
                                >
                                  {session.status}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-center font-black text-ink">
                                <span className="text-base text-brand">
                                  {session.presentCount}
                                </span>{' '}
                                <span className="text-xs font-bold text-ink/50">
                                  / {session.totalStudents}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <span
                                  className={`inline-block min-w-[44px] rounded-md px-2 py-0.5 text-xs font-black ${
                                    session.rate >= 75
                                      ? 'bg-ok/15 text-ok'
                                      : session.rate >= 50
                                      ? 'bg-brand/10 text-brand'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {session.rate}%
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedEventId(session.id)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-mist/80 px-2.5 py-1 text-xs font-bold text-ink hover:bg-line/40 transition-colors cursor-pointer"
                                >
                                  <span>View who came</span>
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
            )}

            {/* TAB 2: EVENTS BREAKDOWN */}
            {activeTab === 'events' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-ink">
                      Attendance Per Event
                    </h2>
                    <p className="mt-0.5 text-xs text-ink/60">
                      Tap any event to view the full list of who attended and who was absent.
                    </p>
                  </div>
                  {eligibleEvents.length > 0 && (
                    <button
                      type="button"
                      onClick={exportEventsSummary}
                      className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink hover:bg-mist"
                    >
                      <DownloadIcon className="h-4 w-4" /> Export events CSV
                    </button>
                  )}
                </div>

                {eligibleEvents.length === 0 ? (
                  <div className="rounded-2xl border border-line bg-white p-8 text-center text-ink/60">
                    No completed or tracked events found in this period.
                  </div>
                ) : (
                  <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                    {eligibleEvents.map((evt) => {
                      const presentCount = attendanceByEvent.get(evt.id)?.size || 0
                      const rate = totalActiveStudents > 0
                        ? Math.round((presentCount / totalActiveStudents) * 100)
                        : 0
                      const isSelected = selectedEventId === evt.id

                      return (
                        <div
                          key={evt.id}
                          className={`flex flex-col justify-between rounded-2xl border-2 bg-white p-5 shadow-2xs transition-all ${
                            isSelected
                              ? 'border-brand ring-2 ring-brand/10'
                              : 'border-line hover:border-brand/50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase text-ink/50">
                                {formatLagosDate(evt.event_date)}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                  evt.status === 'open'
                                    ? 'bg-ok/15 text-ok'
                                    : 'bg-mist text-ink/60'
                                }`}
                              >
                                {evt.status}
                              </span>
                            </div>
                            <h3 className="mt-2 text-lg font-extrabold text-ink">
                              {evt.title}
                            </h3>
                          </div>

                          <div className="mt-5 border-t border-line pt-4">
                            <div className="flex items-baseline justify-between">
                              <div>
                                <span className="text-2xl font-black text-ink">
                                  {presentCount}
                                </span>
                                <span className="ml-1 text-xs font-bold text-ink/50">
                                  / {totalActiveStudents} present
                                </span>
                              </div>
                              <span
                                className={`text-sm font-black ${
                                  rate >= 75
                                    ? 'text-ok'
                                    : rate >= 50
                                    ? 'text-brand'
                                    : 'text-ink/60'
                                }`}
                              >
                                {rate}%
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-mist">
                              <div
                                className={`h-full rounded-full ${
                                  rate >= 75 ? 'bg-ok' : 'bg-brand'
                                }`}
                                style={{ width: `${Math.min(rate, 100)}%` }}
                              />
                            </div>

                            <div className="mt-4 flex gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedEventId(evt.id)}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand/10 py-2 text-xs font-bold text-brand hover:bg-brand/20"
                              >
                                View who came / missed
                                <ChevronRightIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: STUDENT ATTENDANCE RATES */}
            {activeTab === 'students' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-ink">
                      Student Consistency & Attendance Rate
                    </h2>
                    <p className="mt-0.5 text-xs text-ink/60">
                      Shows percentage of events attended across {eligibleEvents.length} tracked events.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={exportStudentRates}
                      className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink hover:bg-mist"
                    >
                      <DownloadIcon className="h-4 w-4" /> Export rates CSV
                    </button>
                  </div>
                </div>

                {/* Search box */}
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <SearchIcon className="h-4 w-4 text-ink/40" />
                  </div>
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Filter student by name, matric number, or detail…"
                    className="w-full rounded-xl border border-line bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-ink placeholder:text-ink/40 focus:border-brand focus:outline-hidden"
                  />
                  {studentSearch && (
                    <button
                      type="button"
                      onClick={() => setStudentSearch('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-bold text-ink/40 hover:text-ink"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Student Rates Table / Cards */}
                <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-line bg-mist/60 text-xs font-extrabold text-ink/60">
                        <tr>
                          <th className="px-5 py-3.5">Student</th>
                          <th className="px-4 py-3.5">Group</th>
                          <th className="px-4 py-3.5">Matric No.</th>
                          <th className="px-4 py-3.5">Detail</th>
                          <th className="px-4 py-3.5 text-center">Attended</th>
                          <th className="px-4 py-3.5 text-right">Attendance Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {filteredStudentRates.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-ink/60">
                              No students match your search.
                            </td>
                          </tr>
                        ) : (
                          filteredStudentRates.map((s) => (
                            <tr
                              key={s.id}
                              onClick={() => onSelectStudent && onSelectStudent(s.id)}
                              className="cursor-pointer transition-colors hover:bg-mist/40"
                            >
                              <td className="px-5 py-3.5 font-bold text-ink">
                                {s.full_name}
                              </td>
                              <td className="px-4 py-3.5">
                                <GroupBadge group={s.student_groups} size="xs" />
                              </td>
                              <td className="px-4 py-3.5 text-ink/70">
                                {s.matric_no ? (
                                  <span className="font-semibold text-brand">
                                    {s.matric_no}
                                  </span>
                                ) : (
                                  <span className="text-xs italic text-ink/40">
                                    No matric
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-xs text-ink/60">
                                {s.detail || '-'}
                              </td>
                              <td className="px-4 py-3.5 text-center font-extrabold text-ink">
                                {s.attendedCount} / {s.totalCount}
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-3">
                                  <div className="hidden h-2 w-20 overflow-hidden rounded-full bg-mist sm:block">
                                    <div
                                      className={`h-full rounded-full ${
                                        s.rate >= 80
                                          ? 'bg-ok'
                                          : s.rate >= 50
                                          ? 'bg-brand'
                                          : 'bg-sun'
                                      }`}
                                      style={{ width: `${Math.min(s.rate, 100)}%` }}
                                    />
                                  </div>
                                  <span
                                    className={`inline-block min-w-[44px] rounded-md px-2 py-0.5 text-xs font-black ${
                                      s.rate >= 80
                                        ? 'bg-ok/15 text-ok'
                                        : s.rate >= 50
                                        ? 'bg-brand/10 text-brand'
                                        : 'bg-sun/20 text-ink'
                                    }`}
                                  >
                                    {s.rate}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: NEEDS FOLLOW-UP */}
            {activeTab === 'followup' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-ink">
                      Follow-up List: Consecutive Absences
                    </h2>
                    <p className="mt-0.5 text-xs text-ink/60">
                      Students who missed the last 2 or more consecutive events in a row.
                    </p>
                  </div>

                  {followUpStudents.length > 0 && (
                    <button
                      type="button"
                      onClick={exportFollowUpList}
                      className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink hover:bg-mist"
                    >
                      <DownloadIcon className="h-4 w-4" /> Export follow-up list
                    </button>
                  )}
                </div>

                {followUpStudents.length === 0 ? (
                  <div className="rounded-2xl border border-line bg-white p-8 text-center">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-ok/10 text-ok">
                      <CheckIcon className="h-6 w-6" />
                    </span>
                    <h3 className="mt-3 text-base font-extrabold text-ink">
                      Great attendance consistency!
                    </h3>
                    <p className="mt-1 text-xs text-ink/60">
                      No active student has missed 2 or more consecutive events recently.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    {followUpStudents.map(({ student, consecutiveMisses, lastAttended }) => (
                      <div
                        key={student.id}
                        className="flex flex-col justify-between rounded-2xl border-2 border-sun/40 bg-white p-5 shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-sun/20 px-2.5 py-1 text-xs font-black text-ink">
                              <AlertCircleIcon className="h-3.5 w-3.5 text-sun" />
                              Missed {consecutiveMisses} in a row
                            </span>
                            {student.matric_no && (
                              <span className="text-xs font-semibold text-brand">
                                {student.matric_no}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <h3 className="text-lg font-extrabold text-ink">
                              {student.full_name}
                            </h3>
                            <GroupBadge group={student.student_groups} size="xs" />
                          </div>
                          {student.detail && (
                            <p className="mt-0.5 text-xs font-medium text-ink/60">
                              {student.detail}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 border-t border-line pt-3 text-xs text-ink/70">
                          <p>
                            <span className="font-semibold text-ink/50">Last seen:</span>{' '}
                            {lastAttended ? (
                              <span className="font-bold text-ink">
                                {lastAttended.title} ({formatLagosDate(lastAttended.event_date)})
                              </span>
                            ) : (
                              <span className="italic text-ink/40">Never attended</span>
                            )}
                          </p>

                          <button
                            type="button"
                            onClick={() => onSelectStudent && onSelectStudent(student.id)}
                            className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-line bg-mist/60 py-2 text-xs font-bold text-ink hover:bg-mist cursor-pointer"
                          >
                            View student history <ChevronRightIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* EVENT DETAIL BREAKDOWN MODAL */}
      {selectedEventData && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-xs"
          onClick={() => setSelectedEventId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-line p-5 sm:p-6">
              <div>
                <span className="text-xs font-bold uppercase text-ink/50">
                  {formatLagosDate(selectedEventData.event.event_date)}
                </span>
                <h2 className="mt-1 text-xl font-black text-ink sm:text-2xl">
                  {selectedEventData.event.title}
                </h2>
                <p className="mt-1 text-xs text-ink/60">
                  Turnout: {selectedEventData.present.length} of {students.length} students ({selectedEventData.rate}%)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportSingleEvent(selectedEventData)}
                  className="rounded-lg border border-line bg-mist px-3 py-1.5 text-xs font-bold text-ink hover:bg-line/40 cursor-pointer"
                >
                  <DownloadIcon className="inline h-3.5 w-3.5" /> CSV
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEventId(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-mist text-ink/60 hover:text-ink cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Present and Absent Columns */}
            <div className="grid flex-1 overflow-y-auto p-5 sm:grid-cols-2 sm:gap-6 sm:p-6">
              {/* Present List */}
              <div className="rounded-xl border border-line bg-mist/30 p-4">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h3 className="text-sm font-extrabold text-ok">
                    Present ({selectedEventData.present.length})
                  </h3>
                </div>
                {selectedEventData.present.length === 0 ? (
                  <p className="mt-3 text-xs text-ink/50 italic">Nobody checked in.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-line/60">
                    {selectedEventData.present.map(({ student, record }) => (
                      <li key={student.id} className="py-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-ink">{student.full_name}</p>
                          <GroupBadge group={record.student_groups || student.student_groups} size="xs" />
                        </div>
                        <p className="text-xs text-ink/60">
                          {student.matric_no ? student.matric_no : 'No matric'}
                          {record.created_at && ` · ${formatCheckInTime(record.created_at)}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Absent List */}
              <div className="mt-4 rounded-xl border border-line bg-mist/30 p-4 sm:mt-0">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h3 className="text-sm font-extrabold text-ink/70">
                    Absent ({selectedEventData.absent.length})
                  </h3>
                </div>
                {selectedEventData.absent.length === 0 ? (
                  <p className="mt-3 text-xs text-ok font-semibold">100% attendance! Nobody was absent.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-line/60">
                    {selectedEventData.absent.map((student) => (
                      <li key={student.id} className="py-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-ink">{student.full_name}</p>
                          <GroupBadge group={student.student_groups} size="xs" />
                        </div>
                        <p className="text-xs text-ink/60">
                          {student.matric_no ? student.matric_no : 'No matric'}
                          {student.detail && ` · ${student.detail}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-line bg-mist/40 p-4 sm:px-6">
              <button
                type="button"
                onClick={() => {
                  const evt = selectedEventData.event
                  setSelectedEventId(null)
                  onSelectEvent && onSelectEvent(evt)
                }}
                className="text-xs font-extrabold text-brand hover:underline"
              >
                Go to event page →
              </button>
              <button
                type="button"
                onClick={() => setSelectedEventId(null)}
                className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-ink hover:bg-mist"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
