// Dynamic import: jsPDF + html2canvas + purify (~400 KB) sólo se cargan
// cuando el usuario clickea "Exportar PDF". Antes esos chunks se descargaban
// con el bundle inicial aunque la mayoría de usuarios no exportan PDF.
export async function exportListPdf({
  items,            // array of { num, name, team, type }
  title,            // string — header del PDF
  subtitle,         // optional string
  username,         // optional — para footer
  publicUrl,        // optional — para footer
}) {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const marginX = 40
  const today = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })

  // Header
  doc.setFillColor(6, 8, 15)
  doc.rect(0, 0, pageW, 80, 'F')
  doc.setTextColor(245, 200, 70)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text((title || 'Lista').toUpperCase(), marginX, 38)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(180, 180, 180)
  doc.text((subtitle || '') + (username ? ` · ${username}` : '') + ` · ${today}`, marginX, 58)

  // Column headers
  let y = 110
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(120, 120, 120)
  doc.text('#', marginX, y)
  doc.text('NOMBRE', marginX + 50, y)
  doc.text('EQUIPO', marginX + 280, y)
  doc.setDrawColor(220, 220, 220)
  doc.line(marginX, y + 4, pageW - marginX, y + 4)

  y += 22
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(11)

  for (const it of items) {
    if (y > pageH - 60) {
      doc.addPage()
      y = 60
    }
    doc.setTextColor(150, 110, 0)
    doc.setFont('helvetica', 'bold')
    doc.text(`#${it.num ?? '—'}`, marginX, y)
    doc.setTextColor(20, 20, 20)
    doc.setFont('helvetica', 'normal')
    const name = String(it.name || '').slice(0, 38)
    doc.text(name, marginX + 50, y)
    doc.setTextColor(110, 110, 110)
    doc.text(String(it.team || '').slice(0, 22), marginX + 280, y)
    y += 18
  }

  // Footer on last page
  doc.setFontSize(9)
  doc.setTextColor(140, 140, 140)
  const footer = publicUrl
    ? `Coordina un cambio: ${publicUrl}`
    : 'Adrenalyn Tracker · WC 2026'
  doc.text(footer, marginX, pageH - 30)

  const safeTitle = (title || 'lista').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  doc.save(`adrenalyn-${safeTitle}-${today.replace(/\s+/g, '')}.pdf`)
}
