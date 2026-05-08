"use client"

import { useState, type ReactElement } from "react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyElement = ReactElement<any>

export function useExportPDF() {
  const [isGenerating, setIsGenerating] = useState(false)

  const exportar = async (document: AnyElement, filename: string) => {
    setIsGenerating(true)
    try {
      const { pdf } = await import("@react-pdf/renderer")
      // react-pdf espera ReactElement<DocumentProps>; nuestro wrapper lo satisface en runtime
      const blob = await (pdf as (el: AnyElement) => { toBlob(): Promise<Blob> })(
        document,
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = window.document.createElement("a")
      a.href = url
      a.download = filename
      window.document.body.appendChild(a)
      a.click()
      window.document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setIsGenerating(false)
    }
  }

  return { exportar, isGenerating }
}
