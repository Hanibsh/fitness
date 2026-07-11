import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Search, X, Home } from 'lucide-react'
import { searchExercises } from '../lib/exerciseLibrary'
import {
  allByCategory,
  getFullExercise,
  EQUIPMENT,
  TYPES,
  primaryMuscles,
  titleCase,
  EXERCISE_COUNT,
} from '../lib/exerciseBank'

const AT_HOME = ['bodyweight', 'resistance band']

function ExerciseCard({ e }) {
  return (
    <Link
      to={`/exercises/${e.id}`}
      className="block bg-white border border-border rounded-xl p-4 no-underline hover:border-border-hover transition-all group"
    >
      <h3 className="font-heading text-[14px] font-medium text-text-primary group-hover:text-accent-hover transition-colors leading-snug">
        {e.name}
      </h3>
      <p className="text-text-muted text-[12px] mt-1.5">
        {titleCase(e.equipment)} · {titleCase(e.type)}
      </p>
      <p className="text-text-light text-[11px] mt-1 truncate">{primaryMuscles(e).join(', ')}</p>
    </Link>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`text-[12px] px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
        active
          ? 'bg-text-primary text-cream border-text-primary'
          : 'bg-white text-text-muted border-border hover:border-border-hover'
      }`}
    >
      {children}
    </button>
  )
}

export default function Exercises() {
  const [query, setQuery] = useState('')
  const [equip, setEquip] = useState(() => new Set())
  const [types, setTypes] = useState(() => new Set())

  const q = query.trim()
  const hasQuery = q.length > 0
  const hasFilters = equip.size > 0 || types.size > 0

  const toggle = (setter) => (val) =>
    setter((prev) => {
      const next = new Set(prev)
      next.has(val) ? next.delete(val) : next.add(val)
      return next
    })
  const toggleEquip = toggle(setEquip)
  const toggleType = toggle(setTypes)

  const atHomeOn = AT_HOME.every((x) => equip.has(x)) && equip.size === AT_HOME.length
  const setAtHome = () => setEquip(atHomeOn ? new Set() : new Set(AT_HOME))

  const matches = (e) =>
    (equip.size === 0 || equip.has(e.equipment)) && (types.size === 0 || types.has(e.type))

  // Query → flat ranked results (DB rows only). Filters narrow further.
  const results = useMemo(() => {
    if (!hasQuery) return null
    return searchExercises(q)
      .map((m) => (m.id ? getFullExercise(m.id) : null))
      .filter((e) => e && matches(e))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, hasQuery, equip, types])

  // No query → category sections, rows filtered; empty sections dropped.
  const sections = useMemo(() => {
    if (hasQuery) return null
    return allByCategory()
      .map(([cat, rows]) => [cat, rows.filter(matches)])
      .filter(([, rows]) => rows.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasQuery, equip, types])

  const clearAll = () => {
    setQuery('')
    setEquip(new Set())
    setTypes(new Set())
  }

  return (
    <div className="pt-24 pb-16 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <p className="text-[11px] uppercase tracking-[3px] text-text-light mb-4">Exercise Bank</p>
          <h1 className="font-heading text-4xl md:text-5xl font-medium text-text-primary mb-3 tracking-tight">
            Every exercise, explained
          </h1>
          <p className="text-text-muted text-[15px]">
            {EXERCISE_COUNT} movements — the muscles they hit, stimulus-to-fatigue, recovery, and rest.
          </p>
        </motion.div>

        {/* Search */}
        <div className="relative max-w-md mx-auto mb-4">
          <Search className="w-4 h-4 text-text-light absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises, muscles…"
            className="w-full bg-white border border-border rounded-full pl-10 pr-9 py-2.5 text-[14px] text-text-primary placeholder:text-text-light focus:outline-none focus:border-border-hover"
          />
          {hasQuery && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-text-primary bg-transparent border-none cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
          <Chip active={atHomeOn} onClick={setAtHome}>
            <span className="inline-flex items-center gap-1">
              <Home className="w-3 h-3" /> At home
            </span>
          </Chip>
          {EQUIPMENT.map((eq) => (
            <Chip key={eq} active={equip.has(eq)} onClick={() => toggleEquip(eq)}>
              {titleCase(eq)}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {TYPES.map((t) => (
            <Chip key={t} active={types.has(t)} onClick={() => toggleType(t)}>
              {titleCase(t)}
            </Chip>
          ))}
          {(hasQuery || hasFilters) && (
            <button
              onClick={clearAll}
              className="text-[12px] px-3 py-1.5 text-text-muted hover:text-text-primary bg-transparent border-none cursor-pointer underline underline-offset-2"
            >
              Clear
            </button>
          )}
        </div>

        {/* Results */}
        {results && (
          <div>
            <p className="text-text-light text-[12px] mb-4">
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </p>
            {results.length ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {results.map((e) => (
                  <ExerciseCard key={e.id} e={e} />
                ))}
              </div>
            ) : (
              <p className="text-text-muted text-[14px] text-center py-10">No exercises match.</p>
            )}
          </div>
        )}

        {sections &&
          (sections.length ? (
            sections.map(([category, rows]) => (
              <section key={category} className="mb-11">
                <h2 className="font-heading text-lg font-medium text-text-primary mb-4">
                  {category} <span className="text-text-light text-sm font-normal">· {rows.length}</span>
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {rows.map((e) => (
                    <ExerciseCard key={e.id} e={e} />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <p className="text-text-muted text-[14px] text-center py-10">No exercises match these filters.</p>
          ))}
      </div>
    </div>
  )
}
