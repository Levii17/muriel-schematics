/**
 * Open the drawing in a bare page sized to the paper and start the browser's print dialog,
 * which is also the way to "Save as PDF". Returns false if the pop-up was blocked.
 */
export function printSheet(svg: string, size: string): boolean {
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>Muriel drawing</title>` +
      `<style>@page{size:${size} landscape;margin:0}html,body{margin:0;background:#fff}svg{display:block;width:100vw;height:100vh}</style>` +
      `</head><body>${svg}</body></html>`,
  )
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 300)
  return true
}