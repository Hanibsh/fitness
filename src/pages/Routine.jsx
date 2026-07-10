import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, ChevronUp, ChevronDown, Trash2, CalendarRange, Copy } from 'lucide-react'
import { useProgramsState } from '../lib/useProgramsState'

// The routines list: every saved routine, reorderable, with Set active /
// Duplicate / Delete, and a tap-through to the full-page editor. Creating or
// editing a routine is a separate page (/routine/new or /routine/:id) so this
// page stays a clean, scannable list.
export default function Routine() {
  const navigate = useNavigate()
  const { user, programsState, loading, duplicateRoutine, setActiveRoutine, moveRoutine, deleteRoutine } = useProgramsState()

  function openEditor(program) {
    navigate(`/routine/${program.id}`)
  }

  function handleDuplicate(program) {
    const copy = duplicateRoutine(program)
    navigate(`/routine/${copy.id}`)
  }

  return (
    <div className="pt-28 pb-24 px-6">
      <div className="max-w-2xl mx-auto">
        <Link to="/tools" className="inline-flex items-center gap-1.5 text-text-muted hover:text-text-primary no-underline text-[13px] mb-10 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to tools
        </Link>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-heading text-4xl font-medium text-text-primary mb-3">Routine builder</h1>
          <p className="text-text-muted text-[15px] mb-10">
            Build a program that schedules your split. The log surfaces today’s session and pre-fills your planned exercises.
          </p>

          {loading ? (
            <p className="text-[13px] text-text-muted">Loading…</p>
          ) : programsState.programs.length === 0 ? (
            <div className="bg-white border border-border p-7 text-center">
              <h2 className="font-heading text-xl font-medium text-text-primary mb-1">Start a program</h2>
              <p className="text-[13px] text-text-muted mb-6">Pick a template to tweak, or start from scratch.</p>
              <button
                onClick={() => navigate('/routine/new')}
                className="inline-flex items-center gap-2 bg-text-primary text-cream font-medium px-6 py-3 border-none cursor-pointer text-[14px] hover:bg-accent-hover transition-colors"
              >
                <Plus className="w-4 h-4" /> Start your first routine
              </button>
            </div>
          ) : (
            <>
              <div className="bg-white border border-border p-5 sm:p-6 mb-6">
                <p className="text-[11px] uppercase tracking-wider text-text-light mb-3">Your routines</p>
                <div className="space-y-2">
                  {programsState.programs.map((p, index) => {
                    const isActive = p.id === programsState.activeId
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 px-3 py-2.5 border border-border hover:border-border-hover cursor-pointer transition-colors"
                        onClick={() => openEditor(p)}
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="text-[13px] font-medium text-text-primary truncate">{p.name}</span>
                          {isActive && (
                            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-cream bg-text-primary px-1.5 py-0.5">Active</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <div className="flex flex-col mr-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); moveRoutine(index, -1) }}
                              disabled={index === 0}
                              aria-label={`Move ${p.name} up`}
                              className="text-text-light hover:text-text-primary bg-transparent border-none cursor-pointer p-0 leading-none disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); moveRoutine(index, 1) }}
                              disabled={index === programsState.programs.length - 1}
                              aria-label={`Move ${p.name} down`}
                              className="text-text-light hover:text-text-primary bg-transparent border-none cursor-pointer p-0 leading-none disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {!isActive && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setActiveRoutine(p.id) }}
                              className="text-[11px] font-medium text-text-muted hover:text-text-primary bg-white border border-border hover:border-border-hover px-2 py-1 cursor-pointer transition-colors"
                            >
                              Set active
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDuplicate(p) }}
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
                  onClick={() => navigate('/routine/new')}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-text-muted hover:text-text-primary bg-transparent border-none cursor-pointer mt-3 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> New routine
                </button>
              </div>

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
