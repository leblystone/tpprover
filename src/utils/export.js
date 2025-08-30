 export function exportToCSV(rows, filename = 'export.csv') {
   if (!Array.isArray(rows) || rows.length === 0) {
     const blob = new Blob([''], { type: 'text/csv' })
     downloadBlob(blob, filename)
     return
   }
   const headers = Object.keys(rows[0])
   const csvLines = []
   csvLines.push(headers.join(','))
   for (const row of rows) {
     const values = headers.map((h) => csvEscape(row[h]))
     csvLines.push(values.join(','))
   }
   const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' })
   downloadBlob(blob, filename)
 }

 function csvEscape(value) {
   if (value == null) return ''
   let s = String(value)
   if (s.includes('"')) s = s.replace(/"/g, '""')
   if (/[",\n]/.test(s)) s = `"${s}"`
   return s
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


