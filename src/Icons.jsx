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

export const ChevronDownIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}><path d="M6 9l6 6 6-6" /></svg>
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

export const MailIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
)

export const EyeIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

export const EyeOffIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

export const TagIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
)

export const EditIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

export const TrashIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
)

export const DashboardIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </svg>
)

export const GraduationCapIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
)

export const LayersIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
)

export const BellIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

export const SettingsIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

export const HelpCircleIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

export const BookOpenIcon = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
)

export const Brand = ({ onDark = false }) => {
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
