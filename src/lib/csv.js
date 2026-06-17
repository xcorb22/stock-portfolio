// Tiny dependency-free CSV helpers.

const esc = (v) => {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// rows: array of objects. columns: [{ header, get(row) }]
export function toCSV(rows, columns) {
  const header = columns.map((c) => esc(c.header)).join(',')
  const body = rows.map((r) => columns.map((c) => esc(c.get(r))).join(',')).join('\n')
  return `${header}\n${body}`
}

export function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Parse CSV text into an array of objects keyed by the header row.
// Handles quoted fields, escaped quotes ("") and commas/newlines inside quotes.
export function parseCSV(text) {
  const rows = []
  let field = ''
  let row = []
  let inQuotes = false
  const src = text.replace(/\r\n?/g, '\n')

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += ch
  }
  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }

  const cleaned = rows.filter((r) => r.some((c) => c.trim() !== ''))
  if (cleaned.length === 0) return []
  const headers = cleaned[0].map((h) => h.trim().toLowerCase())
  return cleaned.slice(1).map((r) => {
    const obj = {}
    headers.forEach((h, idx) => (obj[h] = (r[idx] ?? '').trim()))
    return obj
  })
}
