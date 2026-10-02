export interface PrintPage {
  /** A complete `<svg>` element. */
  svg: string
  /** Paper size name such as "A3"; the page is printed landscape. */
  size: string
}

/**
 * Open one or more drawings in a bare page, one per printed page and each at its own paper size, and start the
 * browser's print dialog, which is also the way to "Save as PDF". Returns false if the pop-up was blocked.
 */
export function printPages(pages: PrintPage[]): boolean {
  if (!pages.length) return false
  const w = window.open('', '_blank')
  if (!w) return false
  const sizes = [...new Set(pages.map((p) => p.size))]
  const named = sizes.map((s) => `@page sz-${s}{size:${s} landscape;margin:0}.pg-${s}{page:sz-${s}}`).join('')
  const body = pages.map((p) => `<div class="pg pg-${p.size}">${p.svg}</div>`).join('')
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>Muriel drawing</title>` +
      `<style>${named}html,body{margin:0;background:#fff}.pg{width:100vw;height:100vh;break-after:page;overflow:hidden}.pg:last-child{break-after:auto}svg{display:block;width:100%;height:100%}</style>` +
      `</head><body>${body}</body></html>`,
  )
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 300)
  return true
}

/** Print a single drawing. */
export const printSheet = (svg: string, size: string): boolean => printPages([{ svg, size }])
