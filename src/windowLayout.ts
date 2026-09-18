import type { Opening } from './model'

export const windowFrame = .05
export const windowJoint = .06
export const windowGap = .004

export function windowPanels(opening: Opening) {
  const columns = opening.windowLayout?.columns ?? 1
  const lowerFixed = opening.windowLayout?.lowerFixed ?? 0
  const width = (opening.width - 2 * windowFrame - (columns - 1) * windowJoint) / columns
  return Array.from({ length: columns }, (_, column) => {
    const start = windowFrame + column * (width + windowJoint)
    const bottom = lowerFixed ? lowerFixed + windowJoint / 2 : windowFrame
    const panels = [{ column, start, bottom, width, height: opening.height - windowFrame - bottom, fixed: opening.id.includes('fixed'), hinge: column === 1 ? 'end' as const : 'start' as const }]
    if (lowerFixed) panels.push({ column, start, bottom: windowFrame, width, height: lowerFixed - windowJoint / 2 - windowFrame, fixed: true, hinge: 'start' })
    return panels
  }).flat()
}