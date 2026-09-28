'use client'

import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useCVStore } from '@/store/cv-store'
import Image from 'next/image'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Download, RotateCcw, FileText, CheckCircle2, PenLine, FileDown, ChevronDown } from 'lucide-react'
import CoverLetterDocument from './cover-letter-document'
import SatisfactionPrompt from '@/components/support/satisfaction-prompt'

export default function CoverLetterPreview() {
  const { clFormData, generatedCL, language, setStep, resetCL, reset, generatedCV, formData } = useCVStore()
  const clRef = useRef<HTMLDivElement>(null)
  const [showSatisfaction, setShowSatisfaction] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowSatisfaction(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  function handleDownloadPDF() {
    const printWindow = window.open('', '_blank')
    if (!printWindow || !clRef.current) return

    const clHTML = clRef.current.innerHTML

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="${language}" dir="${language === 'ar' ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Lettre de motivation - ${clFormData.fullName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            -webkit-font-smoothing: antialiased;
          }
          @media print {
            @page { margin: 15mm; size: A4; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div style="max-width: 210mm; margin: 0 auto;">
          ${clHTML}
        </div>
        <script>
          setTimeout(() => { window.print(); }, 800);
        <\/script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  function handleDownloadWord() {
    if (!clRef.current) return
    const clHTML = clRef.current.innerHTML
    const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>Lettre - ${clFormData.fullName}</title>
      <style>
        @page { margin: 15mm; size: A4; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      </style>
    </head>
    <body>${clHTML}</body>
    </html>`
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${t(language, 'clDownloadClPrefix')}${clFormData.fullName.replace(/\s+/g, '_')}.doc`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!generatedCL) return null

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-teal-50/40 via-white to-amber-50/30">
      {/* Top bar */}
      <header className="w-full px-4 sm:px-6 lg:px-8 py-4 bg-white/90 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <Image src="/hirenova-logo.png" alt="HireNova" width={32} height={32} className="rounded-lg" />
              <span className="text-[9px] font-semibold text-emerald-600 tracking-wide">{t(language, 'poweredByIa')}</span>
            </div>
            <div>
              <span className="font-semibold text-foreground text-sm">{t(language, 'clTitle')}</span>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="font-medium">{t(language, 'clPreviewTitle')}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (generatedCV) {
                  setStep('preview')
                } else {
                  resetCL()
                }
              }}
              className="gap-1.5 cursor-pointer text-xs sm:text-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {generatedCV ? t(language, 'clBackToCv') : t(language, 'clStartOver')}
              </span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer text-xs sm:text-sm" size="sm">
                  <Download className="w-3.5 h-3.5" />
                  <span>{t(language, 'clDownloadPdf')}</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadPDF} className="gap-2 cursor-pointer">
                  <FileDown className="w-4 h-4" />
                  {t(language, 'clDownloadPdf')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadWord} className="gap-2 cursor-pointer">
                  <FileDown className="w-4 h-4" />
                  {t(language, 'clDownloadWord')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Cover Letter Preview */}
      <main className="flex-1 py-8 px-4 sm:px-6">
        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Letter Container */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div ref={clRef}>
              <CoverLetterDocument
                clFormData={clFormData}
                generatedCL={generatedCL}
                lang={language}
              />
            </div>
          </div>

          {/* Bottom actions */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={handleDownloadPDF}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-8 py-6 text-base rounded-xl shadow-lg shadow-emerald-600/25 cursor-pointer w-full sm:w-auto"
              size="lg"
            >
              <Download className="w-5 h-5" />
              {t(language, 'clDownloadPdf')}
            </Button>
            <Button
              onClick={handleDownloadWord}
              variant="outline"
              className="gap-2 px-6 py-6 rounded-xl cursor-pointer w-full sm:w-auto"
              size="lg"
            >
              <FileDown className="w-5 h-5" />
              {t(language, 'clDownloadWord')}
            </Button>
            <Button
              variant="outline"
              onClick={() => resetCL()}
              className="gap-2 px-6 py-6 rounded-xl cursor-pointer w-full sm:w-auto"
              size="lg"
            >
              <RotateCcw className="w-5 h-5" />
              {t(language, 'clStartOver')}
            </Button>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 px-4 sm:px-6 bg-gradient-to-r from-emerald-50/50 via-white to-amber-50/30">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <p>{t(language, 'footerText')} &copy; 2026 HireNova — <span className="font-medium text-foreground">E-Society 2050</span></p>
          <button onClick={() => { document.dispatchEvent(new CustomEvent('open-legal')) }} className="text-xs text-emerald-600 hover:underline cursor-pointer">{t(language, 'footerLegal')}</button>
        </div>
      </footer>

      <SatisfactionPrompt
        open={showSatisfaction}
        onClose={() => setShowSatisfaction(false)}
        type="cover_letter"
      />
    </div>
  )
}