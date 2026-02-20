import * as XLSX from 'xlsx'

export function exportToExcel(data, filename = 'export.xlsx') {
  if (!data || data.length === 0) {
    alert('No data to export')
    return
  }

  // Create workbook and worksheet
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data')

  // Auto-fit column widths
  const maxWidth = []
  const header = Object.keys(data[0] || {})
  header.forEach((col, i) => {
    maxWidth[i] = Math.max(col.length, ...data.map(row => String(row[col] || '').length))
  })
  ws['!cols'] = maxWidth.map(w => ({ wch: Math.min(w + 2, 50) }))

  // Write file
  XLSX.writeFile(wb, filename)
}

export function exportToCSV(data, filename = 'export.csv') {
  if (!data || data.length === 0) {
    alert('No data to export')
    return
  }

  // Create CSV content
  const headers = Object.keys(data[0] || {})
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h] || ''
        // Escape quotes and wrap in quotes if contains comma or quote
        const escaped = String(val).replace(/"/g, '""')
        return escaped.includes(',') || escaped.includes('"') ? `"${escaped}"` : escaped
      }).join(',')
    )
  ].join('\n')

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
}
