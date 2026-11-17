// Responsive, accessible colour-coded attendance bar chart for Student Groups

import { useMemo, useState } from 'react'

export default function GroupBarChart({ groupStats = [], eventTitle = 'Selected Session' }) {
  const [selectedGroup, setSelectedGroup] = useState(null)

  // Sort groups by attendance count descending, then by name
  const sortedStats = useMemo(() => {
    return [...groupStats].sort((a, b) => {
      if (b.presentCount !== a.presentCount) {
        return b.presentCount - a.presentCount
      }
      return (b.rate || 0) - (a.rate || 0)
    })
  }, [groupStats])

  const maxTotal = useMemo(() => {
    const highest = Math.max(...sortedStats.map((s) => s.totalStudents || 0), 1)
    return highest
  }, [sortedStats])

  if (!sortedStats || sortedStats.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-mist/30 p-8 text-center">
        <p className="text-sm font-bold text-ink/60">No student groups found.</p>
        <p className="mt-1 text-xs text-ink/40">
          Create student groups in Principal Controls to view group-based analytics.
        </p>
      </div>
    )
  }

  const totalAssigned = sortedStats.reduce((acc, g) => acc + (g.totalStudents || 0), 0)
  const totalPresent = sortedStats.reduce((acc, g) => acc + (g.presentCount || 0), 0)
  const overallRate = totalAssigned > 0 ? Math.round((totalPresent / totalAssigned) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header with summary turnout */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h3 className="text-base font-extrabold text-ink sm:text-lg">
            Group Attendance Breakdown
          </h3>
          <p className="mt-0.5 text-xs text-ink/60">
            {eventTitle} · {sortedStats.length} {sortedStats.length === 1 ? 'group' : 'groups'} tracked
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-line bg-mist/60 px-3 py-1.5 text-right">
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink/50">
              Total Turnout
            </span>
            <span className="text-sm font-black text-brand sm:text-base">
              {totalPresent} of {totalAssigned} ({overallRate}%)
            </span>
          </div>
        </div>
      </div>

      {/* Colour-coded Bar Chart */}
      <div className="space-y-4">
        {sortedStats.map((stat) => {
          const color = stat.color || '#0b5d5b'
          const percentWidth =
            maxTotal > 0 ? Math.max(Math.round(((stat.totalStudents || 0) / maxTotal) * 100), 12) : 12
          const presentWidth =
            stat.totalStudents > 0
              ? Math.min(Math.round(((stat.presentCount || 0) / stat.totalStudents) * 100), 100)
              : 0

          const isSelected = selectedGroup?.id === stat.id

          return (
            <div
              key={stat.id}
              onClick={() => setSelectedGroup(isSelected ? null : stat)}
              className={`group cursor-pointer rounded-xl border p-3.5 transition-all sm:p-4 ${
                isSelected
                  ? 'border-brand bg-brand/5 shadow-xs'
                  : 'border-line bg-white hover:border-brand/40 hover:bg-mist/30'
              }`}
            >
              {/* Group Info Row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="h-3.5 w-3.5 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-extrabold text-sm text-ink sm:text-base truncate">
                    {stat.name}
                  </span>
                  {stat.leadTeacher && (
                    <span className="hidden sm:inline-block rounded-md bg-mist px-2 py-0.5 text-[11px] font-semibold text-ink/60">
                      Lead: {stat.leadTeacher}
                    </span>
                  )}
                </div>

                {/* Actual attendance figures */}
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold text-ink/60">
                    <strong className="text-sm font-black text-ink">{stat.presentCount}</strong> / {stat.totalStudents} present
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-black"
                    style={{
                      backgroundColor: `${color}18`,
                      color: color,
                    }}
                  >
                    {stat.rate}%
                  </span>
                </div>
              </div>

              {/* Graphical Bar */}
              <div className="mt-3">
                <div
                  className="h-4 w-full rounded-full bg-mist overflow-hidden relative"
                  style={{ width: `${percentWidth}%` }}
                >
                  {/* Background capacity container bar */}
                  <div className="absolute inset-0 bg-line/40 rounded-full" />
                  {/* Filled attendance bar */}
                  <div
                    className="h-full rounded-full transition-all duration-500 relative"
                    style={{
                      width: `${presentWidth}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>

              {/* Interactive Expanded Detail on Tap */}
              {isSelected && (
                <div className="mt-3.5 pt-3 border-t border-line/60 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 animate-in fade-in duration-150">
                  <div>
                    <span className="text-ink/50 block">Lead Teacher</span>
                    <strong className="text-ink font-bold">{stat.leadTeacher || 'Not assigned'}</strong>
                  </div>
                  <div>
                    <span className="text-ink/50 block">Assigned Roster</span>
                    <strong className="text-ink font-bold">{stat.totalStudents} students</strong>
                  </div>
                  <div>
                    <span className="text-ink/50 block">Present Today</span>
                    <strong className="text-ink font-bold text-ok">{stat.presentCount} checked in</strong>
                  </div>
                  <div>
                    <span className="text-ink/50 block">Absent Today</span>
                    <strong className="text-ink font-bold text-red-700">
                      {Math.max((stat.totalStudents || 0) - (stat.presentCount || 0), 0)} students
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-ink/50 text-center sm:text-left">
        💡 Tip: Tap any group bar to view lead teacher contact and present vs. absent roster details.
      </p>
    </div>
  )
}
