import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, X, ChevronUp, ChevronDown, Dumbbell, Moon, Trash2, CalendarRange, Copy, Locate } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { getProgramsState, saveProgramsState, deleteProgramById } from '../lib/workoutStore'
import { fetchRemoteProgramsState, upsertRemoteProgramsState, deleteRemoteProgramById } from '../lib/workoutRemote'
import {
  emptyProgram,
  createDay,
  createPlannedExercise,
  programFromTemplate,
  setPointerToDay,
  scheduleMode,
  STARTER_PROGRAMS,
} from '../lib/program'

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
import ExercisePicker from '../components/ExercisePicker'

// Move an item within an array by delta, returning a new array.
function moveInArray(arr, index, delta) {
  const to = index + delta
  if (to < 0 || to >= arr.length) return arr
  const next = arr.slice()
  const [item] = next.splice(index, 1)
  next.splice(to, 0, item)
  return next
}

const EMPTY_STATE = { programs: [], activeId: null }

export default function Routine() {
  const { user } = useAuth()
  const [programsState, setProgramsState] = useState(EMPTY_STATE)
  const [editingId, setEditingId] = useState(null)
  const [showNewPicker, setShowNewPicker] = useState(false)
  const [loading, setLoading] = useState(true)
  const remoteTimer = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      let state
      if (user) {
        try {
          state = await fetchRemoteProgramsState(user.id)
        } catch {
          state = getProgramsState()
        }
      } else {
        state = getProgramsState()
      }
      if (!cancelled) {
        setProgramsState(state)
        setEditingId(state.activeId || state.programs[0]?.id || null)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user])

  // Local persists immediately, always. Remote either debounces (continuous
  // edits like typing) or fires right away (discrete actions like switching,
  // duplicating, deleting — decisive clicks that should feel instant/certain).
  function persistLocal(state) {
    saveProgramsState(state)
  }
  function persistRemoteDebounced(state) {
    if (!user) return
    clearTimeout(remoteTimer.current)
    remoteTimer.current = setTimeout(() => { upsertRemoteProgramsState(user.id, state).catch(() => {}) }, 700)
  }
  function persistRemoteNow(state) {
    if (!user) return
    clearTimeout(remoteTimer.current)
    upsertRemoteProgramsState(user.id, state).catch(() => {})
  }

  // Upsert one routine's edits back into the full list (stable order), keep
  // React state + local storage in sync, and debounce the remote push.
  function saveEditingProgram(nextProgram) {
    setProgramsState((prev) => {
      const idx = prev.programs.findIndex((p) => p.id === nextProgram.id)
      const programs = idx === -1 ? [...prev.programs, nextProgram] : prev.programs.map((p, i) => (i === idx ? nextProgram : p))
      const activeId = prev.activeId || nextProgram.id
      const next = { programs, activeId }
      persistLocal(next)
      persistRemoteDebounced(next)
      return next
    })
  }

  // Every day/exercise mutator below calls this exactly like the single-
  // program version did — only this plumbing function changed to route the
  // result back into the full routine list.
  function update(mutator) {
    if (!editingProgram) return
    saveEditingProgram({ ...mutator(editingProgram), updatedAt: Date.now() })
  }

  // Keep the "up next" pointer within the (possibly changed) day list.
  function clampPointer(p) {
    const pointer = p.days.length ? p.pointer % p.days.length : 0
    return pointer === p.pointer ? p : { ...p, pointer }
  }

  function addRoutine(program) {
    setProgramsState((prev) => {
      const next = { programs: [...prev.programs, program], activeId: prev.activeId || program.id }
      persistLocal(next)
      persistRemoteNow(next)
      return next
    })
    setEditingId(program.id)
    setShowNewPicker(false)
  }
  const startTemplate = (key) => addRoutine(programFromTemplate(key))
  const startBlank = () => addRoutine(emptyProgram())

  function duplicateRoutine(program) {
    const copy = emptyProgram(`${program.name} (copy)`)
    copy.days = JSON.parse(JSON.stringify(program.days))
    addRoutine(copy)
  }

  function setActiveRoutine(id) {
    setProgramsState((prev) => {
      const next = { ...prev, activeId: id }
      persistLocal(next)
      persistRemoteNow(next)
      return next
    })
  }

  function deleteRoutine(id) {
    const next = deleteProgramById(id) // local: filters + reassigns active + persists, returns new state
    setProgramsState(next)
    persistRemoteNow(next)
    if (user) deleteRemoteProgramById(user.id, id).catch(() => {})
    setEditingId((prev) => (prev === id ? next.activeId || next.programs[0]?.id || null : prev))
  }

  // ---- day + exercise mutators (unchanged from the single-program version) ----
  const setName = (name) => update((p) => ({ ...p, name: name.slice(0, 60) }))
  const addDay = (kind) => update((p) => ({ ...p, days: [...p.days, createDay(kind)] }))
  const removeDay = (dayId) => update((p) => clampPointer({ ...p, days: p.days.filter((d) => d.id !== dayId) }))
  const moveDay = (index, delta) => update((p) => clampPointer({ ...p, days: moveInArray(p.days, index, delta) }))
  const setDayName = (dayId, name) =>
    update((p) => ({ ...p, days: p.days.map((d) => (d.id === dayId ? { ...d, name: name.slice(0, 40) } : d)) }))
  const setDayKind = (dayId, kind) =>
    update((p) => ({ ...p, days: p.days.map((d) => (d.id === dayId ? { ...d, kind } : d)) }))
  const jumpToDay = (dayId) => update((p) => setPointerToDay(p, dayId))

  const addExercise = (dayId, name, category, exerciseId) =>
    update((p) => ({
      ...p,
      days: p.days.map((d) =>
        d.id === dayId
          ? { ...d, exercises: [...d.exercises, createPlannedExercise(name, { exerciseId, kind: category === 'Cardio' ? 'cardio' : 'strength' })] }
          : d
      ),
    }))
  const removeExercise = (dayId, exId) =>
    update((p) => ({ ...p, days: p.days.map((d) => (d.id === dayId ? { ...d, exercises: d.exercises.filter((e) => e.id !== exId) } : d)) }))
  const moveExercise = (dayId, index, delta) =>
    update((p) => ({ ...p, days: p.days.map((d) => (d.id === dayId ? { ...d, exercises: moveInArray(d.exercises, index, delta) } : d)) }))
  const setExerciseSets = (dayId, exId, value) => {
    const sets = value === '' ? '' : Math.max(1, Math.min(20, parseInt(value, 10) || 1))
    update((p) => ({ ...p, days: p.days.map((d) => (d.id === dayId ? { ...d, exercises: d.exercises.map((e) => (e.id === exId ? { ...e, sets } : e)) } : d)) }))
  }
  const setExerciseRep = (dayId, exId, field, value) => {
    const n = value === '' ? '' : Math.max(1, Math.min(50, parseInt(value, 10) || 0))
    update((p) => ({
      ...p,
      days: p.days.map((d) =>
        d.id === dayId
          ? { ...d, exercises: d.exercises.map((e) => (e.id === exId ? { ...e, repRange: { ...(e.repRange || { low: 8, high: 12 }), [field]: n } } : e)) }
          : d
      ),
    }))
  }

  const editingProgram = programsState.programs.find((p) => p.id === editingId) || null
  const isEditingActive = !!editingProgram && editingProgram.id === programsState.activeId
  // Weekly (exactly 7 days): the date decides the day, so the pointer and its
  // affordances (Up next badge, Set as today) disappear — instead the card for
  // today's weekday is highlighted.
  const isWeekly = !!editingProgram && scheduleMode(editingProgram) === 'weekly'
  const todayWeekdayIndex = (new Date().getDay() + 6) % 7 // Mon=0 … Sun=6
  const pointerIndex = editingProgram && editingProgram.days.length ? editingProgram.pointer % editingProgram.days.length : -1
  const highlightIndex = isWeekly ? todayWeekdayIndex : pointerIndex

  // The template/blank picker — shown for the very first routine, or again
  // whenever "+ New routine" is tapped.
  const newRoutinePicker = (
    <div className="bg-white border border-border p-7">
      <h2 className="font-heading text-xl font-medium text-text-primary mb-1">
        {programsState.programs.length ? 'New routine' : 'Start a program'}
      </h2>
      <p className="text-[13px] text-text-muted mb-6">Pick a template to tweak, or start from scratch.</p>
      <div className="space-y-3">
        {STARTER_PROGRAMS.map((t) => (
          <button
            key={t.key}
            onClick={() => startTemplate(t.key)}
            className="w-full text-left bg-cream border border-border hover:border-border-hover p-4 cursor-pointer transition-colors"
          >
            <p className="text-[14px] font-medium text-text-primary">{t.name}</p>
            <p className="text-[12px] text-text-muted mt-0.5">{t.description}</p>
          </button>
        ))}
        <button
          onClick={startBlank}
          className="w-full inline-flex items-center gap-2 text-[13px] font-medium text-text-muted hover:text-text-primary bg-white border border-border hover:border-border-hover p-4 cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" /> Blank program
        </button>
      </div>
    </div>
  )

  return (
    <div className="pt-28 pb-24 px-6">
      <div className="max-w-2xl mx-auto">
        <Link to="/tools" className="inline-flex items-center gap-1.5 text-text-muted hover:text-text-primary no-underline text-[13px] mb-10 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to tools
        </Link>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-heading text-4xl font-medium text-text-primary mb-3">Routine builder</h1>
          <p className="text-text-muted text-[15px] mb-10">
            Build a program that rotates through your split. The log surfaces today’s session and pre-fills your planned exercises.
          </p>

          {loading ? (
            <p className="text-[13px] text-text-muted">Loading…</p>
          ) : programsState.programs.length === 0 ? (
            newRoutinePicker
          ) : (
            <>
              {/* Routine switcher — every saved routine, which one is active,
                  which one you're currently editing below. */}
              <div className="bg-white border border-border p-5 sm:p-6 mb-6">
                <p className="text-[11px] uppercase tracking-wider text-text-light mb-3">Your routines</p>
                <div className="space-y-2">
                  {programsState.programs.map((p) => {
                    const isActive = p.id === programsState.activeId
                    const isOpen = p.id === editingId
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between gap-2 px-3 py-2.5 border cursor-pointer transition-colors ${
                          isOpen ? 'border-text-primary bg-cream' : 'border-border hover:border-border-hover'
                        }`}
                        onClick={() => setEditingId(p.id)}
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="text-[13px] font-medium text-text-primary truncate">{p.name}</span>
                          {isActive && (
                            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-cream bg-text-primary px-1.5 py-0.5">Active</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!isActive && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setActiveRoutine(p.id) }}
                              className="text-[11px] font-medium text-text-muted hover:text-text-primary bg-white border border-border hover:border-border-hover px-2 py-1 cursor-pointer transition-colors"
                            >
                              Set active
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); duplicateRoutine(p) }}
                            aria-label={`Duplicate ${p.name}`}
                            title="Duplicate"
                            className="text-text-light hover:text-text-primary bg-transparent border-none cursor-pointer p-1"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteRoutine(p.id) }}
                            aria-label={`Delete ${p.name}`}
                            title="Delete"
                            className="text-text-light hover:text-red-600 bg-transparent border-none cursor-pointer p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <button
                  onClick={() => setShowNewPicker((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-text-muted hover:text-text-primary bg-transparent border-none cursor-pointer mt-3 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> New routine
                </button>
              </div>

              {showNewPicker && <div className="mb-6">{newRoutinePicker}</div>}

              {editingProgram && (
                <>
                  {/* Program header */}
                  <div className="bg-white border border-border p-5 sm:p-6 mb-6">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <label className="text-[11px] uppercase tracking-wider text-text-light">Routine name</label>
                      {isEditingActive ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-cream bg-text-primary px-1.5 py-0.5">Active routine</span>
                      ) : (
                        <button
                          onClick={() => setActiveRoutine(editingProgram.id)}
                          className="text-[11px] font-medium text-text-muted hover:text-text-primary bg-white border border-border hover:border-border-hover px-2 py-1 cursor-pointer transition-colors"
                        >
                          Set as active
                        </button>
                      )}
                    </div>
                    <input
                      value={editingProgram.name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-cream border border-border px-3 py-2.5 text-text-primary text-[15px] font-heading font-medium outline-none focus:border-text-primary transition-colors"
                    />
                    <p className="text-[12px] text-text-muted mt-3">
                      {editingProgram.days.filter((d) => d.kind === 'train').length} training day{editingProgram.days.filter((d) => d.kind === 'train').length !== 1 ? 's' : ''}
                      {isWeekly
                        ? ' · fixed weekly schedule — day 1 is Monday, day 7 is Sunday. Missing a day never shifts it.'
                        : ' · rotates in order, advancing as you log.'}
                    </p>
                    {!isWeekly && editingProgram.days.length > 0 && (
                      <p className="text-[11px] text-text-light mt-1.5">
                        Tip: make it exactly 7 days (rest days included) and it becomes a fixed weekly schedule instead.
                      </p>
                    )}
                  </div>

                  {/* Days */}
                  <AnimatePresence initial={false}>
                    {editingProgram.days.map((day, dayIndex) => (
                      <motion.div
                        key={day.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`mb-4 border bg-white ${dayIndex === highlightIndex ? 'border-text-primary' : 'border-border'}`}
                      >
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-cream">
                          {day.kind === 'rest' ? <Moon className="w-4 h-4 text-text-light shrink-0" /> : <Dumbbell className="w-4 h-4 text-text-primary shrink-0" />}
                          {isWeekly && (
                            <span className="shrink-0 text-[9px] font-medium uppercase tracking-wider text-text-muted border border-border bg-white px-1.5 py-0.5">
                              {WEEKDAY_NAMES[dayIndex]}
                            </span>
                          )}
                          <input
                            value={day.name}
                            onChange={(e) => setDayName(day.id, e.target.value)}
                            aria-label="Day name"
                            className="flex-1 min-w-0 bg-transparent text-[14px] font-medium text-text-primary outline-none border-b border-transparent focus:border-border"
                          />
                          {isWeekly ? (
                            dayIndex === todayWeekdayIndex && (
                              <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-cream bg-text-primary px-1.5 py-0.5">Today</span>
                            )
                          ) : dayIndex === pointerIndex ? (
                            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-cream bg-text-primary px-1.5 py-0.5">Up next</span>
                          ) : (
                            <button
                              onClick={() => jumpToDay(day.id)}
                              aria-label={`Set ${day.name || 'this day'} as today`}
                              title="Not right? Set this as today's day."
                              className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium text-text-light hover:text-text-primary bg-transparent border-none cursor-pointer px-1 py-0.5 transition-colors"
                            >
                              <Locate className="w-3 h-3" /> Set as today
                            </button>
                          )}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button onClick={() => moveDay(dayIndex, -1)} disabled={dayIndex === 0} aria-label="Move day up" className="text-text-light hover:text-text-primary bg-transparent border-none cursor-pointer p-1 disabled:opacity-30 disabled:cursor-not-allowed">
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button onClick={() => moveDay(dayIndex, 1)} disabled={dayIndex === editingProgram.days.length - 1} aria-label="Move day down" className="text-text-light hover:text-text-primary bg-transparent border-none cursor-pointer p-1 disabled:opacity-30 disabled:cursor-not-allowed">
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button onClick={() => removeDay(day.id)} aria-label="Remove day" className="text-text-light hover:text-red-600 bg-transparent border-none cursor-pointer p-1">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="px-4 py-3">
                          {/* train / rest toggle */}
                          <div className="flex border border-border w-max mb-3">
                            {[['train', 'Training'], ['rest', 'Rest']].map(([k, label]) => (
                              <button
                                key={k}
                                onClick={() => setDayKind(day.id, k)}
                                className={`px-3 py-1 text-[12px] font-medium cursor-pointer transition-colors ${day.kind === k ? 'bg-text-primary text-cream' : 'bg-white text-text-muted hover:text-text-primary'}`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>

                          {day.kind === 'rest' ? (
                            <p className="text-[12px] text-text-light">{isWeekly ? 'A rest day — no exercises.' : 'A rest slot in the rotation — no exercises.'}</p>
                          ) : (
                            <>
                              {day.exercises.length > 0 && (
                                <div className="mb-3 space-y-2">
                                  {/* header row */}
                                  <div className="grid grid-cols-[1fr_44px_92px_28px] gap-2 items-center text-[10px] uppercase tracking-wider text-text-light">
                                    <span>Exercise</span>
                                    <span className="text-center">Sets</span>
                                    <span className="text-center">Reps</span>
                                    <span />
                                  </div>
                                  {day.exercises.map((ex, exIndex) => (
                                    <div key={ex.id} className="grid grid-cols-[1fr_44px_92px_28px] gap-2 items-center">
                                      <div className="min-w-0 flex items-center gap-1">
                                        <div className="flex flex-col shrink-0">
                                          <button onClick={() => moveExercise(day.id, exIndex, -1)} disabled={exIndex === 0} aria-label="Move exercise up" className="text-text-light hover:text-text-primary bg-transparent border-none cursor-pointer p-0 leading-none disabled:opacity-30 disabled:cursor-not-allowed">
                                            <ChevronUp className="w-3 h-3" />
                                          </button>
                                          <button onClick={() => moveExercise(day.id, exIndex, 1)} disabled={exIndex === day.exercises.length - 1} aria-label="Move exercise down" className="text-text-light hover:text-text-primary bg-transparent border-none cursor-pointer p-0 leading-none disabled:opacity-30 disabled:cursor-not-allowed">
                                            <ChevronDown className="w-3 h-3" />
                                          </button>
                                        </div>
                                        <span className="text-[13px] text-text-primary truncate">{ex.name}</span>
                                      </div>
                                      <input
                                        type="number" inputMode="numeric" min="1" max="20"
                                        value={ex.sets}
                                        onChange={(e) => setExerciseSets(day.id, ex.id, e.target.value)}
                                        aria-label={`${ex.name} target sets`}
                                        className="w-full bg-cream border border-border px-1 py-1.5 text-center text-text-primary text-[13px] outline-none focus:border-text-primary transition-colors"
                                      />
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number" inputMode="numeric" min="1" max="50"
                                          value={ex.repRange?.low ?? ''}
                                          onChange={(e) => setExerciseRep(day.id, ex.id, 'low', e.target.value)}
                                          aria-label={`${ex.name} rep low`}
                                          className="w-full bg-cream border border-border px-1 py-1.5 text-center text-text-primary text-[13px] outline-none focus:border-text-primary transition-colors"
                                        />
                                        <span className="text-text-light text-[12px]">–</span>
                                        <input
                                          type="number" inputMode="numeric" min="1" max="50"
                                          value={ex.repRange?.high ?? ''}
                                          onChange={(e) => setExerciseRep(day.id, ex.id, 'high', e.target.value)}
                                          aria-label={`${ex.name} rep high`}
                                          className="w-full bg-cream border border-border px-1 py-1.5 text-center text-text-primary text-[13px] outline-none focus:border-text-primary transition-colors"
                                        />
                                      </div>
                                      <button onClick={() => removeExercise(day.id, ex.id)} aria-label={`Remove ${ex.name}`} className="flex justify-center text-text-light hover:text-red-600 bg-transparent border-none cursor-pointer">
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <ExercisePicker
                                onSelect={(name, category, id) => addExercise(day.id, name, category, id)}
                                placeholder="Add an exercise…"
                              />
                            </>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Add day / delete routine */}
                  <div className="flex flex-wrap gap-3 mt-2">
                    <button onClick={() => addDay('train')} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-cream bg-text-primary px-4 py-2.5 border-none cursor-pointer hover:bg-accent-hover transition-colors">
                      <Plus className="w-4 h-4" /> Training day
                    </button>
                    <button onClick={() => addDay('rest')} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text-muted hover:text-text-primary bg-white border border-border hover:border-border-hover px-4 py-2.5 cursor-pointer transition-colors">
                      <Moon className="w-4 h-4" /> Rest day
                    </button>
                  </div>

                  <button onClick={() => deleteRoutine(editingProgram.id)} className="inline-flex items-center gap-1.5 text-[12px] text-text-light hover:text-red-600 bg-transparent border-none cursor-pointer mt-8 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Delete this routine
                  </button>
                </>
              )}

              <div className="mt-10 flex items-center gap-2 text-[12px] text-text-light">
                <CalendarRange className="w-4 h-4" />
                <span>Your routines are saved automatically{user ? ' to your account' : ' on this device'}.</span>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
