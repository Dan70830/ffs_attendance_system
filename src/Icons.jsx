const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const CheckIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)

export const UndoIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}><path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" /></svg>
)

export const UserPlusIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}><circle cx="10" cy="8" r="4" /><path d="M3 20c0-3.5 3-6 7-6M18 9v6M15 12h6" /></svg>
)

export const SignOutIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}><path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9" /></svg>
)

export const ArrowRightIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)

export const ArrowLeftIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
)

export const ChevronRightIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}><path d="M9 18l6-6-6-6" /></svg>
)

export const SearchIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

export const PlusIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

export const CalendarIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

export const DoorOpenIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14" />
    <path d="M2 20h20" />
    <path d="M14 12v.01" />
  </svg>
)

export const UsersIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <circle cx="9" cy="7" r="4" />
    <path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    <path d="M16 3.13a4 4 0 010 7.75" />
    <path d="M22 20c0-2.8-2.2-5.1-5-5.8" />
  </svg>
)

export const ShieldCheckIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)

export const ClockIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

export const CheckCircleIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M8.5 12.5l2.5 2.5 4.5-5" />
  </svg>
)

export const BarChartIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
)

export const DownloadIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

export const AlertCircleIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

export const MenuIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)

export const XIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

export function Brand({ onDark = false }) {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
      <span
        className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-xs sm:text-sm font-extrabold shadow-2xs ${
          onDark ? 'bg-white text-brand' : 'bg-brand text-white'
        }`}
      >
        FFS
      </span>
      <span
        className={`text-sm sm:text-base font-extrabold tracking-tight truncate ${
          onDark ? 'text-white' : 'text-ink'
        }`}
      >
        Attendance System
      </span>
    </div>
  )
}
