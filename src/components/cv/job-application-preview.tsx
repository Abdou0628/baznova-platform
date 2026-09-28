'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import {
  ArrowLeft,
  Download,
  FileDown,
  CheckCircle2,
  Eye,
} from 'lucide-react'

interface GeneratedApplication {
  subject: string
  header: string
  body: string
  closing: string
  signOff: string
}

export default function JobApplicationPreview() {
  const { stepData, language, formData, setStep } = useCVStore()
  const docRef = useRef<HTMLDivElement>(null)
  const dir = language === 'ar' ? 'rtl' : 'ltr'

  const application = stepData?.application as GeneratedApplication | undefined
  const company = (stepData?.company as string) || ''
  const position = (stepData?.position as string) || ''

  if (!application) {
    return (
      <div className="min-h-screen flex flex-col bg-white" dir={dir}>
        <header className="w-full px-4 sm:px-6 lg:px-8 py-4 bg-white/90 backdrop-blur-sm border-b sticky top-0 z-50">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setStep('preview')} className="gap-1.5 cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
              {t(language, 'jaBack')}
            </Button>
            <Image src="/hirenova-logo.png" alt="HireNova" width={32} height={32} className="rounded-lg" />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">{t(language, 'jaNoApplicationData')}</p>
        </main>
      </div>
    )
  }

  function handleDownloadPDF() {
    if (!docRef.current) return
    const title = `${t(language, 'jaDocTitle')} - ${formData.fullName} - ${company}`
    const html = docRef.current.innerHTML

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="${language}" dir="${dir}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            -webkit-font-smoothing: antialiased;
            color: #1a1a1a;
            line-height: 1.7;
          }
          @media print {
            @page { margin: 20mm; size: A4; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div style="max-width: 210mm; margin: 0 auto; padding: 20mm;">${html}</div>
        <script>setTimeout(() => { window.print(); }, 800);<\/script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  function handleDownloadWord() {
    if (!docRef.current) return
    const filename = `${t(language, 'jaApplicationPrefix')}${formData.fullName.replace(/\s+/g, '_')}_${company.replace(/\s+/g, '_')}.doc`
    const html = docRef.current.innerHTML
    const docHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${filename}</title>
      <style>
        @page { margin: 20mm; size: A4; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; color: #1a1a1a; line-height: 1.7; }
      </style>
    </head>
    <body>${html}</body>
    </html>`
    const blob = new Blob(['\ufeff', docHtml], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Split body into paragraphs for rendering
  const bodyParagraphs = application.body
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40" dir={dir}>
      {/* Header */}
      <header className="w-full px-4 sm:px-6 lg:px-8 py-4 bg-white/90 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setStep('jobApplication')} className="gap-1.5 cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t(language, 'jaBack')}</span>
            </Button>
            <div className="flex items-center gap-2">
              <Image src="/hirenova-logo.png" alt="HireNova" width={32} height={32} className="rounded-lg" />
              <div>
                <span className="font-semibold text-foreground text-sm">{t(language, 'siteTitle')}</span>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="font-medium">{t(language, 'jaGenerated')}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep('preview')}
              className="gap-1.5 cursor-pointer text-xs sm:text-sm border-emerald-600/40 text-emerald-700 hover:bg-emerald-50"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t(language, 'jaBackPreview')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              className="gap-1.5 cursor-pointer text-xs sm:text-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadWord}
              className="gap-1.5 cursor-pointer text-xs sm:text-sm"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Word</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8 px-4 sm:px-6">
        <motion.div
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Subject badge */}
          <motion.div
            className="mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
              <span className="text-xs font-medium text-emerald-600">{t(language, 'jaDocTitle')}</span>
              <span className="text-xs text-muted-foreground">—</span>
              <span className="text-xs font-medium text-foreground truncate max-w-xs sm:max-w-md">{application.subject}</span>
            </div>
          </motion.div>

          {/* A4-style document container */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border">
            <div ref={docRef} className="p-6 sm:p-10 md:p-14 space-y-6 text-sm sm:text-base leading-relaxed text-foreground">
              {/* Header */}
              {application.header && (
                <div className="border-b border-muted pb-4 space-y-1 text-muted-foreground text-xs sm:text-sm">
                  {application.header.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              )}

              {/* Subject line */}
              <h2 className="text-lg sm:text-xl font-bold text-foreground">{application.subject}</h2>

              {/* Body paragraphs */}
              <div className="space-y-4">
                {bodyParagraphs.map((paragraph, i) => (
                  <p key={i} className="text-foreground/90">{paragraph}</p>
                ))}
              </div>

              {/* Closing */}
              {application.closing && (
                <div className="pt-2">
                  <p className="text-foreground/90">{application.closing}</p>
                </div>
              )}

              {/* Sign-off */}
              {application.signOff && (
                <div className="pt-4 border-t border-muted">
                  {application.signOff.split('\n').map((line, i) => (
                    <p key={i} className={i === 0 ? 'font-semibold' : ''}>{line}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Download buttons */}
          <motion.div
            className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Button
              onClick={handleDownloadPDF}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-8 py-6 text-base rounded-xl shadow-lg shadow-emerald-600/25 cursor-pointer w-full sm:w-auto"
              size="lg"
            >
              <Download className="w-5 h-5" />
              PDF — {t(language, 'jaDownload')}
            </Button>
            <Button
              onClick={handleDownloadWord}
              variant="outline"
              className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 gap-2 px-6 py-6 rounded-xl cursor-pointer w-full sm:w-auto"
              size="lg"
            >
              <FileDown className="w-5 h-5" />
              Word — {t(language, 'jaDownload')}
            </Button>
          </motion.div>

          {/* CTA back to CV preview */}
          <motion.div
            className="mt-6"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <button
              onClick={() => setStep('preview')}
              className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-dashed border-emerald-300 rounded-xl hover:border-emerald-400 hover:from-emerald-100 hover:to-teal-100 transition-all cursor-pointer group"
            >
              <Eye className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-emerald-800 text-sm group-hover:text-emerald-700 transition-colors">
                {t(language, 'jaBackPreview')}
              </span>
            </button>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 px-4 sm:px-6 bg-gradient-to-r from-emerald-50/50 via-white to-amber-50/30 mt-auto">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
          <p className="text-center">{t(language, 'previewEqualOpportunity')}</p>
          <p>{t(language, 'footerText')} &copy; 2026 HireNova — <span className="font-medium text-foreground">E-Society 2050</span></p>
        </div>
      </footer>
    </div>
  )
}
