import regularFont from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2?url'
import mediumFont from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2?url'

export function canvasPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG konnte nicht erstellt werden.')), 'image/png'))
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function fontData(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Exportschrift konnte nicht geladen werden.')
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Exportschrift konnte nicht gelesen werden.'))
    reader.readAsDataURL(blob)
  })
}

export async function planPng(svg: SVGSVGElement): Promise<Blob> {
  const copy = svg.cloneNode(true) as SVGSVGElement
  const sources = [svg, ...svg.querySelectorAll<SVGElement>('*')]
  const targets = [copy, ...copy.querySelectorAll<SVGElement>('*')]
  const properties = ['font-family', 'font-size', 'font-weight', 'font-style', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'fill-opacity', 'stroke-opacity', 'text-anchor', 'dominant-baseline', 'paint-order', 'vector-effect', 'visibility', 'display']
  sources.forEach((source, index) => {
    const style = getComputedStyle(source)
    for (const property of properties) {
      const value = style.getPropertyValue(property)
      targets[index].style.setProperty(property, value.includes('url(') ? source.getAttribute(property) ?? value : value)
    }
  })
  const bounds = svg.viewBox.baseVal
  const scale = 3200 / Math.max(bounds.width, bounds.height)
  const width = Math.max(1, Math.round(bounds.width * scale)), height = Math.max(1, Math.round(bounds.height * scale))
  copy.setAttribute('width', String(width))
  copy.setAttribute('height', String(height))
  const fonts = await Promise.all([fontData(regularFont), fontData(mediumFont)])
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.textContent = fonts.map((data, index) => `@font-face{font-family:'IBM Plex Sans';font-weight:${index ? 500 : 400};src:url('${data}') format('woff2')}`).join('')
  copy.prepend(style)
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('PNG-Export wird von diesem Browser nicht unterstützt.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)
    return await canvasPng(canvas)
  } finally {
    URL.revokeObjectURL(url)
  }
}