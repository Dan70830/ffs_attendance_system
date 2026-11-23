import { useState } from 'react'
import { supabase } from './supabase'
import {
  Brand,
  SignOutIcon,
  UsersIcon,
  CalendarIcon,
  BarChartIcon,
  MenuIcon,
  XIcon,
  DashboardIcon,
  GraduationCapIcon,
  LayersIcon,
  SettingsIcon,
  HelpCircleIcon,
} from './Icons'

function getInitials(name) {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function AppLayout({
  profile,
  currentScreen,
  currentTab = 'overview',
  onNavigate,
  onSignOut,
  counts = {},
  children,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isPrincipal = profile?.role === 'principal'
  const initials = getInitials(profile?.full_name)

  function handleNav(screen, tab) {
    setMobileMenuOpen(false)
    if (onNavigate) {
      onNavigate(screen, tab)
    }
  }

  function handleSignOut() {
    setMobileMenuOpen(false)
    if (onSignOut) {
      onSignOut()
    } else {
      supabase.auth.signOut()
    }
  }

  // Active check helpers
  const isDashboardActive = currentScreen === 'home' && currentTab === 'overview'
  const isAttendanceActive = currentScreen === 'attendance' || currentScreen === 'event'
  const isAssignedGroupActive = currentScreen === 'home' && currentTab === 'assigned-group'
  const isStudentsActive =
    (currentScreen === 'home' && currentTab === 'students') || currentScreen === 'student'
  const isTeachersActive = currentScreen === 'manage-teachers'
  const isGroupsActive = currentScreen === 'manage-groups'
  const isReportsActive = currentScreen === 'reports'

  return (
    <div className="min-h-screen bg-[#f8faf9] text-ink flex flex-col lg:flex-row">
      {/* ============================================================== */}
      {/* DESKTOP PERMANENT DOCKED SIDEBAR (>= 1024px)                  */}
      {/* ============================================================== */}
      <aside className="hidden lg:flex w-64 flex-col justify-between border-r border-line bg-white shrink-0 sticky top-0 h-screen p-5 z-20">
        <div className="space-y-6">
          {/* Brand Logo & Name */}
          <div className="px-1 py-1">
            <Brand />
          </div>

          {/* MAIN Navigation Section */}
          <div>
            <p className="px-3 text-[11px] font-extrabold uppercase tracking-wider text-ink/40">
              Main
            </p>
            <nav className="mt-2 space-y-1">
              {/* Dashboard */}
              <button
                type="button"
                onClick={() => handleNav('home', 'overview')}
                className={`flex w-full min-h-[42px] items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                  isDashboardActive
                    ? 'bg-brand/10 text-brand'
                    : 'text-ink/70 hover:bg-mist hover:text-ink'
                }`}
              >
                <DashboardIcon className="h-4 w-4" />
                <span>Dashboard</span>
              </button>

              {/* Attendance */}
              <button
                type="button"
                onClick={() => handleNav('attendance')}
                className={`flex w-full min-h-[42px] items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                  isAttendanceActive
                    ? 'bg-brand/10 text-brand'
                    : 'text-ink/70 hover:bg-mist hover:text-ink'
                }`}
              >
                <CalendarIcon className="h-4 w-4 text-inherit" />
                <span>Attendance</span>
              </button>

              {/* Assigned Group (Between Attendance and Students for Teachers) */}
              {(!isPrincipal || (counts.myAssignedStudentsCount !== undefined && counts.myAssignedStudentsCount > 0)) && (
                <button
                  type="button"
                  onClick={() => handleNav('home', 'assigned-group')}
                  className={`flex w-full min-h-[42px] items-center justify-between rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                    isAssignedGroupActive
                      ? 'bg-brand/10 text-brand'
                      : 'text-ink/70 hover:bg-mist hover:text-ink'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <LayersIcon className="h-4 w-4 text-inherit" />
                    <span>Assigned Group</span>
                  </div>
                  {counts.myAssignedStudentsCount !== undefined && counts.myAssignedStudentsCount > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        isAssignedGroupActive ? 'bg-brand/15 text-brand' : 'bg-mist text-ink/60'
                      }`}
                    >
                      {counts.myAssignedStudentsCount}
                    </span>
                  )}
                </button>
              )}

              {/* Students */}
              <button
                type="button"
                onClick={() => handleNav('home', 'students')}
                className={`flex w-full min-h-[42px] items-center justify-between rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                  isStudentsActive
                    ? 'bg-brand/10 text-brand'
                    : 'text-ink/70 hover:bg-mist hover:text-ink'
                }`}
              >
                <div className="flex items-center gap-3">
                  <UsersIcon className="h-4 w-4" />
                  <span>Students</span>
                </div>
                {counts.students !== undefined && counts.students > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      isStudentsActive ? 'bg-brand/15 text-brand' : 'bg-mist text-ink/60'
                    }`}
                  >
                    {counts.students}
                  </span>
                )}
              </button>

              {/* Principal-only routes */}
              {isPrincipal && (
                <>
                  <button
                    type="button"
                    onClick={() => handleNav('manage-teachers')}
                    className={`flex w-full min-h-[42px] items-center justify-between rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                      isTeachersActive
                        ? 'bg-brand/10 text-brand'
                        : 'text-ink/70 hover:bg-mist hover:text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <GraduationCapIcon className="h-4 w-4 text-inherit" />
                      <span>Teachers</span>
                    </div>
                    {counts.pendingTeachers > 0 && (
                      <span className="rounded-full bg-amber-500 text-white text-[10px] font-black px-2 py-0.5">
                        {counts.pendingTeachers}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNav('manage-groups')}
                    className={`flex w-full min-h-[42px] items-center justify-between rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                      isGroupsActive
                        ? 'bg-brand/10 text-brand'
                        : 'text-ink/70 hover:bg-mist hover:text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <LayersIcon className="h-4 w-4 text-inherit" />
                      <span>Groups</span>
                    </div>
                    {counts.groups !== undefined && counts.groups > 0 && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                          isGroupsActive ? 'bg-brand/15 text-brand' : 'bg-mist text-ink/60'
                        }`}
                      >
                        {counts.groups}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNav('reports')}
                    className={`flex w-full min-h-[42px] items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                      isReportsActive
                        ? 'bg-brand/10 text-brand'
                        : 'text-ink/70 hover:bg-mist hover:text-ink'
                    }`}
                  >
                    <BarChartIcon className="h-4 w-4 text-inherit" />
                    <span>Reports</span>
                  </button>
                </>
              )}
            </nav>
          </div>

          {/* SYSTEM Navigation Section */}
          <div>
            <p className="px-3 text-[11px] font-extrabold uppercase tracking-wider text-ink/40">
              System
            </p>
            <nav className="mt-2 space-y-1">
              <button
                type="button"
                onClick={() => {
                  if (isPrincipal) handleNav('manage-teachers')
                }}
                className="flex w-full min-h-[40px] items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-bold text-ink/65 transition-all hover:bg-mist hover:text-ink cursor-pointer"
              >
                <SettingsIcon className="h-4 w-4 text-ink/50" />
                <span>Settings</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  alert(
                    'Firm Foundation School Attendance System.\nNeed assistance? Contact school admin.'
                  )
                }}
                className="flex w-full min-h-[40px] items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-bold text-ink/65 transition-all hover:bg-mist hover:text-ink cursor-pointer"
              >
                <HelpCircleIcon className="h-4 w-4 text-ink/50" />
                <span>Help & Support</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Profile Pill at bottom of Sidebar */}
        <div className="border-t border-line/80 pt-4">
          <div className="flex items-center justify-between rounded-xl p-2 transition-colors hover:bg-mist">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-xs font-black text-white shadow-2xs">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-ink">
                  {profile?.full_name || 'James Adeniyi'}
                </p>
                <p className="text-[11px] font-medium text-ink/60 capitalize">
                  {isPrincipal ? 'Principal' : 'Teacher'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out"
              className="rounded-lg p-1.5 text-ink/40 hover:bg-line/50 hover:text-red transition-colors cursor-pointer"
            >
              <SignOutIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* MOBILE & TABLET TOP HEADER (< 1024px)                          */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <Brand />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
            className="flex items-center gap-2 rounded-xl border border-line bg-mist/60 px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:bg-mist active:scale-95 cursor-pointer"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand text-[10px] font-black text-white">
              {initials}
            </span>
            <span className="capitalize hidden xs:inline">{isPrincipal ? 'Principal' : 'Teacher'}</span>
            <MenuIcon className="h-4 w-4 text-ink/60" />
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* MAIN VIEWPORT                                                  */}
      {/* ============================================================== */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </main>

      {/* ============================================================== */}
      {/* MOBILE SLIDE-OUT MENU DRAWER (< 1024px)                        */}
      {/* ============================================================== */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex justify-end bg-ink/60 backdrop-blur-xs animate-in fade-in duration-150 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-xs flex-col justify-between bg-white p-6 shadow-2xl animate-in slide-in-from-right duration-200"
          >
            <div className="space-y-6">
              {/* Header with Close */}
              <div className="flex items-center justify-between border-b border-line pb-4">
                <Brand />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg bg-mist text-ink/70 hover:text-ink transition-colors cursor-pointer"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>

              {/* User Identity Card */}
              <div className="rounded-xl border border-line bg-mist/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-black text-white">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold text-ink text-sm">
                      {profile?.full_name || 'James Adeniyi'}
                    </p>
                    <p className="truncate text-xs text-ink/65">{profile?.email || ''}</p>
                    <span className="mt-1 inline-block rounded-md bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">
                      {isPrincipal ? 'Principal Account' : 'Teacher Account'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Options */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink/40 px-2">
                  Navigation
                </p>

                <button
                  type="button"
                  onClick={() => handleNav('home', 'overview')}
                  className={`flex w-full min-h-[42px] items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                    isDashboardActive ? 'bg-brand/10 text-brand' : 'hover:bg-mist text-ink/75'
                  }`}
                >
                  <DashboardIcon className="h-4 w-4" />
                  <span>Dashboard Overview</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNav('attendance')}
                  className={`flex w-full min-h-[42px] items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                    isAttendanceActive ? 'bg-brand/10 text-brand' : 'hover:bg-mist text-ink/75'
                  }`}
                >
                  <CalendarIcon className="h-4 w-4" />
                  <span>Attendance</span>
                </button>

                {/* Assigned Group (Between Attendance and Students for Teachers) */}
                {(!isPrincipal || (counts.myAssignedStudentsCount !== undefined && counts.myAssignedStudentsCount > 0)) && (
                  <button
                    type="button"
                    onClick={() => handleNav('home', 'assigned-group')}
                    className={`flex w-full min-h-[42px] items-center justify-between rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                      isAssignedGroupActive ? 'bg-brand/10 text-brand' : 'hover:bg-mist text-ink/75'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <LayersIcon className="h-4 w-4" />
                      <span>Assigned Group</span>
                    </div>
                    {counts.myAssignedStudentsCount !== undefined && counts.myAssignedStudentsCount > 0 && (
                      <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-extrabold text-ink/60">
                        {counts.myAssignedStudentsCount}
                      </span>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleNav('home', 'students')}
                  className={`flex w-full min-h-[42px] items-center justify-between rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                    isStudentsActive ? 'bg-brand/10 text-brand' : 'hover:bg-mist text-ink/75'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <UsersIcon className="h-4 w-4" />
                    <span>Students Directory</span>
                  </div>
                  {counts.students !== undefined && counts.students > 0 && (
                    <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-extrabold text-ink/60">
                      {counts.students}
                    </span>
                  )}
                </button>

                {isPrincipal && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleNav('manage-teachers')}
                      className={`flex w-full min-h-[42px] items-center justify-between rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                        isTeachersActive ? 'bg-brand/10 text-brand' : 'hover:bg-mist text-ink/75'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <GraduationCapIcon className="h-4 w-4" />
                        <span>Manage Teachers</span>
                      </div>
                      {counts.pendingTeachers > 0 && (
                        <span className="rounded-full bg-amber-500 text-white text-[10px] font-black px-2 py-0.5">
                          {counts.pendingTeachers}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNav('manage-groups')}
                      className={`flex w-full min-h-[42px] items-center justify-between rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                        isGroupsActive ? 'bg-brand/10 text-brand' : 'hover:bg-mist text-ink/75'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <LayersIcon className="h-4 w-4" />
                        <span>Student Groups</span>
                      </div>
                      {counts.groups !== undefined && counts.groups > 0 && (
                        <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-extrabold text-ink/60">
                          {counts.groups}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNav('reports')}
                      className={`flex w-full min-h-[42px] items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                        isReportsActive ? 'bg-brand/10 text-brand' : 'hover:bg-mist text-ink/75'
                      }`}
                    >
                      <BarChartIcon className="h-4 w-4" />
                      <span>Reports & Analytics</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="border-t border-line pt-4 space-y-2">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full min-h-[42px] items-center justify-center gap-2 rounded-xl border border-line bg-mist px-4 py-2 text-xs font-bold text-red hover:bg-line/50 transition-colors cursor-pointer"
              >
                <SignOutIcon className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
