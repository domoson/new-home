import type { Opening } from './model'

export const windowFrame = .05
export const windowJoint = .06
export const windowGap = .004

export const windowMullionStart = (opening: Opening) => (opening.windowLayout?.ventilationSide === 'start' ? opening.windowLayout.ventilationWidth ?? opening.width / 2 : opening.width - (opening.windowLayout?.ventilationWidth ?? opening.width / 2)) - windowJoint / 2

export function windowPanels(opening: Opening) {
  const columns = opening.windowLayout?.columns ?? 1
  const lowerFixed = opening.windowLayout?.lowerFixed ?? 0
  const ventilationWidth = columns === 2 ? opening.windowLayout?.ventilationWidth : undefined
  const ventilationColumn = opening.windowLayout?.ventilationSide === 'start' ? 0 : 1
  const equalWidth = (opening.width - 2 * windowFrame - (columns - 1) * windowJoint) / columns
  return Array.from({ length: columns }, (_, column) => {
    const width = ventilationWidth ? (column === ventilationColumn ? ventilationWidth : opening.width - ventilationWidth) - windowFrame - windowJoint / 2 : equalWidth
    const start = column === 0 ? windowFrame : windowMullionStart(opening) + windowJoint
    if (ventilationWidth && column !== ventilationColumn) return [{ column, start, bottom: windowFrame, width, height: opening.height - 2 * windowFrame, fixed: true, hinge: 'start' as const }]
    const bottom = lowerFixed ? lowerFixed + windowJoint / 2 : windowFrame
    const panels = [{ column, start, bottom, width, height: opening.height - windowFrame - bottom, fixed: opening.id.includes('fixed'), hinge: column === 1 ? 'end' as const : 'start' as const }]
    if (lowerFixed) panels.push({ column, start, bottom: windowFrame, width, height: lowerFixed - windowJoint / 2 - windowFrame, fixed: true, hinge: 'start' })
    return panels
  }).flat()
}