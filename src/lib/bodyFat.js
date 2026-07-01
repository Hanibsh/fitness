export const bodyFatRanges = {
  male: [
    { label: '8-10%', value: 9 },
    { label: '11-12%', value: 11.5 },
    { label: '13-15%', value: 14 },
    { label: '16-19%', value: 17.5 },
    { label: '20-24%', value: 22 },
    { label: '25-30%', value: 27.5 },
    { label: '31-40%', value: 35 },
  ],
  female: [
    { label: '12%', value: 12 },
    { label: '15%', value: 15 },
    { label: '20%', value: 20 },
    { label: '25%', value: 25 },
    { label: '30%', value: 30 },
    { label: '35%', value: 35 },
    { label: '40%', value: 40 },
  ],
}

export const bodyFatBounds = {
  male: { min: 4, max: 65, default: 20 },
  female: { min: 4, max: 65, default: 24 },
}

export function nearestBodyFatLabel(sex, value) {
  return bodyFatRanges[sex].reduce((best, r) => Math.abs(r.value - value) < Math.abs(best.value - value) ? r : best).label
}
