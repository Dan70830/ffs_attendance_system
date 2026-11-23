// Principal Group Management: Create, edit, assign lead teachers, and bulk-assign students

import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  EditIcon,
  PlusIcon,
  SearchIcon,
  TagIcon,
  TrashIcon,
  UsersIcon,
  XIcon,
} from './Icons'
import GroupBadge from './GroupBadge'

const PALETTE = [
  { name: 'Teal', hex: '#0b5d5b' },
  { name: 'Blue', hex: '#1d4ed8' },
  { name: 'Emerald', hex: '#047857' },
  { name: 'Amber', hex: '#b45309' },
  { name: 'Purple', hex: '#7c3aed' },
  { name: 'Rose', hex: '#be123c' },
  { name: 'Indigo', hex: '#4338ca' },
  { name: 'Cyan', hex: '#0e7490' },
]

export default function ManageGroups({ onBack }) {
  const [groups, setGroups] = useState([])
  const [students, setStudents] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState('')
  const [actionBusy, setActionBusy] = useState(false)

  // Create / Edit modal state
  const [groupModal, setGroupModal] = useState(null) // null | { mode: 'create' | 'edit', group?: object }
  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [groupColor, setGroupColor] = useState(PALETTE[0].hex)
  const [groupLeadId, setGroupLeadId] = useState('')
  const [groupFormError, setGroupFormError] = useState('')

  // Bulk student assignment modal state
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [targetGroupId, setTargetGroupId] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set())
  const [bulkSearch, setBulkSearch] = useState('')
  const [bulkFilterGroup, setBulkFilterGroup] = useState('all') // 'all' | 'unassigned' | groupId

  // Delete confirmation modal state
  const [deleteModalGroup, setDeleteModalGroup] = useState(null)

  function showMessage(msg) {
    setFeedback(msg)
    setTimeout(() => setFeedback(''), 4000)
  }

  async function loadAllData() {
    const [groupsRes, studentsRes, teachersRes] = await Promise.all([
      supabase
        .from('student_groups')
        .select('*, lead_teacher:lead_teacher_id(id, full_name, email)')
        .eq('active', true)
        .order('name'),
      supabase
        .from('students')
        .select('id, full_name, matric_no, detail, active, group_id')
        .eq('active', true)
        .order('full_name'),
      supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('approved', true)
        .order('full_name'),
    ])

    if (groupsRes.data) setGroups(groupsRes.data)
    if (studentsRes.data) setStudents(studentsRes.data)
    if (teachersRes.data) setTeachers(teachersRes.data)
    setLoading(false)
  }

  useEffect(() => {
    let mounted = true
    Promise.all([
      supabase
        .from('student_groups')
        .select('*, lead_teacher:lead_teacher_id(id, full_name, email)')
        .eq('active', true)
        .order('name'),
      supabase
        .from('students')
        .select('id, full_name, matric_no, detail, active, group_id')
        .eq('active', true)
        .order('full_name'),
      supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('approved', true)
        .order('full_name'),
    ]).then(([groupsRes, studentsRes, teachersRes]) => {
      if (!mounted) return
      if (groupsRes.data) setGroups(groupsRes.data)
      if (studentsRes.data) setStudents(studentsRes.data)
      if (teachersRes.data) setTeachers(teachersRes.data)
      setLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [])

  // Calculate students per group map
  const studentCountByGroup = students.reduce((acc, s) => {
    const gid = s.group_id || 'unassigned'
    acc[gid] = (acc[gid] || 0) + 1
    return acc
  }, {})

  const unassignedStudents = students.filter((s) => !s.group_id)

  function openCreateModal() {
    setGroupName('')
    setGroupDesc('')
    setGroupColor(PALETTE[0].hex)
    setGroupLeadId('')
    setGroupFormError('')
    setGroupModal({ mode: 'create' })
  }

  function openEditModal(g) {
    setGroupName(g.name || '')
    setGroupDesc(g.description || '')
    setGroupColor(g.color || PALETTE[0].hex)
    setGroupLeadId(g.lead_teacher_id || '')
    setGroupFormError('')
    setGroupModal({ mode: 'edit', group: g })
  }

  async function handleSaveGroup(e) {
    e.preventDefault()
    setGroupFormError('')

    const cleanName = groupName.trim()
    if (!cleanName) {
      setGroupFormError('Group name is required.')
      return
    }

    // Check for duplicate group name
    const duplicate = groups.some(
      (g) =>
        g.name.toLowerCase() === cleanName.toLowerCase() &&
        (groupModal.mode === 'create' || g.id !== groupModal.group.id)
    )
    if (duplicate) {
      setGroupFormError('A group with this name already exists.')
      return
    }

    setActionBusy(true)

    const payload = {
      name: cleanName,
      description: groupDesc.trim() || null,
      color: groupColor,
      lead_teacher_id: groupLeadId || null,
      updated_at: new Date().toISOString(),
    }

    if (groupModal.mode === 'create') {
      const { error } = await supabase.from('student_groups').insert(payload)
      setActionBusy(false)

      if (error) {
        setGroupFormError(error.message || 'Could not create group.')
      } else {
        showMessage(`Group "${cleanName}" created successfully.`)
        setGroupModal(null)
        loadAllData()
      }
    } else {
      const { error } = await supabase
        .from('student_groups')
        .update(payload)
        .eq('id', groupModal.group.id)
      setActionBusy(false)

      if (error) {
        setGroupFormError(error.message || 'Could not update group.')
      } else {
        showMessage(`Group "${cleanName}" updated.`)
        setGroupModal(null)
        loadAllData()
      }
    }
  }

  async function handleDeleteGroup(group) {
    setActionBusy(true)

    // Soft delete / set active = false, unlinking students automatically
    const { error } = await supabase
      .from('student_groups')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', group.id)

    // Unassign students from this group
    await supabase.from('students').update({ group_id: null }).eq('group_id', group.id)

    setActionBusy(false)
    setDeleteModalGroup(null)

    if (error) {
      showMessage('Could not delete group. Please try again.')
    } else {
      showMessage(`Group "${group.name}" was deleted. Students are now unassigned.`)
      loadAllData()
    }
  }

  // Bulk assignment methods
  function openBulkModal(preselectedGroupId = '') {
    setTargetGroupId(preselectedGroupId)
    setSelectedStudentIds(new Set())
    setBulkSearch('')
    setBulkFilterGroup(preselectedGroupId ? 'unassigned' : 'all')
    setBulkModalOpen(true)
  }

  const filteredBulkStudents = students.filter((s) => {
    // Group filter
    if (bulkFilterGroup === 'unassigned' && s.group_id) return false
    if (bulkFilterGroup !== 'all' && bulkFilterGroup !== 'unassigned' && s.group_id !== bulkFilterGroup) {
      return false
    }

    // Search filter
    if (bulkSearch) {
      const q = bulkSearch.toLowerCase().trim()
      const matchesName = s.full_name?.toLowerCase().includes(q)
      const matchesMatric = s.matric_no?.toLowerCase().includes(q)
      if (!matchesName && !matchesMatric) return false
    }

    return true
  })

  function toggleStudentSelection(id) {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleSelectAllFiltered() {
    const allIds = filteredBulkStudents.map((s) => s.id)
    const areAllSelected = allIds.every((id) => selectedStudentIds.has(id))

    if (areAllSelected) {
      // Deselect filtered
      setSelectedStudentIds((prev) => {
        const next = new Set(prev)
        allIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      // Select filtered
      setSelectedStudentIds((prev) => {
        const next = new Set(prev)
        allIds.forEach((id) => next.add(id))
        return next
      })
    }
  }

  async function handleExecuteBulkAssignment() {
    if (selectedStudentIds.size === 0) return

    setActionBusy(true)
    const studentIdArray = Array.from(selectedStudentIds)
    const newGroupId = targetGroupId === 'none' ? null : targetGroupId || null

    const { error } = await supabase
      .from('students')
      .update({ group_id: newGroupId })
      .in('id', studentIdArray)

    setActionBusy(false)

    if (error) {
      showMessage('Could not complete group reassignment. Please try again.')
    } else {
      const targetGroupName = groups.find((g) => g.id === newGroupId)?.name || 'Unassigned'
      showMessage(
        `Successfully assigned ${studentIdArray.length} student${studentIdArray.length === 1 ? '' : 's'} to ${targetGroupName}.`
      )
      setBulkModalOpen(false)
      loadAllData()
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Top action bar with back button and create group */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-2xs hover:bg-mist transition-colors cursor-pointer active:scale-95"
        >
          <ArrowLeftIcon className="h-4 w-4 text-ink/60" />
          <span>Back to Dashboard</span>
        </button>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-2xs hover:bg-brand-dark transition-all cursor-pointer active:scale-95"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Create group</span>
        </button>
      </div>

      <div className="space-y-6">
        {/* Page Title & Intro */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white shadow-2xs">
                <TagIcon className="h-4 w-4" />
              </span>
              <h1 className="text-xl font-black tracking-tight text-ink sm:text-2xl">
                Student Group Management
              </h1>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-ink/65">
              Organize students into groups, assign lead teachers, and monitor group participation.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openBulkModal()}
            className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-xs sm:text-sm font-bold text-ink shadow-2xs hover:bg-mist transition-colors cursor-pointer"
          >
            <UsersIcon className="h-4 w-4 text-brand" />
            <span>Bulk assign students</span>
          </button>
        </div>

        {/* Feedback Alert Toast */}
        {feedback && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs sm:text-sm font-bold text-emerald-800 animate-in fade-in">
            <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Summary Stats Row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
            <p className="text-xs font-semibold text-ink/65">
              Total groups
            </p>
            <p className="mt-1 text-2xl font-black text-ink">{groups.length}</p>
          </div>
          <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
            <p className="text-xs font-semibold text-ink/65">
              Assigned students
            </p>
            <p className="mt-1 text-2xl font-black text-brand">
              {students.length - unassignedStudents.length}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
            <p className="text-xs font-semibold text-ink/65">
              Unassigned students
            </p>
            <p className="mt-1 text-2xl font-black text-amber-700">
              {unassignedStudents.length}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
            <p className="text-xs font-semibold text-ink/65">
              Lead teachers
            </p>
            <p className="mt-1 text-2xl font-black text-ink">
              {new Set(groups.map((g) => g.lead_teacher_id).filter(Boolean)).size}
            </p>
          </div>
        </div>

        {/* Groups Grid */}
        {loading ? (
          <div className="rounded-xl border border-line bg-white p-8 text-center text-sm font-semibold text-ink/60">
            Loading groups…
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <TagIcon className="h-6 w-6" />
            </div>
            <h3 className="text-base font-extrabold text-ink">No student groups created yet</h3>
            <p className="text-xs text-ink/60 max-w-sm mx-auto">
              Create your first student group to organize rosters and track attendance by group.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-2 inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-brand-dark"
            >
              <PlusIcon className="h-4 w-4" /> Create group
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => {
              const count = studentCountByGroup[g.id] || 0

              return (
                <div
                  key={g.id}
                  className="flex flex-col justify-between rounded-xl border border-line bg-white p-5 shadow-2xs transition-all hover:shadow-xs"
                >
                  <div className="space-y-3">
                    {/* Top Row: Color indicator & Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <GroupBadge group={g} size="md" />
                      <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-bold text-ink">
                        {count} {count === 1 ? 'student' : 'students'}
                      </span>
                    </div>

                    {/* Group Name & Description */}
                    <div>
                      <h2 className="text-lg font-black tracking-tight text-ink">{g.name}</h2>
                      {g.description && (
                        <p className="mt-1 text-xs text-ink/60 line-clamp-2 leading-relaxed">
                          {g.description}
                        </p>
                      )}
                    </div>

                    {/* Lead Teacher */}
                    <div className="rounded-lg border border-line/60 bg-mist/40 p-2.5 text-xs">
                      <span className="text-[11px] font-semibold text-ink/50 block">
                        Lead teacher
                      </span>
                      <p className="mt-0.5 font-bold text-ink truncate">
                        {g.lead_teacher?.full_name || (
                          <span className="italic text-ink/40 font-normal">No lead teacher assigned</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="mt-5 flex items-center justify-between border-t border-line/60 pt-3">
                    <button
                      type="button"
                      onClick={() => openBulkModal(g.id)}
                      className="text-xs font-bold text-brand hover:underline cursor-pointer"
                    >
                      Assign students →
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(g)}
                        title="Edit group"
                        className="rounded-lg p-2 text-ink/50 hover:bg-mist hover:text-ink transition-colors cursor-pointer"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteModalGroup(g)}
                        title="Delete group"
                        className="rounded-lg p-2 text-red hover:bg-red/10 hover:text-red transition-colors cursor-pointer"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Unassigned Students Notice Banner */}
        {unassignedStudents.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                <UsersIcon className="h-5 w-5" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  {unassignedStudents.length} unassigned {unassignedStudents.length === 1 ? 'student' : 'students'}
                </h4>
                <p className="text-xs text-amber-700/90">
                  These students have not yet been placed into an active group.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setTargetGroupId(groups[0]?.id || '')
                setBulkFilterGroup('unassigned')
                setSelectedStudentIds(new Set())
                setBulkSearch('')
                setBulkModalOpen(true)
              }}
              className="min-h-[38px] rounded-lg bg-amber-800 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-amber-900 transition-colors cursor-pointer"
            >
              Assign unassigned students
            </button>
          </div>
        )}
      </div>

      {/* CREATE / EDIT GROUP MODAL */}
      {groupModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-lg font-black text-ink">
                {groupModal.mode === 'create' ? 'Create Student Group' : 'Edit Group'}
              </h3>
              <button
                type="button"
                onClick={() => setGroupModal(null)}
                className="rounded-lg p-1.5 text-ink/40 hover:bg-mist hover:text-ink cursor-pointer"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink/75" htmlFor="group-name">
                  Group name *
                </label>
                <input
                  id="group-name"
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Group Alpha, Tribe of Judah"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm font-semibold text-ink focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/75" htmlFor="group-desc">
                  Description (optional)
                </label>
                <textarea
                  id="group-desc"
                  rows={2}
                  placeholder="Brief note or age group category"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-line bg-white px-3.5 py-2 text-sm text-ink focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/75" htmlFor="group-teacher">
                  Lead teacher
                </label>
                <select
                  id="group-teacher"
                  value={groupLeadId}
                  onChange={(e) => setGroupLeadId(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm font-semibold text-ink focus:border-brand"
                >
                  <option value="">No lead teacher assigned</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Group Colour Palette Picker */}
              <div>
                <label className="block text-xs font-semibold text-ink/75">
                  Group badge colour
                </label>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {PALETTE.map((p) => {
                    const isSelected = groupColor.toLowerCase() === p.hex.toLowerCase()
                    return (
                      <button
                        key={p.hex}
                        type="button"
                        onClick={() => setGroupColor(p.hex)}
                        title={p.name}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all cursor-pointer ${
                          isSelected ? 'ring-2 ring-offset-2 ring-brand scale-105' : 'hover:scale-105 opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: p.hex }}
                      >
                        {isSelected && <span className="h-2 w-2 rounded-full bg-white shadow-xs" />}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-xs text-ink/50">Preview:</span>
                  <GroupBadge group={{ name: groupName || 'Sample Group', color: groupColor }} />
                </div>
              </div>

              {groupFormError && (
                <p className="rounded-lg bg-red-50 p-2.5 text-xs font-bold text-red-700">
                  {groupFormError}
                </p>
              )}

              <div className="mt-6 flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setGroupModal(null)}
                  className="min-h-[40px] rounded-lg border border-line px-4 py-2 text-xs font-bold text-ink/70 hover:bg-mist cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="min-h-[40px] rounded-lg bg-brand px-5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-brand-dark disabled:opacity-60 cursor-pointer"
                >
                  {actionBusy ? 'Saving…' : groupModal.mode === 'create' ? 'Create group' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK STUDENT ASSIGNMENT MODAL */}
      {bulkModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="flex h-full max-h-[90vh] w-full max-w-2xl flex-col justify-between rounded-xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-line p-5">
              <div>
                <h3 className="text-lg font-black text-ink">Bulk Assign Students</h3>
                <p className="text-xs text-ink/60">
                  Select multiple students and assign or reassign them to a group in one step.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="rounded-lg p-1.5 text-ink/40 hover:bg-mist hover:text-ink cursor-pointer"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Target Assignment Controls */}
            <div className="bg-mist/50 border-b border-line p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-semibold text-ink/70">
                    Assign selected students to:
                  </label>
                  <select
                    value={targetGroupId}
                    onChange={(e) => setTargetGroupId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-xs sm:text-sm font-bold text-ink focus:border-brand"
                  >
                    <option value="">Select target group…</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                    <option value="none">Remove from group (Make unassigned)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleExecuteBulkAssignment}
                    disabled={actionBusy || selectedStudentIds.size === 0 || !targetGroupId}
                    className="min-h-[40px] rounded-lg bg-brand px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-2xs hover:bg-brand-dark active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {actionBusy
                      ? 'Assigning…'
                      : `Assign ${selectedStudentIds.size} ${selectedStudentIds.size === 1 ? 'student' : 'students'}`}
                  </button>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                {/* Search */}
                <div className="relative flex-1 min-w-[180px]">
                  <input
                    type="text"
                    value={bulkSearch}
                    onChange={(e) => setBulkSearch(e.target.value)}
                    placeholder="Search name or matric…"
                    className="min-h-[38px] w-full rounded-lg border border-line bg-white py-2 pl-8 pr-3 text-xs text-ink placeholder:text-ink/40"
                  />
                  <SearchIcon className="h-3.5 w-3.5 text-ink/40 absolute left-2.5 top-3" />
                </div>

                {/* Filter Roster */}
                <select
                  value={bulkFilterGroup}
                  onChange={(e) => setBulkFilterGroup(e.target.value)}
                  className="min-h-[38px] rounded-lg border border-line bg-white px-2.5 py-2 text-xs font-semibold text-ink"
                >
                  <option value="all">Filter: All Students</option>
                  <option value="unassigned">Filter: Unassigned Only ({unassignedStudents.length})</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      Filter: {g.name} ({studentCountByGroup[g.id] || 0})
                    </option>
                  ))}
                </select>

                {/* Select All */}
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="min-h-[38px] inline-flex items-center font-bold text-brand hover:underline cursor-pointer"
                >
                  Select / Deselect all ({filteredBulkStudents.length})
                </button>
              </div>
            </div>

            {/* Students Selection List */}
            <div className="flex-1 overflow-y-auto p-4 max-h-[420px] divide-y divide-line">
              {filteredBulkStudents.length === 0 ? (
                <p className="p-8 text-center text-xs text-ink/50">
                  No students match the current filter.
                </p>
              ) : (
                filteredBulkStudents.map((s) => {
                  const isChecked = selectedStudentIds.has(s.id)
                  const currentGroup = groups.find((g) => g.id === s.group_id)

                  return (
                    <label
                      key={s.id}
                      className={`flex min-h-[44px] cursor-pointer items-center justify-between gap-3 p-2.5 rounded-lg transition-colors ${
                        isChecked ? 'bg-brand/10' : 'hover:bg-mist/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleStudentSelection(s.id)}
                          className="h-4 w-4 rounded border-line text-brand focus:ring-brand cursor-pointer"
                        />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-ink truncate">
                            {s.full_name}
                          </p>
                          <p className="text-[11px] text-ink/60">
                            {s.matric_no || 'No matric'} {s.detail ? `· ${s.detail}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {currentGroup ? (
                          <GroupBadge group={currentGroup} size="xs" />
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                            Unassigned
                          </span>
                        )}
                      </div>
                    </label>
                  )
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-line p-4">
              <span className="text-xs font-semibold text-ink/60">
                Selected: <strong className="text-ink font-bold">{selectedStudentIds.size}</strong> of {filteredBulkStudents.length}
              </span>
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="min-h-[38px] rounded-lg border border-line px-4 py-2 text-xs font-bold text-ink/70 hover:bg-mist cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE GROUP CONFIRMATION MODAL */}
      {deleteModalGroup && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-ink">Delete Student Group?</h3>
            <p className="text-xs text-ink/70 leading-relaxed">
              Are you sure you want to delete <strong className="text-ink font-bold">&quot;{deleteModalGroup.name}&quot;</strong>?
            </p>
            <p className="text-xs text-ink/60 bg-mist p-3 rounded-lg border border-line">
              Students assigned to this group will not be deleted; they will simply become <strong>Unassigned</strong>. Historical attendance records will remain intact.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalGroup(null)}
                className="min-h-[40px] rounded-lg border border-line px-4 py-2 text-xs font-bold text-ink/70 hover:bg-mist cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => handleDeleteGroup(deleteModalGroup)}
                className="min-h-[40px] rounded-lg bg-red px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-red-800 disabled:opacity-60 cursor-pointer"
              >
                {actionBusy ? 'Deleting…' : 'Delete Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
