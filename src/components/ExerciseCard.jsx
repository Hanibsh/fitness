import { Link } from 'react-router-dom'
import { primaryMuscles, titleCase } from '../lib/exerciseBank'

// Compact card for one exercise in the bank (browse landing, hubs, search).
export default function ExerciseCard({ e }) {
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
