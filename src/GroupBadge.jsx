// Reusable colour-coded student group badge component

export default function GroupBadge({ group, size = 'sm', showUnassigned = false, className = '' }) {
  if (!group || !group.name) {
    if (!showUnassigned) return null
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-mist font-semibold text-ink/65 ${
          size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'
        } ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-ink/30" />
        Unassigned
      </span>
    )
  }

  const color = group.color || '#0b5d5b'
  const isXs = size === 'xs'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold tracking-tight transition-colors shrink-0 ${
        isXs ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'
      } ${className}`}
      style={{
        backgroundColor: `${color}14`, // ~8% opacity tint
        borderColor: `${color}35`,     // ~20% border
        borderWidth: '1px',
        borderStyle: 'solid',
        color: '#0d2321',              // Crisp ink text for readability
      }}
      title={`Group: ${group.name}${group.lead_teacher?.full_name ? ` · Lead: ${group.lead_teacher.full_name}` : ''}`}
    >
      <span
        className="rounded-full shrink-0"
        style={{
          backgroundColor: color,
          width: isXs ? '6px' : '7px',
          height: isXs ? '6px' : '7px',
        }}
      />
      <span className="truncate max-w-[140px]">{group.name}</span>
    </span>
  )
}

