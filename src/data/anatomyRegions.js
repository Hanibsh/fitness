// Clickable-region geometry for the interactive anatomy map (see
// components/InteractiveAnatomy.jsx). Each anatomy image (1024x1024) holds a
// front figure and a back figure side by side. Every image declares a tight
// bounding BOX per view (measured from the actual art), and the SVG overlay
// crops to that box via viewBox.
//
// Muscle ZONES are traced by hand, per sex + view, following the muscle
// outlines so a tap on the drawing lands on the right muscle. Coordinates are
// normalized (0..1) WITHIN that view's box, so they stay aligned at any render
// size. Zones are being added muscle-group by muscle-group; a (sex, view) with
// no entry simply has no clickable overlay yet.
//
// Tuning workflow: crop a figure to its box, upscale, draw candidate polygons
// over it with sharp, eyeball, adjust. `?anatomy-debug` on /exercises also logs
// click coordinates in the image's pixel space.
import { SUBCATEGORIES } from './muscleInfo'

// Boxes are natural-pixel {x,y,w,h} of each figure within its 1024x1024 image.
export const ANATOMY_SOURCES = {
  male: {
    src: 'images/anatomy-male.webp',
    w: 1024,
    h: 1024,
    front: { x: 56, y: 30, w: 408, h: 970 },
    back: { x: 560, y: 30, w: 408, h: 970 },
  },
  female: {
    src: 'images/anatomy-female.webp',
    w: 1024,
    h: 1024,
    front: { x: 34, y: 38, w: 456, h: 950 },
    back: { x: 534, y: 38, w: 454, h: 950 },
  },
}

export const SEXES = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
]

const SEX_KEY = 'leon_anatomy_sex'
const DEFAULT_SEX = 'female' // the view that currently has traced zones

export function readAnatomySex() {
  try {
    const s = localStorage.getItem(SEX_KEY)
    if (s === 'male' || s === 'female') return s
  } catch { /* ignore */ }
  return DEFAULT_SEX
}

export function writeAnatomySex(id) {
  try { localStorage.setItem(SEX_KEY, id) } catch { /* ignore */ }
}

// Traced clickable zones: sex → view → [{ slug, label, shapes }]. Each shape is
// a normalized polygon (array of [nx, ny]) within the view's box. Left/right
// pairs share a slug and light up together. Draw order within a view matters
// where zones overlap — later wins the click (adductors sit over the inner
// quad edges, so they come last).
export const ANATOMY_ZONES = {
  female: {
    front: [
      {
        slug: 'chest', label: 'Chest',
        shapes: [[[0.5, 0.1965], [0.3984, 0.1935], [0.3641, 0.2266], [0.3781, 0.2641], [0.4031, 0.3038], [0.4766, 0.3151], [0.5, 0.3106], [0.5234, 0.3151], [0.5969, 0.3038], [0.6219, 0.2641], [0.6359, 0.2266], [0.6016, 0.1935]]],
      },
      {
        slug: 'shoulders', label: 'Shoulders',
        shapes: [
          [[0.3875, 0.186], [0.3203, 0.189], [0.2578, 0.2086], [0.2234, 0.2386], [0.2469, 0.2686], [0.3281, 0.2641], [0.3719, 0.2363], [0.3937, 0.2011]],
          [[0.6125, 0.186], [0.6797, 0.189], [0.7422, 0.2086], [0.7766, 0.2386], [0.7531, 0.2686], [0.6719, 0.2641], [0.6281, 0.2363], [0.6062, 0.2011]],
        ],
      },
      {
        slug: 'biceps', label: 'Biceps',
        shapes: [
          [[0.2219, 0.2491], [0.35, 0.2701], [0.3219, 0.3466], [0.2687, 0.4171], [0.1719, 0.4111], [0.1906, 0.3338], [0.2109, 0.2791]],
          [[0.7781, 0.2491], [0.65, 0.2701], [0.6781, 0.3466], [0.7312, 0.4171], [0.8281, 0.4111], [0.8094, 0.3338], [0.7891, 0.2791]],
        ],
      },
      {
        slug: 'forearms', label: 'Forearms',
        shapes: [
          [[0.1719, 0.4111], [0.2687, 0.4186], [0.2437, 0.4651], [0.2344, 0.5161], [0.1219, 0.5101], [0.1406, 0.4576]],
          [[0.8281, 0.4111], [0.7312, 0.4186], [0.7562, 0.4651], [0.7656, 0.5161], [0.8781, 0.5101], [0.8594, 0.4576]],
        ],
      },
      {
        slug: 'quads', label: 'Quads',
        shapes: [
          [[0.3625, 0.5176], [0.4875, 0.5289], [0.4906, 0.6602], [0.4813, 0.7614], [0.3906, 0.7614], [0.3688, 0.6452], [0.3563, 0.5701]],
          [[0.6375, 0.5176], [0.5125, 0.5289], [0.5094, 0.6602], [0.5188, 0.7614], [0.6094, 0.7614], [0.6312, 0.6452], [0.6438, 0.5701]],
        ],
      },
      {
        slug: 'adductors', label: 'Adductors',
        shapes: [[[0.4734, 0.5289], [0.5266, 0.5289], [0.5344, 0.6377], [0.5031, 0.6962], [0.4688, 0.6377]]],
      },
    ],
  },
}

// Clickable zones for a given sex + view (empty if none traced yet).
export function zonesFor(sex, view) {
  return ANATOMY_ZONES[sex]?.[view] || []
}

// Does a zone belong to a hub slug — the zone's own slug, or a zone whose slug
// is a subcategory of the hub (Arms hub ⊃ biceps/forearms, Legs ⊃ quads/…).
function zoneMatchesHub(zone, slug) {
  return zone.slug === slug || SUBCATEGORIES[zone.slug]?.parent === slug
}

// Zones (tagged with their view) that a hub should highlight, for a given sex.
export function zonesForHub(sex, slug) {
  const out = []
  for (const view of ['front', 'back']) {
    for (const z of zonesFor(sex, view)) {
      if (zoneMatchesHub(z, slug)) out.push({ ...z, view })
    }
  }
  return out
}

// Which views carry a hub's zones (so a front-only muscle shows just the front
// figure). Empty when the hub has no traced zones yet for this sex.
export function viewsForHub(sex, slug) {
  return [...new Set(zonesForHub(sex, slug).map((z) => z.view))]
}

// Convert a normalized polygon to an SVG points string in the box's pixel
// space (which is also the overlay's viewBox), so shapes line up with the art.
export function polygonPoints(shape, box) {
  return shape.map(([nx, ny]) => `${box.x + nx * box.w},${box.y + ny * box.h}`).join(' ')
}
