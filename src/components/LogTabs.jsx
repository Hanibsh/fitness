import { Link } from 'react-router-dom'

// The two halves of the training area: the log itself and the training split
// that schedules it. Rendered as a small segmented switcher at the top of both
// pages so they read as one place. `active` is the current tab's path.
const TABS = [
  { to: '/log', label: 'Log' },
  { to: '/log/split', label: 'Training split' },
]

export default function LogTabs({ active }) {
  return (
    <div className="inline-flex border border-border mb-10">
      {TABS.map((t) => {
        const isActive = t.to === active
        return (
          <Link
            key={t.to}
            to={t.to}
            aria-current={isActive ? 'page' : undefined}
            className={`px-4 py-1.5 text-[13px] font-medium no-underline transition-colors ${
              isActive ? 'bg-text-primary text-cream' : 'bg-white text-text-muted hover:text-text-primary'
            }`}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
