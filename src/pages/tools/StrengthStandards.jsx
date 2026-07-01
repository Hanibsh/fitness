import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

const inputBounds = {
  bodyweight: { metric: { min: 20, max: 300 }, imperial: { min: 44, max: 660 } },
  lifted: { metric: { min: 1, max: 500 }, imperial: { min: 2, max: 1100 } },
  reps: { min: 1, max: 20 },
}

// Squat/Bench/Deadlift: 5-tier scale from Jeff Nippard's "Noob to Freak" standards.
// Other lifts: 6-tier scale (adds "Below beginner") from Strength Level's user-submitted data.
const lifts = {
  squat: {
    name: 'Squat',
    source: "Jeff Nippard's \"Noob to Freak\" standards",
    male: [
      { label: 'Beginner', floor: 0 },
      { label: 'Intermediate', floor: 1.25 },
      { label: 'Advanced', floor: 1.75 },
      { label: 'Elite', floor: 2.5 },
      { label: 'Freak', floor: 3.0 },
    ],
    female: [
      { label: 'Beginner', floor: 0 },
      { label: 'Intermediate', floor: 1.0 },
      { label: 'Advanced', floor: 1.5 },
      { label: 'Elite', floor: 1.75 },
      { label: 'Freak', floor: 2.25 },
    ],
  },
  bench: {
    name: 'Bench press',
    source: "Jeff Nippard's \"Noob to Freak\" standards",
    male: [
      { label: 'Beginner', floor: 0 },
      { label: 'Intermediate', floor: 1.0 },
      { label: 'Advanced', floor: 1.5 },
      { label: 'Elite', floor: 2.0 },
      { label: 'Freak', floor: 2.25 },
    ],
    female: [
      { label: 'Beginner', floor: 0 },
      { label: 'Intermediate', floor: 0.5 },
      { label: 'Advanced', floor: 0.75 },
      { label: 'Elite', floor: 1.0 },
      { label: 'Freak', floor: 1.25 },
    ],
  },
  deadlift: {
    name: 'Deadlift',
    source: "Jeff Nippard's \"Noob to Freak\" standards",
    male: [
      { label: 'Beginner', floor: 0 },
      { label: 'Intermediate', floor: 1.5 },
      { label: 'Advanced', floor: 2.25 },
      { label: 'Elite', floor: 3.0 },
      { label: 'Freak', floor: 3.5 },
    ],
    female: [
      { label: 'Beginner', floor: 0 },
      { label: 'Intermediate', floor: 1.25 },
      { label: 'Advanced', floor: 1.75 },
      { label: 'Elite', floor: 2.25 },
      { label: 'Freak', floor: 3.0 },
    ],
  },
  hackSquat: {
    name: 'Hack squat',
    source: 'Strength Level community data',
    male: [
      { label: 'Below beginner', floor: 0 },
      { label: 'Beginner', floor: 0.75 },
      { label: 'Novice', floor: 1.25 },
      { label: 'Intermediate', floor: 2.0 },
      { label: 'Advanced', floor: 2.75 },
      { label: 'Elite+', floor: 4.0 },
    ],
    female: [
      { label: 'Below beginner', floor: 0 },
      { label: 'Beginner', floor: 0.25 },
      { label: 'Novice', floor: 0.75 },
      { label: 'Intermediate', floor: 1.5 },
      { label: 'Advanced', floor: 2.25 },
      { label: 'Elite+', floor: 3.25 },
    ],
  },
  rdl: {
    name: 'Romanian deadlift',
    source: 'Strength Level community data',
    male: [
      { label: 'Below beginner', floor: 0 },
      { label: 'Beginner', floor: 0.75 },
      { label: 'Novice', floor: 1.0 },
      { label: 'Intermediate', floor: 1.5 },
      { label: 'Advanced', floor: 2.0 },
      { label: 'Elite+', floor: 2.75 },
    ],
    female: [
      { label: 'Below beginner', floor: 0 },
      { label: 'Beginner', floor: 0.5 },
      { label: 'Novice', floor: 0.75 },
      { label: 'Intermediate', floor: 1.0 },
      { label: 'Advanced', floor: 1.5 },
      { label: 'Elite+', floor: 1.75 },
    ],
  },
  bicepCurl: {
    name: 'Bicep curl (dumbbell)',
    source: 'Strength Level community data',
    male: [
      { label: 'Below beginner', floor: 0 },
      { label: 'Beginner', floor: 0.1 },
      { label: 'Novice', floor: 0.15 },
      { label: 'Intermediate', floor: 0.3 },
      { label: 'Advanced', floor: 0.5 },
      { label: 'Elite+', floor: 0.65 },
    ],
    female: [
      { label: 'Below beginner', floor: 0 },
      { label: 'Beginner', floor: 0.05 },
      { label: 'Novice', floor: 0.1 },
      { label: 'Intermediate', floor: 0.2 },
      { label: 'Advanced', floor: 0.35 },
      { label: 'Elite+', floor: 0.45 },
    ],
  },
  skullCrusher: {
    name: 'Skull crusher',
    source: 'Strength Level community data',
    male: [
      { label: 'Below beginner', floor: 0 },
      { label: 'Beginner', floor: 0.2 },
      { label: 'Novice', floor: 0.35 },
      { label: 'Intermediate', floor: 0.55 },
      { label: 'Advanced', floor: 0.8 },
      { label: 'Elite+', floor: 1.1 },
    ],
    female: [
      { label: 'Below beginner', floor: 0 },
      { label: 'Beginner', floor: 0.1 },
      { label: 'Novice', floor: 0.2 },
      { label: 'Intermediate', floor: 0.35 },
      { label: 'Advanced', floor: 0.55 },
      { label: 'Elite+', floor: 0.75 },
    ],
  },
  tBarRow: {
    name: 'T-bar row',
    source: 'Strength Level community data',
    male: [
      { label: 'Below beginner', floor: 0 },
      { label: 'Beginner', floor: 0.5 },
      { label: 'Novice', floor: 0.75 },
      { label: 'Intermediate', floor: 1.0 },
      { label: 'Advanced', floor: 1.5 },
      { label: 'Elite+', floor: 2.0 },
    ],
    female: [
      { label: 'Below beginner', floor: 0 },
      { label: 'Beginner', floor: 0.25 },
      { label: 'Novice', floor: 0.45 },
      { label: 'Intermediate', floor: 0.75 },
      { label: 'Advanced', floor: 1.05 },
      { label: 'Elite+', floor: 1.45 },
    ],
  },
  smithSquat: {
    name: 'Smith machine squat',
    source: 'Strength Level community data',
    male: [
      { label: 'Below beginner', floor: 0 },
      { label: 'Beginner', floor: 0.75 },
      { label: 'Novice', floor: 1.0 },
      { label: 'Intermediate', floor: 1.5 },
      { label: 'Advanced', floor: 2.25 },
      { label: 'Elite+', floor: 3.0 },
    ],
    female: [
      { label: 'Below beginner', floor: 0 },
      { label: 'Beginner', floor: 0.25 },
      { label: 'Novice', floor: 0.75 },
      { label: 'Intermediate', floor: 1.0 },
      { label: 'Advanced', floor: 1.5 },
      { label: 'Elite+', floor: 2.25 },
    ],
  },
  legExtension: {
    name: 'Leg extension',
    source: 'Strength Level community data',
    male: [
      { label: 'Below beginner', floor: 0 },
      { label: 'Beginner', floor: 0.5 },
      { label: 'Novice', floor: 0.75 },
      { label: 'Intermediate', floor: 1.25 },
      { label: 'Advanced', floor: 1.75 },
      { label: 'Elite+', floor: 2.5 },
    ],
    female: [
      { label: 'Below beginner', floor: 0 },
      { label: 'Beginner', floor: 0.25 },
      { label: 'Novice', floor: 0.5 },
      { label: 'Intermediate', floor: 1.0 },
      { label: 'Advanced', floor: 1.25 },
      { label: 'Elite+', floor: 2.0 },
    ],
  },
  legCurl: {
    name: 'Leg curl',
    source: 'Strength Level community data',
    male: [
      { label: 'Below beginner', floor: 0 },
      { label: 'Beginner', floor: 0.5 },
      { label: 'Novice', floor: 0.75 },
      { label: 'Intermediate', floor: 1.0 },
      { label: 'Advanced', floor: 1.5 },
      { label: 'Elite+', floor: 2.0 },
    ],
    female: [
      { label: 'Below beginner', floor: 0 },
      { label: 'Beginner', floor: 0.25 },
      { label: 'Novice', floor: 0.45 },
      { label: 'Intermediate', floor: 0.75 },
      { label: 'Advanced', floor: 1.05 },
      { label: 'Elite+', floor: 1.45 },
    ],
  },
}

const zoneColors6 = ['bg-border-hover', 'bg-blue-400', 'bg-teal-400', 'bg-green-500', 'bg-yellow-500', 'bg-red-600']
const zoneColors5 = ['bg-blue-400', 'bg-teal-400', 'bg-green-500', 'bg-yellow-500', 'bg-red-600']

function matchTier(tierList, ratio) {
  let result = tierList[0].label
  for (const t of tierList) {
    if (ratio >= t.floor) result = t.label
  }
  return result
}

export default function StrengthStandards() {
  const [unit, setUnit] = useState('metric')
  const [sex, setSex] = useState('male')
  const [lift, setLift] = useState('squat')
  const [bodyweight, setBodyweight] = useState('')
  const [lifted, setLifted] = useState('')
  const [reps, setReps] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  function calculate() {
    const bw = parseFloat(bodyweight), w = parseFloat(lifted), r = parseInt(reps)
    if (!bw || !w || !r) {
      setError('Enter your bodyweight, weight lifted, and reps to calculate.')
      setResult(null)
      return
    }
    const bwRange = inputBounds.bodyweight[unit], liftedRange = inputBounds.lifted[unit]
    const unitLabel = unit === 'imperial' ? 'lbs' : 'kg'
    if (bw < bwRange.min || bw > bwRange.max) {
      setError(`Bodyweight should be between ${bwRange.min} and ${bwRange.max} ${unitLabel}.`)
      setResult(null)
      return
    }
    if (w < liftedRange.min || w > liftedRange.max) {
      setError(`Weight lifted should be between ${liftedRange.min} and ${liftedRange.max} ${unitLabel}.`)
      setResult(null)
      return
    }
    if (r < inputBounds.reps.min || r > inputBounds.reps.max) {
      setError(`Reps should be between ${inputBounds.reps.min} and ${inputBounds.reps.max}.`)
      setResult(null)
      return
    }
    setError('')

    const e1RM = w * (36 / (37 - r))
    const ratio = e1RM / bw
    const tierList = lifts[lift][sex]
    const tier = matchTier(tierList, ratio)

    setResult({ e1RM: Math.round(e1RM * 10) / 10, ratio: Math.round(ratio * 100) / 100, tier })
  }

  const toggle = (active, onClick, label) => (
    <button onClick={onClick} className={`flex-1 py-3 text-[13px] font-medium border cursor-pointer transition-colors ${active ? 'bg-text-primary text-cream border-text-primary' : 'bg-white text-text-muted border-border hover:border-border-hover'}`}>{label}</button>
  )

  const tierList = lifts[lift][sex]
  const domainMax = tierList[tierList.length - 1].floor * 1.3
  const colors = tierList.length === 6 ? zoneColors6 : zoneColors5
  const zones = tierList.map((t, i) => ({
    label: t.label,
    min: t.floor,
    max: i < tierList.length - 1 ? tierList[i + 1].floor : domainMax,
    color: colors[i],
  }))

  return (
    <div className="pt-28 pb-24 px-6">
      <div className="max-w-2xl mx-auto">
        <Link to="/tools" className="inline-flex items-center gap-1.5 text-text-muted hover:text-text-primary no-underline text-[13px] mb-10 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to tools
        </Link>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-heading text-4xl font-medium text-text-primary mb-3">Strength standards</h1>
          <p className="text-text-muted text-[15px] mb-10">See where your lift ranks, from beginner to elite.</p>

          <div className="bg-white border border-border p-9 space-y-7">
            <div className="flex gap-3">
              {toggle(unit === 'metric', () => setUnit('metric'), 'Metric (kg)')}
              {toggle(unit === 'imperial', () => setUnit('imperial'), 'Imperial (lbs)')}
            </div>
            <div className="flex gap-3">
              {toggle(sex === 'male', () => setSex('male'), 'Male')}
              {toggle(sex === 'female', () => setSex('female'), 'Female')}
            </div>

            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider block mb-2">Lift</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(lifts).map(([key, l]) => (
                  <button key={key} onClick={() => setLift(key)} className={`py-3 text-[13px] font-medium border cursor-pointer transition-colors ${lift === key ? 'bg-text-primary text-cream border-text-primary' : 'bg-white text-text-muted border-border hover:border-border-hover'}`}>{l.name}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] text-text-muted uppercase tracking-wider block mb-2">Bodyweight ({unit === 'metric' ? 'kg' : 'lbs'})</label>
                <input type="number" min={inputBounds.bodyweight[unit].min} max={inputBounds.bodyweight[unit].max} value={bodyweight} onChange={e => setBodyweight(e.target.value)} placeholder={unit === 'metric' ? '80' : '176'} className="w-full bg-cream border border-border px-4 py-3 text-text-primary text-[13px] outline-none focus:border-text-primary transition-colors" />
              </div>
              <div>
                <label className="text-[11px] text-text-muted uppercase tracking-wider block mb-2">Weight lifted ({unit === 'metric' ? 'kg' : 'lbs'})</label>
                <input type="number" min={inputBounds.lifted[unit].min} max={inputBounds.lifted[unit].max} value={lifted} onChange={e => setLifted(e.target.value)} placeholder={unit === 'metric' ? '100' : '225'} className="w-full bg-cream border border-border px-4 py-3 text-text-primary text-[13px] outline-none focus:border-text-primary transition-colors" />
              </div>
              <div>
                <label className="text-[11px] text-text-muted uppercase tracking-wider block mb-2">Reps</label>
                <input type="number" min={inputBounds.reps.min} max={inputBounds.reps.max} value={reps} onChange={e => setReps(e.target.value)} placeholder="5" className="w-full bg-cream border border-border px-4 py-3 text-text-primary text-[13px] outline-none focus:border-text-primary transition-colors" />
              </div>
            </div>
            <p className="text-[12px] text-text-light -mt-4">We estimate your 1-rep max from this set (Brzycki formula) before comparing it to the standards — see the <Link to="/tools/one-rep-max" className="text-text-primary no-underline hover:text-accent-hover">1RM calculator</Link> for why.</p>

            {error && <p className="text-[13px] text-red-600">{error}</p>}

            <button onClick={calculate} className="w-full bg-text-primary text-cream font-medium py-3.5 border-none cursor-pointer text-[14px] hover:bg-accent-hover transition-colors">
              Calculate my level
            </button>
          </div>

          {result && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mt-10 bg-white border border-border p-9">
              <h2 className="font-heading text-xl font-medium text-text-primary mb-1.5">{lifts[lift].name}</h2>
              <p className="text-[12px] text-text-light mb-6">Source: {lifts[lift].source}</p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-cream border border-border p-5 text-center">
                  <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5">Estimated 1RM</p>
                  <p className="text-2xl font-medium text-text-primary">{result.e1RM}</p>
                  <p className="text-[11px] text-text-light">{unit === 'metric' ? 'kg' : 'lbs'}</p>
                </div>
                <div className="bg-text-primary p-5 text-center">
                  <p className="text-[11px] text-cream/70 uppercase tracking-wider mb-1.5">Your level</p>
                  <p className="text-2xl font-medium text-cream">{result.tier}</p>
                  <p className="text-[11px] text-cream/50">{result.ratio}x bodyweight</p>
                </div>
              </div>

              <div className="mt-8">
                <div className="relative h-4">
                  {tierList.map(t => (
                    <span key={t.label} className="absolute -translate-x-1/2 text-[10px] text-text-muted" style={{ left: `${(t.floor / domainMax) * 100}%` }}>{t.floor}x</span>
                  ))}
                </div>
                <div className="relative">
                  <div className="flex w-full h-3">
                    {zones.map(z => {
                      const width = ((z.max - z.min) / domainMax) * 100
                      return <div key={z.label} className={z.color} style={{ width: `${width}%` }} />
                    })}
                  </div>
                  <div
                    className="absolute top-[-4px] w-0.5 h-5 bg-text-primary"
                    style={{ left: `${Math.min(100, Math.max(0, (result.ratio / domainMax) * 100))}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4">
                {zones.map(z => (
                  <div key={z.label} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 ${z.color} shrink-0`} />
                    <span className="text-[11px] text-text-muted">{z.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mt-10 bg-white border border-border p-9">
            <h2 className="font-heading text-xl font-medium text-text-primary mb-6">Where these numbers come from</h2>
            <p className="text-[13px] text-text-muted leading-relaxed">Squat, bench press, and deadlift use Jeff Nippard's "Noob to Freak" strength standards — his own methodology cites competitive powerlifting data, Mark Rippetoe's Starting Strength standards, Tim Henriques' strength standards, and his own decade-plus of coaching experience. It's calibrated toward general gym-goers, not just competitive lifters.</p>
            <p className="text-[13px] text-text-muted leading-relaxed mt-4">The other eight lifts use Strength Level's community data (aggregated from hundreds of thousands of user-submitted lifts per exercise), since there's no equivalent general-audience dataset for isolation exercises like leg curls or skull crushers. Worth knowing: people who log lifts on a dedicated strength-tracking site skew toward more committed lifters than the average gym-goer, so these eight may read a little harder to satisfy than the big three above — useful as a relative ranking against other trained lifters, just calibrated to a different crowd.</p>
            <p className="text-[13px] text-text-muted leading-relaxed mt-4">One more specific note: there's no dedicated dataset for the chest-supported T-bar row, so "T-bar row" here uses the standard (non-chest-supported) version as the closest available data — the chest-supported variant removes some lower-back involvement, so real-world results may run slightly different from what's shown.</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
