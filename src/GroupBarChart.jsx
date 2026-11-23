// Vertical column bar chart for Student Groups (matching the Cartesian sketch: Y = No of student, X = Group)

import { useMemo, useState } from 'react'

// Helper to compute clean integer ticks for the vertical Y-axis
function getIntegerTicks(maxVal) {
  if (maxVal <= 0) return { niceMax: 5, ticks: [0, 1, 2, 3, 4, 5] }
  if (maxVal <= 5) return { niceMax: 5, ticks: [0, 1, 2, 3, 4, 5] }
  if (maxVal <= 10) return { niceMax: 10, ticks: [0, 2, 4, 6, 8, 10] }
  if (maxVal <= 20) return { niceMax: 20, ticks: [0, 5, 10, 15, 20] }
  if (maxVal <= 40) return { niceMax: 40, ticks: [0, 10, 20, 30, 40] }
  if (maxVal <= 60) return { niceMax: 60, ticks: [0, 15, 30, 45, 60] }
  if (maxVal <= 100) return { niceMax: 100, ticks: [0, 25, 50, 75, 100] }

  const roughStep = maxVal / 4
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)))
  const stepFraction = roughStep / magnitude
  let step = 10 * magnitude
  if (stepFraction <= 1.2) step = 1 * magnitude
  else if (stepFraction <= 2.5) step = 2 * magnitude
  else if (stepFraction <= 5) step = 5 * magnitude

  const niceMax = Math.ceil(maxVal / step) * step
  const ticks = []
  for (let t = 0; t <= niceMax; t += step) {
    ticks.push(t)
  }
  return { niceMax, ticks }
}

export default function GroupBarChart({ groupStats = [], eventTitle = 'Selected Session' }) {
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [viewMetric, setViewMetric] = useState('count') // 'count' (exact number) | 'rate' (%)

  // Sort groups: preserve order or sort by presentCount descending
  const stats = useMemo(() => {
    return [...groupStats]
  }, [groupStats])

  const totalAssigned = useMemo(
    () => stats.reduce((acc, g) => acc + (g.totalStudents || 0), 0),
    [stats]
  )
  const totalPresent = useMemo(
    () => stats.reduce((acc, g) => acc + (g.presentCount || 0), 0),
    [stats]
  )
  const overallRate = totalAssigned > 0 ? Math.round((totalPresent / totalAssigned) * 100) : 0

  const topGroup = useMemo(() => {
    if (stats.length === 0) return null
    return [...stats].sort((a, b) => (b.presentCount || 0) - (a.presentCount || 0))[0]
  }, [stats])

  const selectedGroup = useMemo(
    () => stats.find((g) => g.id === selectedGroupId) || null,
    [stats, selectedGroupId]
  )

  // Maximum attendance count among groups
  const maxPresent = useMemo(() => {
    return Math.max(...stats.map((s) => s.presentCount || 0), 0)
  }, [stats])

  // Compute Y-axis scale and tick marks
  const { niceMax, ticks } = useMemo(() => {
    if (viewMetric === 'rate') {
      return { niceMax: 100, ticks: [0, 25, 50, 75, 100] }
    }
    return getIntegerTicks(maxPresent)
  }, [maxPresent, viewMetric])

  if (!stats || stats.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-mist/30 p-8 text-center">
        <p className="text-sm font-bold text-ink/60">No student groups found.</p>
        <p className="mt-1 text-xs text-ink/40">
          Create student groups in Principal Controls to view group-based analytics.
        </p>
      </div>
    )
  }

  // Layout dimensions for SVG
  // Give comfortable slot per group (at least 90px each), with minimum overall chart width
  const slotWidth = 92
  const marginLeft = 68
  const marginRight = 28
  const marginTop = 50
  const marginBottom = 80
  const plotHeight = 230
  const chartHeight = marginTop + plotHeight + marginBottom
  const plotWidth = Math.max(stats.length * slotWidth, 440)
  const chartWidth = marginLeft + plotWidth + marginRight

  return (
    <div className="space-y-6">
      {/* Header with Title and Mode Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-ink sm:text-lg">
              Attendance by Group (Bar Chart)
            </h3>
            <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-bold text-brand">
              Visual Analytics
            </span>
          </div>
          <p className="mt-0.5 text-xs text-ink/60">
            {eventTitle} · {stats.length} {stats.length === 1 ? 'group' : 'groups'} compared
          </p>
        </div>

        {/* View Metric Switcher */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-line bg-mist p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMetric('count')}
              className={`min-h-[34px] rounded-md px-3 py-1.5 transition-all cursor-pointer ${
                viewMetric === 'count'
                  ? 'bg-white text-ink shadow-xs font-bold'
                  : 'text-ink/65 hover:text-ink'
              }`}
            >
              Exact Count (No. of Students)
            </button>
            <button
              type="button"
              onClick={() => setViewMetric('rate')}
              className={`min-h-[34px] rounded-md px-3 py-1.5 transition-all cursor-pointer ${
                viewMetric === 'rate'
                  ? 'bg-white text-ink shadow-xs font-bold'
                  : 'text-ink/65 hover:text-ink'
              }`}
            >
              Turnout Rate (%)
            </button>
          </div>
        </div>
      </div>

      {/* Quick Summary Pill Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-mist/50 p-3">
          <span className="block text-xs font-semibold text-ink/70">
            Total students present
          </span>
          <strong className="mt-0.5 block text-lg font-extrabold text-brand sm:text-xl">
            {totalPresent}
          </strong>
          <span className="text-xs text-ink/55">across all groups</span>
        </div>

        <div className="rounded-xl border border-line bg-mist/50 p-3">
          <span className="block text-xs font-semibold text-ink/70">
            Total in groups
          </span>
          <strong className="mt-0.5 block text-lg font-extrabold text-ink sm:text-xl">
            {totalAssigned}
          </strong>
          <span className="text-xs text-ink/55">assigned students</span>
        </div>

        <div className="rounded-xl border border-line bg-mist/50 p-3">
          <span className="block text-xs font-semibold text-ink/70">
            Overall turnout
          </span>
          <strong className="mt-0.5 block text-lg font-extrabold text-ok sm:text-xl">
            {overallRate}%
          </strong>
          <span className="text-xs text-ink/55">{totalPresent} of {totalAssigned}</span>
        </div>

        <div className="rounded-xl border border-line bg-mist/50 p-3">
          <span className="block text-xs font-semibold text-ink/70">
            Top attending group
          </span>
          <div className="mt-0.5 flex items-center gap-1.5 truncate">
            {topGroup && (
              <>
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: topGroup.color }}
                />
                <strong className="truncate text-sm font-bold text-ink">
                  {topGroup.name}
                </strong>
                <span className="text-xs font-semibold text-ink/60">({topGroup.presentCount})</span>
              </>
            )}
          </div>
          <span className="text-xs text-ink/55">highest student count</span>
        </div>
      </div>

      {/* THE VERTICAL BAR CHART (Matching the Cartesian sketch) */}
      <div className="relative rounded-xl border border-line bg-white p-3 shadow-xs sm:p-5">
        {/* Horizontal scroll helper cue for mobile screens */}
        <div className="mb-2 flex items-center justify-between text-xs text-ink/60">
          <span className="font-semibold">
            📊 Click any column to inspect group attendance details
          </span>
          <span className="sm:hidden text-ink/40">Scroll horizontally →</span>
        </div>

        <div className="overflow-x-auto pb-2">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            style={{ width: '100%', minWidth: `${Math.min(chartWidth, 680)}px`, height: 'auto' }}
            className="select-none overflow-visible font-sans"
          >
            <defs>
              {stats.map((stat) => {
                const color = stat.color || '#0b5d5b'
                return (
                  <linearGradient
                    key={`grad-${stat.id}`}
                    id={`barGrad-${stat.id}`}
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={color} stopOpacity="1" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.82" />
                  </linearGradient>
                )
              })}
            </defs>

            {/* Y-Axis Label: "No of student" (Handwritten sketch annotation) */}
            <g transform={`translate(${marginLeft - 12}, ${marginTop - 26})`}>
              <text
                x={0}
                y={0}
                textAnchor="start"
                className="fill-ink text-xs font-black tracking-tight"
              >
                No of student {viewMetric === 'count' ? '(Present)' : '(%)'}
              </text>
              <line
                x1={0}
                y1={4}
                x2={0}
                y2={18}
                stroke="#0d2321"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <polyline
                points="-3,8 0,4 3,8"
                fill="none"
                stroke="#0d2321"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </g>

            {/* Y-Axis gridlines and numeric tick labels */}
            {ticks.map((tickVal) => {
              const yRatio = niceMax > 0 ? tickVal / niceMax : 0
              const y = marginTop + plotHeight - yRatio * plotHeight

              return (
                <g key={`tick-${tickVal}`}>
                  {/* Dashed horizontal grid line */}
                  <line
                    x1={marginLeft}
                    y1={y}
                    x2={marginLeft + plotWidth}
                    y2={y}
                    stroke={tickVal === 0 ? '#0d2321' : '#e5e7eb'}
                    strokeWidth={tickVal === 0 ? 1.5 : 1}
                    strokeDasharray={tickVal === 0 ? 'none' : '4 4'}
                  />
                  {/* Numeric tick text */}
                  <text
                    x={marginLeft - 12}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-ink/60 text-[11px] font-bold"
                  >
                    {tickVal}
                    {viewMetric === 'rate' ? '%' : ''}
                  </text>
                  {/* Tick marker notch */}
                  <line
                    x1={marginLeft - 5}
                    y1={y}
                    x2={marginLeft}
                    y2={y}
                    stroke="#9ca3af"
                    strokeWidth="1"
                  />
                </g>
              )
            })}

            {/* Vertical Y-Axis line */}
            <line
              x1={marginLeft}
              y1={marginTop - 8}
              x2={marginLeft}
              y2={marginTop + plotHeight}
              stroke="#0d2321"
              strokeWidth="1.5"
            />

            {/* Horizontal X-Axis baseline */}
            <line
              x1={marginLeft}
              y1={marginTop + plotHeight}
              x2={marginLeft + plotWidth}
              y2={marginTop + plotHeight}
              stroke="#0d2321"
              strokeWidth="2"
            />

            {/* Bars for Each Student Group */}
            {stats.map((stat, index) => {
              const color = stat.color || '#0b5d5b'
              const val = viewMetric === 'count' ? stat.presentCount || 0 : stat.rate || 0
              const barHeight = niceMax > 0 ? (val / niceMax) * plotHeight : 0

              const slotCenter = marginLeft + (index + 0.5) * (plotWidth / stats.length)
              const barWidth = Math.min(Math.max((plotWidth / stats.length) * 0.52, 28), 58)
              const barX = slotCenter - barWidth / 2
              const barY = marginTop + plotHeight - barHeight

              const isSelected = selectedGroupId === stat.id

              return (
                <g
                  key={stat.id}
                  onClick={() => setSelectedGroupId(isSelected ? null : stat.id)}
                  className="cursor-pointer transition-all duration-200"
                  role="button"
                  tabIndex={0}
                  aria-label={`${stat.name}: ${val} students present`}
                >
                  {/* Invisible wide hit area for easy tapping */}
                  <rect
                    x={slotCenter - (plotWidth / stats.length) / 2}
                    y={marginTop}
                    width={plotWidth / stats.length}
                    height={plotHeight + 50}
                    fill="transparent"
                  />

                  {/* Highlight column backdrop when selected */}
                  {isSelected && (
                    <rect
                      x={slotCenter - (plotWidth / stats.length) / 2 + 4}
                      y={marginTop - 8}
                      width={plotWidth / stats.length - 8}
                      height={plotHeight + 46}
                      rx="12"
                      fill={`${color}12`}
                      stroke={color}
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                  )}

                  {/* Vertical Column Bar */}
                  {barHeight > 0 && (
                    <rect
                      x={barX}
                      y={barY}
                      width={barWidth}
                      height={barHeight}
                      rx="6"
                      ry="6"
                      fill={`url(#barGrad-${stat.id})`}
                      stroke={isSelected ? '#0d2321' : color}
                      strokeWidth={isSelected ? 2.5 : 1}
                      filter={isSelected ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' : undefined}
                      className="transition-all duration-300"
                    />
                  )}

                  {/* Baseline zero indicator if 0 students came */}
                  {barHeight === 0 && (
                    <line
                      x1={barX}
                      y1={marginTop + plotHeight - 1}
                      x2={barX + barWidth}
                      y2={marginTop + plotHeight - 1}
                      stroke={color}
                      strokeWidth="3"
                    />
                  )}

                  {/* Exact Number Badge on Top of Bar */}
                  <g
                    transform={`translate(${slotCenter}, ${barY - 14})`}
                    className="transition-transform duration-200"
                  >
                    <rect
                      x={-18}
                      y={-10}
                      width={36}
                      height={20}
                      rx={6}
                      fill={isSelected ? '#0d2321' : color}
                      filter="drop-shadow(0 1px 2px rgba(0,0,0,0.1))"
                    />
                    <text
                      x={0}
                      y={1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#ffffff"
                      className="text-xs font-black"
                    >
                      {val}
                      {viewMetric === 'rate' ? '%' : ''}
                    </text>
                  </g>

                  {/* X-Axis Tick notch */}
                  <line
                    x1={slotCenter}
                    y1={marginTop + plotHeight}
                    x2={slotCenter}
                    y2={marginTop + plotHeight + 6}
                    stroke="#0d2321"
                    strokeWidth="1.5"
                  />

                  {/* Group Label below X-Axis */}
                  <g transform={`translate(${slotCenter}, ${marginTop + plotHeight + 18})`}>
                    {/* Color dot */}
                    <circle cx={-18} cy={0} r={4.5} fill={color} />
                    {/* Group Name */}
                    <text
                      x={-8}
                      y={4}
                      textAnchor="start"
                      className={`text-xs font-extrabold ${
                        isSelected ? 'fill-ink underline' : 'fill-ink'
                      }`}
                    >
                      {stat.name.length > 13 ? `${stat.name.slice(0, 11)}…` : stat.name}
                    </text>
                    {/* Present / Total Sub-caption */}
                    <text
                      x={0}
                      y={18}
                      textAnchor="middle"
                      className="fill-ink/50 text-[10px] font-bold"
                    >
                      {stat.presentCount} of {stat.totalStudents} ({stat.rate}%)
                    </text>
                  </g>
                </g>
              )
            })}

            {/* X-Axis Category Label: "Group" (Handwritten sketch annotation) */}
            <g transform={`translate(${marginLeft + plotWidth / 2}, ${chartHeight - 14})`}>
              <text
                x={0}
                y={0}
                textAnchor="middle"
                className="fill-ink font-black text-sm uppercase tracking-widest"
              >
                — Group —
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* Selected Group Interactive Detail Card */}
      {selectedGroup ? (
        <div
          className="rounded-2xl border p-4 sm:p-5 transition-all shadow-xs animate-in fade-in duration-200"
          style={{
            borderColor: selectedGroup.color || '#0b5d5b',
            backgroundColor: `${selectedGroup.color}0a`,
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3" style={{ borderColor: `${selectedGroup.color}25` }}>
            <div className="flex items-center gap-2.5">
              <span
                className="h-4 w-4 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: selectedGroup.color }}
              />
              <h4 className="text-base font-extrabold text-ink">
                {selectedGroup.name}
              </h4>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-black"
                style={{
                  backgroundColor: `${selectedGroup.color}20`,
                  color: selectedGroup.color,
                }}
              >
                {selectedGroup.rate}% Turnout
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedGroupId(null)}
              className="text-xs font-bold text-ink/60 hover:text-ink cursor-pointer px-2 py-1 rounded-md hover:bg-mist"
            >
              Close detail ✕
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
            <div className="rounded-xl bg-white p-3 border border-line">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50 block">
                Exact Students Present
              </span>
              <strong className="text-lg font-black text-ok block mt-0.5">
                {selectedGroup.presentCount} students
              </strong>
              <span className="text-[11px] text-ink/50">checked in this session</span>
            </div>

            <div className="rounded-xl bg-white p-3 border border-line">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50 block">
                Students Absent
              </span>
              <strong className="text-lg font-black text-red-600 block mt-0.5">
                {Math.max((selectedGroup.totalStudents || 0) - (selectedGroup.presentCount || 0), 0)} students
              </strong>
              <span className="text-[11px] text-ink/50">missed this session</span>
            </div>

            <div className="rounded-xl bg-white p-3 border border-line">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50 block">
                Total Assigned Roster
              </span>
              <strong className="text-lg font-black text-ink block mt-0.5">
                {selectedGroup.totalStudents} students
              </strong>
              <span className="text-[11px] text-ink/50">registered in group</span>
            </div>

            <div className="rounded-xl bg-white p-3 border border-line">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50 block">
                Lead Teacher
              </span>
              <strong className="text-sm font-extrabold text-ink block mt-1">
                {selectedGroup.leadTeacher || 'No lead assigned'}
              </strong>
              <span className="text-[11px] text-ink/50">group supervisor</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-line bg-mist/20 p-3 text-center text-xs text-ink/50">
          💡 Tip: Click any vertical bar in the chart above to inspect that group’s lead teacher and present vs. absent roster.
        </div>
      )}
    </div>
  )
}
