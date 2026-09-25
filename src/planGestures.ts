import { useRef } from 'react'
import type { MouseEvent, PointerEvent } from 'react'

type Point = { x: number; y: number }

export function usePlanGestures(zoom: number, onZoom: (zoom: number) => void, center: Point, pan: Point, onPan: (pan: Point) => void, enabled = true) {
  const pointers = useRef(new Map<number, Point>())
  const drag = useRef<{ id: number; start: Point; pan: Point; moved: boolean } | null>(null)
  const pinch = useRef<{ distance: number; midpoint: Point; anchor: Point; zoom: number; pan: Point; scale: Point } | null>(null)
  const suppressClick = useRef(false)
  const midpoint = (points: Point[]) => ({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 })
  const separation = (points: Point[]) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)

  const pointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (!enabled) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 1) {
      suppressClick.current = false
      drag.current = { id: event.pointerId, start: { x: event.clientX, y: event.clientY }, pan, moved: false }
    } else if (pointers.current.size === 2) {
      const points = [...pointers.current.values()]
      const mid = midpoint(points)
      const matrix = event.currentTarget.getScreenCTM()!
      const anchor = new DOMPoint(mid.x, mid.y).matrixTransform(matrix.inverse())
      pinch.current = { distance: separation(points), midpoint: mid, anchor, zoom, pan, scale: { x: matrix.a, y: matrix.d } }
      drag.current = null
      suppressClick.current = true
      for (const id of pointers.current.keys()) event.currentTarget.setPointerCapture(id)
    }
  }
  const pointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!enabled || !pointers.current.has(event.pointerId)) return false
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pinch.current && pointers.current.size === 2) {
      const gesture = pinch.current
      const points = [...pointers.current.values()]
      const mid = midpoint(points)
      const nextZoom = Math.max(.7, Math.min(2.6, gesture.zoom * separation(points) / gesture.distance))
      const ratio = gesture.zoom / nextZoom
      onPan({
        x: gesture.pan.x + (gesture.anchor.x - center.x + gesture.pan.x) * (ratio - 1) + (mid.x - gesture.midpoint.x) / gesture.scale.x * ratio,
        y: gesture.pan.y + (gesture.anchor.y - center.y + gesture.pan.y) * (ratio - 1) + (mid.y - gesture.midpoint.y) / gesture.scale.y * ratio,
      })
      onZoom(nextZoom)
      return true
    }
    const current = drag.current
    if (!current || current.id !== event.pointerId) return false
    const deltaX = event.clientX - current.start.x, deltaY = event.clientY - current.start.y
    if (!current.moved && Math.hypot(deltaX, deltaY) < 4) return false
    if (!current.moved) { current.moved = true; event.currentTarget.setPointerCapture(event.pointerId) }
    suppressClick.current = true
    const matrix = event.currentTarget.getScreenCTM()!
    onPan({ x: current.pan.x + deltaX / matrix.a, y: current.pan.y + deltaY / matrix.d })
    return true
  }
  const pointerUp = (event: PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId)
    drag.current = null
    if (pointers.current.size < 2) pinch.current = null
  }
  const clickCapture = (event: MouseEvent<SVGSVGElement>) => {
    if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false }
  }
  return { pointerDown, pointerMove, pointerUp, clickCapture }
}