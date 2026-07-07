import { useState, useRef, useEffect } from 'react'
import { HelpCircle } from 'lucide-react'

// A little "(?)" next to a Metric/Imperial toggle that explains what each
// system means. Click to open a small popover; click outside (or the icon
// again) to close. `align` decides which edge the popover hugs so it doesn't
// run off-screen next to right-aligned toggles.
export default function UnitHelp({ align = 'left' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <span ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="What do metric and imperial mean?"
        className="text-text-light hover:text-text-primary bg-transparent border-none cursor-pointer p-0.5 leading-none"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {open && (
        <span
          className={`absolute z-40 top-full mt-1.5 w-60 bg-white border border-border shadow-lg p-3 normal-case tracking-normal ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          <span className="block text-[12px] text-text-secondary leading-relaxed">
            <span className="font-medium text-text-primary">Metric</span> — weight in kilograms (kg), height in centimetres (cm), distance in kilometres (km).
          </span>
          <span className="block text-[12px] text-text-secondary leading-relaxed mt-1.5">
            <span className="font-medium text-text-primary">Imperial</span> — weight in pounds (lbs), height in inches (in), distance in miles (mi).
          </span>
        </span>
      )}
    </span>
  )
}
