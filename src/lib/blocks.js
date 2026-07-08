// Specialization blocks.
//
// A block is a phase where you emphasize one or more muscle GROUPS to bring
// them up (e.g. a back + rear-delt block, an arms block). It's track-and-
// summarize only: sessions logged in the block's window fall into it by date,
// and the dashboard shows per-muscle volume with the focus muscles highlighted
// so you can see you're actually feeding them the extra work. No deload /
// strength phases — this app manages fatigue through volume, not deloads.
//
// Pure factories + resolution here; the per-muscle summary lives in
// dashboard.js (which owns the exercise→muscle mapping).

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// Build a block. `focusMuscles` are dashboard muscle-group names (see
// MUSCLE_GROUPS in dashboard.js). `endDate` is null for an open-ended block.
export function createBlock({ name = '', focusMuscles = [], startDate = Date.now(), endDate = null } = {}) {
  return {
    id: newId(),
    name: name.trim().slice(0, 60),
    focusMuscles: [...focusMuscles],
    startDate,
    endDate,
    createdAt: Date.now(),
  }
}

// The block covering a given time (default now): the latest-starting block whose
// window contains it. Open-ended blocks (endDate null) run until superseded.
export function activeBlock(blocks = [], at = Date.now()) {
  const sorted = [...blocks].sort((a, b) => b.startDate - a.startDate)
  for (const b of sorted) {
    if (b.startDate <= at && (b.endDate == null || at <= b.endDate)) return b
  }
  return null
}

// Blocks newest-first, for listing past phases.
export function sortedBlocks(blocks = []) {
  return [...blocks].sort((a, b) => b.startDate - a.startDate)
}

const DAY = 86400000

// Whole days the block has run (inclusive), capped at today for open blocks.
export function blockDays(block, at = Date.now()) {
  if (!block) return 0
  const end = block.endDate != null ? Math.min(block.endDate, at) : at
  const from = new Date(block.startDate); from.setHours(0, 0, 0, 0)
  const to = new Date(end); to.setHours(0, 0, 0, 0)
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY) + 1)
}

// 1-based week number the block is in (week 1 for the first 7 days).
export function blockWeek(block, at = Date.now()) {
  return Math.floor((blockDays(block, at) - 1) / 7) + 1
}
