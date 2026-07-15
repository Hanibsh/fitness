// The in-depth muscle guide that leads every hub — blurb, then whichever of
// the structured sections (anatomy / functions / training) the entry has, so
// partially written MUSCLE_INFO entries degrade to the old blurb-only card.
const SECTIONS = [
  ['anatomy', 'Anatomy'],
  ['functions', 'What it does'],
  ['training', 'How to train it'],
]

export default function MuscleGuide({ info }) {
  if (!info) return null
  const sections = SECTIONS.filter(([key]) => info[key]?.length)
  return (
    <div className="bg-white border border-border rounded-xl p-5 mt-6 mb-8">
      <p className="text-text-secondary text-[14px] leading-relaxed">{info.blurb}</p>
      {sections.map(([key, title]) => (
        <div key={key} className="mt-4">
          <p className="text-[11px] uppercase tracking-[2px] text-text-light mb-1.5">{title}</p>
          <ul className="list-none m-0 p-0 space-y-1.5">
            {info[key].map((line) => (
              <li key={line} className="text-text-secondary text-[13.5px] leading-relaxed flex gap-2">
                <span className="text-text-light shrink-0">–</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {info.size && (
        <p className="text-[13px] text-accent-hover mt-4 pt-3 border-t border-border font-medium">
          {info.size}
        </p>
      )}
    </div>
  )
}
