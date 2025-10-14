export function exportToCSV(rows, filename = 'export.csv') {
  if (!Array.isArray(rows) || rows.length === 0) {
    const blob = new Blob(['No data to export'], { type: 'text/csv' })
    downloadBlob(blob, filename)
    return
  }
  
  // Get all unique headers from all rows
  const allHeaders = new Set()
  rows.forEach(row => {
    Object.keys(row).forEach(key => allHeaders.add(key))
  })
  const headers = Array.from(allHeaders).sort()
  
  const csvLines = []
  
  // Add BOM for proper UTF-8 encoding in Excel
  csvLines.push('\uFEFF')
  
  // Add headers
  csvLines.push(headers.join(','))
  
  // Add data rows
  for (const row of rows) {
    const values = headers.map((h) => csvEscape(flattenValue(row[h])))
    csvLines.push(values.join(','))
  }
  
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, filename)
}

function csvEscape(value) {
  if (value == null || value === undefined) return ''
  let s = String(value)
  if (s.includes('"')) s = s.replace(/"/g, '""')
  if (/[",\n\r]/.test(s)) s = `"${s}"`
  return s
}

function flattenValue(value) {
  if (value == null || value === undefined) return ''
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map(item => 
        typeof item === 'object' ? JSON.stringify(item) : String(item)
      ).join('; ')
    }
    return JSON.stringify(value)
  }
  return String(value)
}

 function downloadBlob(blob, filename) {
   const url = URL.createObjectURL(blob)
   const a = document.createElement('a')
   a.href = url
   a.download = filename
   document.body.appendChild(a)
   a.click()
   a.remove()
   URL.revokeObjectURL(url)
 }


