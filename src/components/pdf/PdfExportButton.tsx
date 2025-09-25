import { useState } from 'react'
import type { RefObject } from 'react'
import { exportResultsPdf } from '../../services/pdfExport'

interface PdfExportButtonProps {
  targetRef: RefObject<HTMLElement | null>
  fileName?: string
  title?: string
  subtitle?: string
  notes?: string
}

export function PdfExportButton({ targetRef, fileName, title, subtitle, notes }: PdfExportButtonProps) {
  const [isGenerating, setGenerating] = useState(false)

  const handleExport = async () => {
    if (!targetRef.current) return
    try {
      setGenerating(true)
      await exportResultsPdf(targetRef.current, {
        fileName,
        title,
        subtitle,
        notes,
      })
    } catch (error) {
      console.error('Falha ao exportar PDF', error)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <button type="button" className="primary-button" onClick={handleExport} disabled={isGenerating}>
      {isGenerating ? 'Gerando PDF…' : 'Exportar PDF'}
    </button>
  )
}
