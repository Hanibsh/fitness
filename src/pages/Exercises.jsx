import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { allByCategory, primaryMuscles, titleCase, EXERCISE_COUNT } from '../lib/exerciseBank'

// The public exercise bank. Commit 1: category browse + card grid.
// Search + filter chips land in commit 2; the detail page carries the heatmap.
export default function Exercises() {
  const groups = allByCategory()

  return (
    <div className="pt-24 pb-16 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <p className="text-[11px] uppercase tracking-[3px] text-text-light mb-4">Exercise Bank</p>
          <h1 className="font-heading text-4xl md:text-5xl font-medium text-text-primary mb-3 tracking-tight">
            Every exercise, explained
          </h1>
          <p className="text-text-muted text-[15px]">
            {EXERCISE_COUNT} movements — the muscles they hit, stimulus-to-fatigue, recovery, and rest.
          </p>
        </motion.div>

        {groups.map(([category, rows]) => (
          <section key={category} className="mb-11">
            <h2 className="font-heading text-lg font-medium text-text-primary mb-4">
              {category} <span className="text-text-light text-sm font-normal">· {rows.length}</span>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rows.map((e) => (
                <Link
                  key={e.id}
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
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
