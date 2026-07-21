import { useState } from 'react'
import { Check } from 'lucide-react'
import Modal from './Modal'

// Review what this session changed relative to the split day it came from, and
// pick what gets written back. Everything is checked by default — the list only
// appears when something genuinely differs — but each line is independent, so a
// one-off extra set doesn't have to become a new prescription.
export default function SplitSyncModal({ dayName, changes, onApply, onClose }) {
  const [skipped, setSkipped] = useState(() => new Set())
  const toggle = (id) =>
    setSkipped((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const accepted = changes.filter((c) => !skipped.has(c.id))

  return (
    <Modal onClose={onClose} maxWidth="max-w-md">
      <div className="p-7">
        <h3 className="font-heading text-xl font-medium text-text-primary mb-1">Update split</h3>
        <p className="text-[13px] text-text-muted mb-5 leading-relaxed">
          This session differs from <span className="text-text-primary">{dayName}</span>. Pick what to
          keep in the plan — weights aren't part of it, they carry over from your last session either way.
        </p>

        <ul className="list-none p-0 m-0 mb-6 border-t border-border">
          {changes.map((c) => {
            const on = !skipped.has(c.id)
            return (
              <li key={c.id} className="border-b border-border">
                <button
                  type="button"
                  onClick={() => toggle(c.id)}
                  aria-pressed={on}
                  className="w-full flex items-start gap-3 text-left px-1 py-3 bg-transparent border-none cursor-pointer hover:bg-cream transition-colors"
                >
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 shrink-0 w-4 h-4 border flex items-center justify-center transition-colors ${
                      on ? 'bg-text-primary border-text-primary' : 'bg-white border-border'
                    }`}
                  >
                    {on && <Check className="w-3 h-3 text-cream" />}
                  </span>
                  <span className={`text-[13px] leading-snug ${on ? 'text-text-primary' : 'text-text-light'}`}>
                    {describe(c)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="flex gap-3">
          <button
            onClick={() => { onApply(accepted); onClose() }}
            disabled={accepted.length === 0}
            className="flex-1 bg-text-primary text-cream font-medium py-3 border-none cursor-pointer text-[14px] hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {accepted.length === changes.length
              ? 'Update split'
              : `Update split (${accepted.length} of ${changes.length})`}
          </button>
          <button
            onClick={onClose}
            className="px-5 text-text-muted hover:text-text-primary bg-white border border-border hover:border-border-hover cursor-pointer text-[13px] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}

// One human-readable line per change. Kept next to the modal rather than in
// splitSync.js so the diff stays pure data and the wording lives with the UI.
function describe(c) {
  switch (c.kind) {
    case 'sets':
      return (
        <>
          <span className="font-medium">{c.name}</span> — sets {c.from} → {c.to}
        </>
      )
    case 'repRange':
      return (
        <>
          <span className="font-medium">{c.name}</span> — target {c.from} → {c.to}
        </>
      )
    case 'add':
      return (
        <>
          Add <span className="font-medium">{c.name}</span> — {c.sets} {c.sets === 1 ? 'set' : 'sets'}
          {c.repRange ? `, ${c.repRange.low}–${c.repRange.high}` : ''}
        </>
      )
    case 'remove':
      return (
        <>
          Remove <span className="font-medium">{c.name}</span>
        </>
      )
    case 'supersets':
      return 'Update superset pairing'
    default:
      return c.name
  }
}
