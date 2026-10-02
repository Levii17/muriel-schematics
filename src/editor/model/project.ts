import { emptyDoc } from './doc'
import { defaultSheet } from './sheet'
import type { Doc } from './types'

/** One page of a drawing. The id stays the same when sheets are reordered, so views and links can refer to it. */
export interface ProjectSheet {
  id: string
  doc: Doc
}

export const MAX_SHEETS = 40

/** Tab text for a sheet: its drawing title when it has one, otherwise "Sheet n". */
export function sheetName(sheet: ProjectSheet, index: number): string {
  const title = sheet.doc.sheet.fields.title.trim()
  return title || `Sheet ${index + 1}`
}

/**
 * An empty drawing that starts out like `from`: same paper and the same title block, so organisation, project,
 * author, date and revision carry over. The drawing title and details are cleared because each sheet has its own.
 */
export function blankLike(from: Doc): Doc {
  const base = emptyDoc()
  return {
    ...base,
    sheet: {
      ...from.sheet,
      fields: { ...from.sheet.fields, title: '', details: '', sheet: defaultSheet().fields.sheet },
    },
  }
}
