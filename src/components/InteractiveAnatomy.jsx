import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { asset } from '../lib/assets'
import { hubPath } from '../data/muscleInfo'
import {
  ANATOMY_SOURCES,
  SEXES,
  readAnatomySex,
  writeAnatomySex,
  zonesFor,
  zonesForHub,
  polygonPoints,
} from '../data/anatomyRegions'

const DEBUG = import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('anatomy-debug')

// One cropped figure (front or back) with its clickable SVG overlay. The image
// is oversized and offset so the figure's bounding box fills the container;
// the overlay's viewBox is that same box, so polygons line up at any width.
function Figure({ src, view, zones, interactive, onActivate, onDebugClick }) {
  const box = src[view]
  const style = {
    width: `${(src.w / box.w) * 100}%`,
    height: `${(src.h / box.h) * 100}%`,
    left: `${(-box.x / box.w) * 100}%`,
    top: `${(-box.y / box.h) * 100}%`,
  }
  return (
    <div
      className="relative overflow-hidden rounded-lg"
      style={{ aspectRatio: `${box.w} / ${box.h}` }}
    >
      <img
        src={asset(src.src)}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="absolute max-w-none select-none pointer-events-none"
        style={style}
      />
      <svg
        viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
        className="absolute inset-0 w-full h-full"
        role={interactive ? 'group' : 'presentation'}
        onClick={onDebugClick}
      >
        {zones.map((z) =>
          interactive ? (
            <a
              key={z.slug}
              href={hubPath(z.slug)}
              className="anatomy-zone"
              aria-label={z.label}
              onClick={(e) => {
                e.preventDefault()
                onActivate(z, 'click')
              }}
              onMouseEnter={() => onActivate(z, 'hover')}
              onMouseLeave={() => onActivate(null, 'hover')}
              onFocus={() => onActivate(z, 'focus')}
              onBlur={() => onActivate(null, 'focus')}
            >
              <title>{z.label}</title>
              {z.shapes.map((s, i) => (
                <polygon key={i} points={polygonPoints(s, box)} />
              ))}
            </a>
          ) : (
            <g key={z.slug} className="anatomy-zone-active">
              {z.shapes.map((s, i) => (
                <polygon key={i} points={polygonPoints(s, box)} />
              ))}
            </g>
          )
        )}
        {DEBUG &&
          zones.map((z) => {
            const [cx, cy] = z.shapes[0][0]
            return (
              <text
                key={`dbg-${z.slug}`}
                x={box.x + cx * box.w}
                y={box.y + cy * box.h}
                className="fill-yellow-300 text-[11px]"
                style={{ pointerEvents: 'none' }}
              >
                {z.slug}
              </text>
            )
          })}
      </svg>
    </div>
  )
}

// The interactive body map. Props:
//   highlight    — hub slug to statically glow (paired with interactive={false})
//   interactive  — clickable hotspots + sex toggle (default) vs a static mini-map
//   views        — which figures to show (['front','back'] by default)
//   showSexToggle, compact, className
export default function InteractiveAnatomy({
  highlight = null,
  interactive = true,
  views = ['front', 'back'],
  showSexToggle = true,
  compact = false,
  className = '',
}) {
  const navigate = useNavigate()
  const [sex, setSex] = useState(readAnatomySex)
  const [active, setActive] = useState(null)
  const [failed, setFailed] = useState(false)
  const src = ANATOMY_SOURCES[sex]

  const chooseSex = (id) => {
    setSex(id)
    writeAnatomySex(id)
  }

  const onActivate = useCallback(
    (zone, source) => {
      if (zone && source === 'click') {
        navigate(hubPath(zone.slug))
        return
      }
      setActive(zone)
    },
    [navigate]
  )

  // In debug mode, log click coords in the image's pixel space for tuning.
  const debugClick = DEBUG
    ? (e) => {
        const svg = e.currentTarget
        const pt = svg.createSVGPoint()
        pt.x = e.clientX
        pt.y = e.clientY
        const p = pt.matrixTransform(svg.getScreenCTM().inverse())
        // eslint-disable-next-line no-console
        console.log(`anatomy-debug: [${Math.round(p.x)}, ${Math.round(p.y)}]`)
      }
    : undefined

  const zonesForView = (view) =>
    interactive ? zonesFor(sex, view) : zonesForHub(sex, highlight).filter((z) => z.view === view)

  // A failed image still leaves the page usable — the category pills below the
  // hero (or the hub's exercise list) remain the navigation path.
  if (failed) return <div className={className} />

  return (
    <div className={className}>
      {/* preload probe: flips to the pills-only fallback if the art 404s */}
      <img src={asset(src.src)} alt="" className="hidden" onError={() => setFailed(true)} />

      <div className="rounded-2xl border border-[#2a2c34] bg-[#0d0e12] px-4 py-5 sm:px-6">
        {(showSexToggle || (interactive && !compact)) && (
          <div className="flex items-center justify-between gap-3 mb-3">
            {interactive && !compact ? (
              <p className="text-[12px] text-[#c7c6c0]">Tap a highlighted muscle to see its exercises</p>
            ) : (
              <span />
            )}
            {showSexToggle && (
              <div className="inline-flex rounded-full border border-[#33353f] p-0.5 shrink-0">
                {SEXES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => chooseSex(s.id)}
                    aria-pressed={sex === s.id}
                    className={`text-[11px] px-3 py-1 rounded-full cursor-pointer border-none transition-colors ${
                      sex === s.id ? 'bg-[#efc65b] text-[#101116] font-medium' : 'bg-transparent text-[#c7c6c0]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={`grid gap-3 ${views.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
          {views.map((view) => (
            <Figure
              key={view}
              src={src}
              view={view}
              zones={zonesForView(view)}
              interactive={interactive}
              onActivate={onActivate}
              onDebugClick={debugClick}
            />
          ))}
        </div>

        {interactive && (
          <p className="text-[12px] text-[#efc65b] mt-3 min-h-[1.2em] text-center" aria-live="polite">
            {active ? active.label : ' '}
          </p>
        )}
      </div>
    </div>
  )
}
