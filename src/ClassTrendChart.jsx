import { useMemo, useState } from 'react'

// Helper to compute clean integer ticks for the vertical Y-axis
function getIntegerTicks(maxVal) {
  if (maxVal <= 0) return { niceMax: 10, ticks: [0, 2, 4, 6, 8, 10] }
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

function formatLagosDateShort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(`${dateStr}T12:00:00`)
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Africa/Lagos',
  })
}

// Generate smooth cubic bezier spline through points using Catmull-Rom tangents
function generateSmoothSpline(points) {
  if (!points || points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  if (points.length === 2) {
    const dx = points[1].x - points[0].x
    return `M ${points[0].x} ${points[0].y} C ${points[0].x + dx * 0.45} ${points[0].y}, ${points[0].x + dx * 0.55} ${points[1].y}, ${points[1].x} ${points[1].y}`
  }

  let d = `M ${points[0].x} ${points[0].y}`

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2]

    // Tangents scaled for smooth curvature
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }

  return d
}

export default function ClassTrendChart({
  sessions = [],
  onSelectSession,
  totalActiveStudents = 0,
}) {
  const [scopeFilter, setScopeFilter] = useState('10') // '5' | '10' | 'all'
  const [accentColor, setAccentColor] = useState('amber') // 'amber' (matching ref image) | 'brand' (FFS teal)
  const [hoveredIndex, setHoveredIndex] = useState(null)

  // Filter sessions according to scope (sorted chronologically: oldest -> newest, left to right)
  const chartSessions = useMemo(() => {
    if (!sessions || sessions.length === 0) return []
    // Ensure chronological ordering by date
    const sorted = [...sessions].sort((a, b) => {
      if (a.event_date === b.event_date) {
        return (a.created_at || '').localeCompare(b.created_at || '')
      }
      return (a.event_date || '').localeCompare(b.event_date || '')
    })

    if (scopeFilter === '5') return sorted.slice(-5)
    if (scopeFilter === '10') return sorted.slice(-10)
    return sorted
  }, [sessions, scopeFilter])

  // Active session index: either hovered, or defaults to the latest session (last in chronological array)
  const activeIndex = useMemo(() => {
    if (chartSessions.length === 0) return null
    if (hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < chartSessions.length) {
      return hoveredIndex
    }
    return chartSessions.length - 1 // Default to latest session
  }, [chartSessions, hoveredIndex])

  // Highest headcount for Y scale
  const maxHeadcount = useMemo(() => {
    if (chartSessions.length === 0) return 10
    const counts = chartSessions.map((s) => s.presentCount || 0)
    const max = Math.max(...counts, 0)
    // Also include total active students as reasonable ceiling if available
    return Math.max(max, 5)
  }, [chartSessions])

  const { niceMax, ticks } = useMemo(() => {
    return getIntegerTicks(maxHeadcount)
  }, [maxHeadcount])

  // SVG coordinate dimensions
  const slotWidth = 86
  const marginLeft = 56
  const marginRight = 44
  const marginTop = 36
  const marginBottom = 64
  const plotHeight = 220
  const chartHeight = marginTop + plotHeight + marginBottom
  const plotWidth = Math.max(chartSessions.length * slotWidth, 420)
  const chartWidth = marginLeft + plotWidth + marginRight

  // Map each session to an (x, y) coordinate
  const points = useMemo(() => {
    if (chartSessions.length === 0) return []
    const count = chartSessions.length

    return chartSessions.map((session, index) => {
      // Evenly distribute X across plotWidth
      const x =
        count === 1
          ? marginLeft + plotWidth / 2
          : marginLeft + (index / (count - 1)) * plotWidth

      // Invert Y: 0 at plotHeight (bottom), niceMax at 0 (top)
      const ratio = niceMax > 0 ? (session.presentCount || 0) / niceMax : 0
      const y = marginTop + plotHeight - ratio * plotHeight

      return {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        session,
        index,
      }
    })
  }, [chartSessions, plotWidth, marginLeft, marginTop, plotHeight, niceMax])

  // Spline line and area path
  const linePath = useMemo(() => generateSmoothSpline(points), [points])

  const areaPath = useMemo(() => {
    if (points.length === 0) return ''
    const baselineY = marginTop + plotHeight
    if (points.length === 1) {
      return `M ${points[0].x - 20} ${baselineY} L ${points[0].x - 20} ${points[0].y} L ${points[0].x + 20} ${points[0].y} L ${points[0].x + 20} ${baselineY} Z`
    }
    const firstX = points[0].x
    const lastX = points[points.length - 1].x
    return `${linePath} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`
  }, [points, linePath, marginTop, plotHeight])

  const activePoint = points[activeIndex] || null

  // Color theme constants
  const strokeColor = accentColor === 'brand' ? '#0b5d5b' : '#f59e0b'

  if (chartSessions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-mist/30 p-10 text-center">
        <p className="text-sm font-bold text-ink/70">No class sessions recorded yet</p>
        <p className="mt-1 text-xs text-ink/50">
          Attendance trend will appear here as soon as class sessions are conducted.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-xs sm:p-7 space-y-6">
      {/* Top Header Row matching Reference Design */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-ink tracking-tight sm:text-xl">
              Class Attendance Trend
            </h3>
            <span className="inline-flex items-center rounded-full bg-mist px-2.5 py-0.5 text-[11px] font-bold text-ink/70">
              {chartSessions.length} {chartSessions.length === 1 ? 'Session' : 'Sessions'}
            </span>
          </div>
          <p className="text-xs text-ink/60 mt-0.5">
            Vertical: Number of students present · Horizontal: Class / session
          </p>
        </div>

        {/* Filter & Theme controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Color theme pill */}
          <div className="inline-flex items-center rounded-xl border border-line bg-mist/50 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setAccentColor('amber')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                accentColor === 'amber'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-ink/60 hover:text-ink'
              }`}
            >
              Golden Amber
            </button>
            <button
              type="button"
              onClick={() => setAccentColor('brand')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                accentColor === 'brand'
                  ? 'bg-brand text-white shadow-2xs'
                  : 'text-ink/60 hover:text-ink'
              }`}
            >
              FFS Teal
            </button>
          </div>

          {/* Timeframe Scope Selector */}
          <div className="relative">
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              className="appearance-none rounded-xl border border-line bg-white py-1.5 pl-3.5 pr-8 text-xs font-bold text-ink shadow-2xs hover:bg-mist transition-colors cursor-pointer focus:border-brand focus:outline-hidden"
            >
              <option value="5">Recent 5 Sessions</option>
              <option value="10">Recent 10 Sessions</option>
              <option value="all">All Sessions</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-ink/50 text-xs">
              ▼
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Chart Container */}
      <div className="relative w-full overflow-x-auto scrollbar-thin pb-2">
        <div
          className="relative mx-auto select-none"
          style={{ width: chartWidth, minWidth: '100%', maxWidth: '100%' }}
        >
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full overflow-visible"
            style={{ height: 'auto', display: 'block' }}
          >
            <defs>
              <linearGradient id="classAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
                <stop offset="60%" stopColor={strokeColor} stopOpacity="0.08" />
                <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
              </linearGradient>

              {/* Drop shadow filter for active point */}
              <filter id="pointShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2" />
              </filter>
            </defs>

            {/* Horizontal Gridlines & Y-Axis Labels */}
            {ticks.map((tick) => {
              const ratio = niceMax > 0 ? tick / niceMax : 0
              const y = marginTop + plotHeight - ratio * plotHeight
              return (
                <g key={`tick-${tick}`}>
                  <line
                    x1={marginLeft}
                    y1={y}
                    x2={chartWidth - marginRight}
                    y2={y}
                    stroke="#edf1f0"
                    strokeWidth="1"
                  />
                  <text
                    x={marginLeft - 14}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-ink/45 text-[11px] font-semibold font-mono"
                  >
                    {tick}
                  </text>
                </g>
              )
            })}

            {/* Smooth Spline Area Gradient */}
            {areaPath && <path d={areaPath} fill="url(#classAreaGrad)" />}

            {/* Smooth Spline Curve Line */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke={strokeColor}
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Point Dots along the Spline */}
            {points.map((pt) => {
              const isActive = activePoint && activePoint.index === pt.index
              return (
                <g key={`pt-${pt.index}`} className="cursor-pointer">
                  {/* Outer halo on active */}
                  {isActive && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="9"
                      fill={strokeColor}
                      fillOpacity="0.2"
                      className="animate-pulse"
                    />
                  )}
                  {/* Main dot */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isActive ? '5.5' : '4'}
                    fill="#ffffff"
                    stroke={strokeColor}
                    strokeWidth={isActive ? '3' : '2'}
                    filter="url(#pointShadow)"
                  />
                </g>
              )
            })}

            {/* Reference Design Hover Marker: Dashed Line with Top & Bottom Arrow Caps */}
            {activePoint && (
              <g pointerEvents="none" className="transition-all duration-150">
                {/* Vertical Dashed Line */}
                <line
                  x1={activePoint.x}
                  y1={marginTop - 4}
                  x2={activePoint.x}
                  y2={marginTop + plotHeight + 4}
                  stroke="#111827"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                {/* Top downward triangle cap ▼ */}
                <polygon
                  points={`${activePoint.x - 4.5},${marginTop - 6} ${activePoint.x + 4.5},${marginTop - 6} ${activePoint.x},${marginTop}`}
                  fill="#111827"
                />

                {/* Bottom upward triangle cap ▲ */}
                <polygon
                  points={`${activePoint.x - 4.5},${marginTop + plotHeight + 6} ${activePoint.x + 4.5},${marginTop + plotHeight + 6} ${activePoint.x},${marginTop + plotHeight}`}
                  fill="#111827"
                />
              </g>
            )}

            {/* X-Axis Baseline */}
            <line
              x1={marginLeft}
              y1={marginTop + plotHeight}
              x2={chartWidth - marginRight}
              y2={marginTop + plotHeight}
              stroke="#d5dedc"
              strokeWidth="1.5"
            />

            {/* X-Axis Labels (Class / Session Names & Dates) */}
            {points.map((pt) => {
              const isActive = activePoint && activePoint.index === pt.index
              const title = pt.session.title || `Class ${pt.index + 1}`
              const shortTitle = title.length > 14 ? `${title.slice(0, 12)}…` : title
              const dateStr = formatLagosDateShort(pt.session.event_date)

              return (
                <g
                  key={`xlabel-${pt.index}`}
                  className="cursor-pointer"
                  onClick={() => onSelectSession && onSelectSession(pt.session.id)}
                >
                  {/* Primary Class / Session Title */}
                  <text
                    x={pt.x}
                    y={marginTop + plotHeight + 20}
                    textAnchor="middle"
                    className={`text-[12px] transition-colors ${
                      isActive ? 'fill-ink font-extrabold' : 'fill-ink/75 font-bold'
                    }`}
                  >
                    {shortTitle}
                  </text>

                  {/* Secondary Date */}
                  <text
                    x={pt.x}
                    y={marginTop + plotHeight + 35}
                    textAnchor="middle"
                    className={`text-[10px] ${
                      isActive ? 'fill-brand font-bold' : 'fill-ink/45 font-medium'
                    }`}
                  >
                    {dateStr}
                  </text>
                </g>
              )
            })}

            {/* Invisible Hit-Test Columns for Silky Mouse / Touch Hover */}
            {points.map((pt, i) => {
              const prevX = i === 0 ? marginLeft : (points[i - 1].x + pt.x) / 2
              const nextX =
                i === points.length - 1
                  ? chartWidth - marginRight
                  : (pt.x + points[i + 1].x) / 2
              const width = Math.max(nextX - prevX, 10)

              return (
                <rect
                  key={`hit-${pt.index}`}
                  x={prevX}
                  y={marginTop}
                  width={width}
                  height={plotHeight + 50}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(pt.index)}
                  onClick={() => {
                    setHoveredIndex(pt.index)
                    if (onSelectSession) onSelectSession(pt.session.id)
                  }}
                />
              )
            })}
          </svg>

          {/* Floating Dark Tooltip Card matching Reference Design */}
          {activePoint && (
            <div
              className="pointer-events-none absolute z-30 transition-all duration-150 ease-out"
              style={{
                left: `${(activePoint.x / chartWidth) * 100}%`,
                top: `${((activePoint.y - 12) / chartHeight) * 100}%`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div className="relative rounded-xl bg-ink/95 backdrop-blur-xs text-white shadow-xl px-3.5 py-2 text-center border border-white/10 min-w-[124px]">
                {/* Title */}
                <p className="text-[11px] font-medium text-white/70 truncate max-w-[150px]">
                  {activePoint.session.title || 'Class Session'}
                </p>

                {/* Headcount Number */}
                <p className="text-lg font-black text-white tracking-tight leading-none mt-0.5">
                  {activePoint.session.presentCount || 0}
                  <span className="text-[11px] font-bold text-white/75 ml-1">
                    {activePoint.session.presentCount === 1 ? 'Student' : 'Students'}
                  </span>
                </p>

                {/* Turnout rate or date */}
                <div className="mt-1 flex items-center justify-center gap-1.5 text-[10px] font-bold">
                  <span className="text-amber-400">
                    {activePoint.session.rate || 0}% turnout
                  </span>
                  <span className="text-white/40">·</span>
                  <span className="text-white/60">
                    {formatLagosDateShort(activePoint.session.event_date)}
                  </span>
                </div>

                {/* Bottom subtle triangle beak */}
                <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-ink/95 rotate-45 border-r border-b border-white/10" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Session Spotlight Bar below the chart */}
      {activePoint && (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-mist/40 p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: strokeColor }}
            />
            <div>
              <p className="text-xs font-bold text-ink">
                Selected Class:{' '}
                <span className="font-extrabold text-brand">
                  {activePoint.session.title}
                </span>{' '}
                <span className="text-ink/50 font-normal">
                  ({formatLagosDateShort(activePoint.session.event_date)})
                </span>
              </p>
              <p className="text-[11px] text-ink/65">
                {activePoint.session.presentCount} attended out of{' '}
                {totalActiveStudents || activePoint.session.presentCount} registered
                students ({activePoint.session.rate}% attendance rate).
              </p>
            </div>
          </div>

          {onSelectSession && (
            <button
              type="button"
              onClick={() => onSelectSession(activePoint.session.id)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white border border-line px-3 py-1.5 text-xs font-bold text-ink hover:bg-mist transition-colors shadow-2xs cursor-pointer active:scale-95"
            >
              <span>View who came / missed</span>
              <span className="text-brand">→</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
