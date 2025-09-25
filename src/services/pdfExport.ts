import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface PdfExportOptions {
  fileName?: string
  title?: string
  subtitle?: string
  notes?: string
}

export async function exportResultsPdf(element: HTMLElement, { fileName = 'economia-solar.pdf', title, subtitle, notes }: PdfExportOptions = {}) {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  })

  const imageData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = 10

  if (title) {
    pdf.setFontSize(18)
    pdf.text(title, margin, 18)
  }

  if (subtitle) {
    pdf.setFontSize(12)
    pdf.setTextColor('#475569')
    pdf.text(subtitle, margin, title ? 28 : 18)
    pdf.setTextColor('#0f172a')
  }

  const startY = title ? (subtitle ? 36 : 24) : 12
  const contentWidth = pageWidth - margin * 2

  const imgProps = pdf.getImageProperties(imageData)
  const ratio = imgProps.height / imgProps.width
  const renderHeight = contentWidth * ratio

  pdf.addImage(imageData, 'PNG', margin, startY, contentWidth, renderHeight, undefined, 'FAST')

  if (notes) {
    const noteY = startY + renderHeight + 10
    pdf.setFontSize(10)
    pdf.setTextColor('#64748b')
    pdf.text(notes, margin, noteY, { maxWidth: contentWidth })
  }

  pdf.save(fileName)
}
