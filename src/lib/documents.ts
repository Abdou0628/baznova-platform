/**
 * HireNova Document Engine — 100% paperless, auto-generated PDFs
 *
 * Generates professional PDF documents on demand:
 * - Invoice (facture) — triggered automatically on payment
 * - Quote (devis) — generated from Enterprise inquiries
 * - Agreement (accord/contrat) — generated when quote is accepted
 * - Receipt (reçu) — generated for each payment
 * - Credit note (avoir) — generated on refund
 *
 * Uses pdf-lib for server-side PDF generation.
 * No external services, no templates, no manual work — pure code.
 */

import {
  PDFDocument,
  PDFImage,
  StandardFonts,
  rgb,
  degrees,
  PDFFont,
  PDFPage,
  TextAlignment,
} from 'pdf-lib'
import { db } from '@/lib/db'
import { embedHireNovaLogo } from '@/lib/document-logo'
import {
  applySignature,
  drawSignatureBlock,
  type AppliedSignature,
  type SignatureFingerprint,
} from '@/lib/document-signature'

// ============= Types =============

export type DocumentType = 'invoice' | 'quote' | 'agreement' | 'receipt' | 'credit_note' | 'accounting_statement' | 'referral_agreement' | 'partnership_agreement' | 'service_agreement'

export interface DocumentItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface DocumentData {
  type: DocumentType
  number: string
  // Recipient
  recipientName: string
  recipientEmail: string
  recipientCompany?: string
  recipientAddress?: string
  recipientCountry?: string
  // Issuer (defaults to HireNova)
  issuerName?: string
  issuerLegal?: string
  issuerAddress?: string
  issuerEmail?: string
  issuerVAT?: string
  // Content
  subject: string
  items: DocumentItem[]
  currency: string
  taxRate?: number
  // Dates
  issueDate?: Date
  dueDate?: Date
  paidAt?: Date
  // Meta
  notes?: string
  // For agreements
  agreementTerms?: string
  inquiryId?: string
  userId?: string
  // ===== Electronic signature (applied during generation) =====
  signature?: AppliedSignature
  // ===== Accounting statement (bilan) specific =====
  periodStart?: Date
  periodEnd?: Date
  linkedInvoices?: Array<{
    number: string
    date: Date
    client: string
    subtotal: number
    taxAmount: number
    total: number
    status: string
  }>
  platformFees?: number
  royaltyFees?: number
  netProfit?: number
  totalCollected?: number
  invoiceCount?: number
}

export interface GeneratedDocument {
  id: string
  number: string
  type: DocumentType
  pdfBase64: string
  total: number
}

// ============= Numbering =============

const TYPE_PREFIXES: Record<DocumentType, string> = {
  invoice: 'FAC',
  quote: 'DEV',
  agreement: 'CTR',
  receipt: 'REC',
  credit_note: 'AVO',
  accounting_statement: 'BIL',
  referral_agreement: 'PAR',
  partnership_agreement: 'PAR',
  service_agreement: 'SER',
}

/**
 * Generate the next sequential document number: FAC-2026-001
 */
export async function nextDocumentNumber(type: DocumentType, date = new Date()): Promise<string> {
  const year = date.getFullYear()
  const prefix = TYPE_PREFIXES[type]

  // Find the highest number for this type+year
  const existing = await db.document.findMany({
    where: {
      type,
      number: { startsWith: `${prefix}-${year}-` },
    },
    orderBy: { number: 'desc' },
    take: 1,
  })

  let next = 1
  if (existing.length > 0) {
    const match = existing[0].number.match(/-(\d+)$/)
    if (match) next = parseInt(match[1], 10) + 1
  }

  return `${prefix}-${year}-${String(next).padStart(4, '0')}`
}

// ============= Currency formatting =============

/**
 * Sanitize text for WinAnsi encoding (pdf-lib default Helvetica).
 * Replaces Unicode characters that WinAnsi cannot encode with ASCII equivalents.
 */
function sanitizeText(text: string | undefined | null): string {
  if (!text) return ''
  return String(text)
    // Narrow no-break space (U+202F) — used by fr-FR toLocaleString as thousands separator
    .replace(/\u202F/g, ' ')
    // No-break space (U+00A0)
    .replace(/\u00A0/g, ' ')
    // Thin space, hair space, etc.
    .replace(/[\u2009\u200A\u200B\u200C\u200D\u2060]/g, '')
    // Curly quotes → straight quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Em/en dash → hyphen
    .replace(/[\u2013\u2014]/g, '-')
    // Ellipsis → ...
    .replace(/\u2026/g, '...')
    // Bullet → *
    .replace(/[\u2022\u25CF]/g, '*')
    // Copyright, trademark
    .replace(/\u00A9/g, '(c)')
    .replace(/\u00AE/g, '(R)')
    .replace(/\u2122/g, '(TM)')
    // Euro sign is OK in WinAnsi (0x80), keep it
    // Strip any remaining non-WinAnsi characters
    .replace(/[^\x20-\x7E\x80-\xFF]/g, '?')
}

/** Safe drawText wrapper that sanitizes text for WinAnsi encoding. */
function drawTextSafe(
  page: PDFPage,
  text: string,
  options: {
    x: number
    y: number
    size: number
    font: PDFFont
    color?: ReturnType<typeof rgb>
    opacity?: number
    rotate?: ReturnType<typeof degrees>
    align?: typeof TextAlignment
  }
): void {
  const sanitized = sanitizeText(text)
  // pdf-lib doesn't support align in drawText, we handle alignment manually for totals
  if (options.align === TextAlignment.Right) {
    const textWidth = options.font.widthOfTextAtSize(sanitized, options.size)
    page.drawText(sanitized, {
      ...options,
      x: options.x - textWidth,
    })
  } else {
    page.drawText(sanitized, options)
  }
}

function formatMoney(amount: number, currency: string): string {
  const symbols: Record<string, string> = { EUR: 'EUR', USD: 'USD', GBP: 'GBP', MAD: 'MAD', AED: 'AED', SAR: 'SAR' }
  const symbol = symbols[currency] || currency
  // Use 'en-US' formatting then replace comma with dot for FR style, avoids Unicode narrow no-break space (U+202F)
  const formatted = Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const result = currency === 'EUR' ? `${formatted} ${symbol}` : currency === 'USD' || currency === 'GBP' ? `${symbol} ${formatted}` : `${formatted} ${symbol}`
  return result
}

function formatDate(date: Date | undefined | null): string {
  if (!date) return '-'
  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

// ============= Color palette =============

const COLORS = {
  primary: rgb(0.055, 0.725, 0.506),    // emerald-600 #10b981
  primaryDark: rgb(0.024, 0.588, 0.412), // emerald-700 #059669
  primaryLight: rgb(0.941, 0.992, 0.957), // emerald-50
  dark: rgb(0.059, 0.094, 0.165),        // slate-900 #0f172a
  gray: rgb(0.4, 0.447, 0.529),          // slate-500
  lightGray: rgb(0.635, 0.671, 0.737),   // slate-400
  border: rgb(0.902, 0.914, 0.933),      // slate-200
  veryLight: rgb(0.972, 0.976, 0.984),   // slate-50
  white: rgb(1, 1, 1),
  amber: rgb(0.949, 0.722, 0.149),       // amber-500
  purple: rgb(0.588, 0.345, 0.937),      // purple-600
  sky: rgb(0.027, 0.588, 0.902),         // sky-600
  rose: rgb(0.843, 0.211, 0.392),        // rose-600
}

// ============= PDF helpers =============

function drawHeader(page: PDFPage, fontBold: PDFFont, fontRegular: PDFFont, data: DocumentData, typeLabel: string, typeColor: ReturnType<typeof rgb>, logo?: PDFImage) {
  const { width } = page.getSize()

  // Top color band
  page.drawRectangle({
    x: 0,
    y: page.getHeight() - 110,
    width,
    height: 110,
    color: typeColor,
  })

  // Logo image (white variant — visible on colored band)
  const logoSize = 38
  const logoY = page.getHeight() - 110 + (110 - logoSize) / 2 // vertically centered in band
  if (logo) {
    page.drawImage(logo, {
      x: 50,
      y: logoY,
      width: logoSize,
      height: logoSize,
    })
  }

  // Logo brand name (shifted right to sit beside the logo image)
  const brandX = logo ? 100 : 50
  page.drawText('HireNova', {
    x: brandX,
    y: page.getHeight() - 48,
    size: 24,
    font: fontBold,
    color: COLORS.white,
  })

  page.drawText('by E-Society 2050', {
    x: brandX,
    y: page.getHeight() - 66,
    size: 10,
    font: fontRegular,
    color: COLORS.white,
  })

  // Document type label (big)
  page.drawText(typeLabel.toUpperCase(), {
    x: width - 180,
    y: page.getHeight() - 50,
    size: 22,
    font: fontBold,
    color: COLORS.white,
  })

  // Document number
  page.drawText(data.number, {
    x: width - 180,
    y: page.getHeight() - 72,
    size: 11,
    font: fontRegular,
    color: COLORS.white,
  })

  // Issuer info (left side, below band)
  let yPos = page.getHeight() - 140
  const issuerName = data.issuerName || 'HireNova'
  const issuerLegal = data.issuerLegal || 'E-Society 2050'
  const issuerAddress = data.issuerAddress || 'Casablanca, Maroc'
  const issuerEmail = data.issuerEmail || 'hello@hirenova.com'

  page.drawText(issuerName, { x: 50, y: yPos, size: 11, font: fontBold, color: COLORS.dark })
  yPos -= 14
  page.drawText(issuerLegal, { x: 50, y: yPos, size: 9, font: fontRegular, color: COLORS.gray })
  yPos -= 12
  page.drawText(issuerAddress, { x: 50, y: yPos, size: 9, font: fontRegular, color: COLORS.gray })
  yPos -= 12
  page.drawText(issuerEmail, { x: 50, y: yPos, size: 9, font: fontRegular, color: COLORS.gray })

  // Recipient info (right side)
  yPos = page.getHeight() - 140
  page.drawText('ADRESSÉ À', { x: width - 250, y: yPos, size: 8, font: fontBold, color: COLORS.lightGray })
  yPos -= 16
  page.drawText(data.recipientName, { x: width - 250, y: yPos, size: 11, font: fontBold, color: COLORS.dark })
  yPos -= 14
  if (data.recipientCompany) {
    page.drawText(data.recipientCompany, { x: width - 250, y: yPos, size: 10, font: fontRegular, color: COLORS.gray })
    yPos -= 12
  }
  if (data.recipientAddress) {
    const addrLines = data.recipientAddress.split('\n').slice(0, 2)
    for (const line of addrLines) {
      page.drawText(line, { x: width - 250, y: yPos, size: 9, font: fontRegular, color: COLORS.gray })
      yPos -= 11
    }
  }
  if (data.recipientCountry) {
    page.drawText(data.recipientCountry, { x: width - 250, y: yPos, size: 9, font: fontRegular, color: COLORS.gray })
    yPos -= 11
  }
  page.drawText(data.recipientEmail, { x: width - 250, y: yPos, size: 9, font: fontRegular, color: COLORS.gray })

  return yPos
}

function drawMetaBox(page: PDFPage, fontBold: PDFFont, fontRegular: PDFFont, data: DocumentData, startY: number) {
  const { width } = page.getSize()
  const boxY = startY - 10
  const boxHeight = 60

  // Light gray box for meta info
  page.drawRectangle({
    x: 50,
    y: boxY - boxHeight,
    width: width - 100,
    height: boxHeight,
    color: COLORS.veryLight,
    borderColor: COLORS.border,
    borderWidth: 1,
  })

  // Subject
  page.drawText('Objet :', { x: 64, y: boxY - 16, size: 9, font: fontBold, color: COLORS.gray })
  page.drawText(data.subject, { x: 110, y: boxY - 16, size: 10, font: fontBold, color: COLORS.dark })

  // Issue date
  page.drawText('Date émission :', { x: 64, y: boxY - 32, size: 9, font: fontBold, color: COLORS.gray })
  page.drawText(formatDate(data.issueDate || new Date()), { x: 160, y: boxY - 32, size: 9, font: fontRegular, color: COLORS.dark })

  // Due date / validity
  const dueLabel = data.type === 'quote' ? 'Valable jusqu\'au :' : data.type === 'invoice' ? 'Échéance :' : 'Date :'
  const dueValue = data.type === 'quote'
    ? formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
    : formatDate(data.dueDate)
  page.drawText(dueLabel, { x: 320, y: boxY - 32, size: 9, font: fontBold, color: COLORS.gray })
  page.drawText(dueValue, { x: 410, y: boxY - 32, size: 9, font: fontRegular, color: COLORS.dark })

  // Status
  const statusLabel = data.type === 'receipt' ? 'Payé le :' : 'Statut :'
  const statusValue = data.type === 'receipt'
    ? formatDate(data.paidAt || new Date())
    : data.type === 'invoice' && data.paidAt
      ? `Payé le ${formatDate(data.paidAt)}`
      : 'En attente'
  page.drawText(statusLabel, { x: 64, y: boxY - 48, size: 9, font: fontBold, color: COLORS.gray })
  page.drawText(statusValue, { x: 160, y: boxY - 48, size: 9, font: fontBold, color: data.paidAt ? COLORS.primary : COLORS.amber })

  return boxY - boxHeight - 20
}

function drawItemsTable(page: PDFPage, fontBold: PDFFont, fontRegular: PDFFont, data: DocumentData, startY: number): number {
  const { width } = page.getSize()
  const tableX = 50
  const tableWidth = width - 100
  let yPos = startY

  // Table header
  page.drawRectangle({
    x: tableX,
    y: yPos - 22,
    width: tableWidth,
    height: 22,
    color: COLORS.primary,
  })

  page.drawText('Description', { x: tableX + 12, y: yPos - 15, size: 9, font: fontBold, color: COLORS.white })
  page.drawText('Qté', { x: tableX + tableWidth - 230, y: yPos - 15, size: 9, font: fontBold, color: COLORS.white })
  page.drawText('Prix unitaire', { x: tableX + tableWidth - 170, y: yPos - 15, size: 9, font: fontBold, color: COLORS.white })
  page.drawText('Total', { x: tableX + tableWidth - 70, y: yPos - 15, size: 9, font: fontBold, color: COLORS.white })

  yPos -= 22

  // Items rows
  let altRow = false
  let subtotal = 0
  for (const item of data.items) {
    const rowHeight = 28
    if (altRow) {
      page.drawRectangle({
        x: tableX,
        y: yPos - rowHeight,
        width: tableWidth,
        height: rowHeight,
        color: COLORS.veryLight,
      })
    }
    altRow = !altRow

    // Description (truncated if too long)
    const desc = item.description.length > 65 ? item.description.slice(0, 62) + '...' : item.description
    page.drawText(desc, { x: tableX + 12, y: yPos - 18, size: 9, font: fontRegular, color: COLORS.dark })

    page.drawText(String(item.quantity), { x: tableX + tableWidth - 230, y: yPos - 18, size: 9, font: fontRegular, color: COLORS.dark })
    page.drawText(formatMoney(item.unitPrice, data.currency), { x: tableX + tableWidth - 170, y: yPos - 18, size: 9, font: fontRegular, color: COLORS.dark })
    page.drawText(formatMoney(item.total, data.currency), { x: tableX + tableWidth - 70, y: yPos - 18, size: 9, font: fontBold, color: COLORS.dark })

    subtotal += item.total
    yPos -= rowHeight
  }

  // Border around table
  page.drawRectangle({
    x: tableX,
    y: yPos,
    width: tableWidth,
    height: startY - yPos,
    borderColor: COLORS.border,
    borderWidth: 1,
  })

  // Totals
  const taxRate = data.taxRate || 0
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount

  yPos -= 20
  const totalsX = tableX + tableWidth - 240

  // Subtotal
  page.drawText('Sous-total :', { x: totalsX, y: yPos, size: 10, font: fontRegular, color: COLORS.gray })
  page.drawText(formatMoney(subtotal, data.currency), { x: tableX + tableWidth - 12 - 90, y: yPos, size: 10, font: fontRegular, color: COLORS.dark, align: TextAlignment.Right })

  yPos -= 18
  if (taxRate > 0) {
    page.drawText(`TVA (${taxRate}%) :`, { x: totalsX, y: yPos, size: 10, font: fontRegular, color: COLORS.gray })
    page.drawText(formatMoney(taxAmount, data.currency), { x: tableX + tableWidth - 12 - 90, y: yPos, size: 10, font: fontRegular, color: COLORS.dark, align: TextAlignment.Right })
    yPos -= 18
  }

  // Total (highlighted)
  page.drawRectangle({
    x: totalsX - 12,
    y: yPos - 6,
    width: tableX + tableWidth - totalsX,
    height: 26,
    color: COLORS.primaryLight,
  })
  page.drawText('TOTAL :', { x: totalsX, y: yPos, size: 12, font: fontBold, color: COLORS.primaryDark })
  page.drawText(formatMoney(total, data.currency), { x: tableX + tableWidth - 12 - 90, y: yPos, size: 12, font: fontBold, color: COLORS.primaryDark, align: TextAlignment.Right })

  return yPos - 40
}

function drawFooter(page: PDFPage, fontBold: PDFFont, fontRegular: PDFFont, data: DocumentData) {
  const { width, height } = page.getSize()

  // Footer separator
  page.drawLine({
    start: { x: 50, y: 80 },
    end: { x: width - 50, y: 80 },
    thickness: 1,
    color: COLORS.border,
  })

  // Notes (if any)
  if (data.notes) {
    page.drawText('Notes :', { x: 50, y: 65, size: 8, font: fontBold, color: COLORS.gray })
    const noteText = data.notes.slice(0, 200)
    page.drawText(noteText, { x: 90, y: 65, size: 8, font: fontRegular, color: COLORS.gray })
  }

  // Legal info
  page.drawText('HireNova - E-Society 2050 | Casablanca, Maroc | hello@hirenova.com | https://hirenova.com', {
    x: 50,
    y: 45,
    size: 8,
    font: fontRegular,
    color: COLORS.lightGray,
  })

  page.drawText(`Document genere automatiquement par HireNova le ${formatDate(new Date())} - No ${data.number}`, {
    x: 50,
    y: 32,
    size: 7,
    font: fontRegular,
    color: COLORS.lightGray,
  })

  // Watermark diagonal (for non-final docs)
  if (data.type === 'quote') {
    page.drawText('DEVIS', {
      x: width / 2 - 80,
      y: height / 2,
      size: 80,
      font: fontBold,
      color: rgb(0.941, 0.969, 0.929),
      opacity: 0.4,
      rotate: degrees(45),
    })
  }
}

// ============= Main PDF generator =============

const TYPE_META: Record<DocumentType, { label: string; color: ReturnType<typeof rgb>; title: string }> = {
  invoice:                { label: 'Facture',             color: COLORS.primary,  title: 'FACTURE' },
  quote:                  { label: 'Devis',               color: COLORS.sky,      title: 'DEVIS' },
  agreement:              { label: 'Contrat',             color: COLORS.purple,   title: 'CONTRAT' },
  receipt:                { label: 'Reçu',                color: COLORS.amber,    title: 'REÇU' },
  credit_note:            { label: 'Avoir',               color: COLORS.rose,     title: 'AVOIR' },
  accounting_statement:   { label: 'Bilan Comptable',     color: COLORS.dark,     title: 'BILAN COMPTABLE' },
  referral_agreement:     { label: 'Contrat Parrainage',  color: COLORS.primary,  title: 'CONTRAT DE PARRAINAGE' },
  partnership_agreement:  { label: 'Contrat Partenariat', color: COLORS.purple,   title: 'CONTRAT DE PARTENARIAT' },
  service_agreement:      { label: 'Contrat Service',     color: COLORS.sky,      title: 'CONTRAT DE SERVICE' },
}

async function buildPdf(rawData: DocumentData): Promise<Uint8Array> {
  // Sanitize user-provided data for PDF metadata (setTitle, setSubject, etc.)
  const data: DocumentData = {
    ...rawData,
    recipientName: sanitizeText(rawData.recipientName),
    recipientEmail: sanitizeText(rawData.recipientEmail),
    recipientCompany: sanitizeText(rawData.recipientCompany),
    recipientAddress: sanitizeText(rawData.recipientAddress),
    recipientCountry: sanitizeText(rawData.recipientCountry),
    subject: sanitizeText(rawData.subject),
    notes: sanitizeText(rawData.notes),
    agreementTerms: sanitizeText(rawData.agreementTerms),
    items: rawData.items.map((item) => ({
      ...item,
      description: sanitizeText(item.description),
    })),
  }

  const pdfDoc = await PDFDocument.create()
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  // Embed HireNova logo (white variant — visible on colored header bands)
  let logo: PDFImage | undefined
  try {
    logo = await embedHireNovaLogo(pdfDoc, 'white')
  } catch (err) {
    // Logo is optional — document can still be generated without it
    console.warn('[documents] Logo not embedded:', err instanceof Error ? err.message : err)
  }

  pdfDoc.setTitle(sanitizeText(`${TYPE_META[data.type].label} ${data.number} - HireNova`))
  pdfDoc.setAuthor(sanitizeText('HireNova - E-Society 2050'))
  pdfDoc.setSubject(data.subject)
  pdfDoc.setCreator('HireNova Document Engine')
  pdfDoc.setProducer('HireNova Auto-Generator')
  pdfDoc.setCreationDate(new Date())

  const page = pdfDoc.addPage([595.28, 841.89]) // A4

  // CRITICAL: Override drawText to auto-sanitize ALL text for WinAnsi encoding.
  // This prevents "WinAnsi cannot encode" errors with Unicode chars (em dash, narrow no-break space, accented chars, etc.)
  // Also handles right-alignment manually since pdf-lib's drawText doesn't support align natively.
  const originalDrawText = page.drawText.bind(page)
  ;(page as any).drawText = (text: string, options: any) => {
    const sanitized = sanitizeText(text)
    if (options.align === TextAlignment.Right) {
      const textWidth = options.font.widthOfTextAtSize(sanitized, options.size)
      const { align, ...rest } = options
      return originalDrawText(sanitized, { ...rest, x: options.x - textWidth })
    }
    const { align, ...rest } = options
    return originalDrawText(sanitized, rest)
  }

  const meta = TYPE_META[data.type]
  let yPos = drawHeader(page, fontBold, fontRegular, data, meta.label, meta.color, logo)
  yPos = drawMetaBox(page, fontBold, fontRegular, data, yPos)

  // Content depends on document type
  if (data.type === 'accounting_statement') {
    // Bilan: custom layout (summary + invoice table + tax section)
    yPos = drawBilanContent(page, fontBold, fontRegular, fontItalic, data, yPos)
  } else if ((data.type === 'agreement' || data.type === 'referral_agreement' || data.type === 'partnership_agreement' || data.type === 'service_agreement') && data.agreementTerms) {
    // All agreement-like types: contract clauses instead of items table
    yPos = drawAgreementClauses(page, fontBold, fontRegular, fontItalic, data, yPos)
  } else {
    // Standard: items table
    yPos = drawItemsTable(page, fontBold, fontRegular, data, yPos)
  }

  // Payment terms / acceptance block (not for bilan/receipt/credit_note)
  if (data.type === 'quote') {
    yPos = drawAcceptanceBlock(page, fontBold, fontRegular, yPos)
  } else if (data.type === 'invoice') {
    yPos = drawPaymentTerms(page, fontBold, fontRegular, data, yPos)
  }

  // ===== Electronic signature block (ALL document types) =====
  // Placed before the footer, takes ~92pt at the bottom of the page.
  if (data.signature) {
    yPos = Math.min(yPos, 130) // ensure room for footer below signature
    drawSignatureBlock(page, fontBold, fontRegular, fontItalic, data.signature, yPos)
  }

  drawFooter(page, fontBold, fontRegular, data)

  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}

function drawAgreementClauses(
  page: PDFPage,
  fontBold: PDFFont,
  fontRegular: PDFFont,
  fontItalic: PDFFont,
  data: DocumentData,
  startY: number
): number {
  let yPos = startY

  page.drawText('CLAUSES DU CONTRAT', { x: 50, y: yPos, size: 11, font: fontBold, color: COLORS.primaryDark })
  yPos -= 20

  const terms = data.agreementTerms || ''
  const clauses = terms.split('\n\n').filter(Boolean)

  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i]
    const title = `Article ${i + 1}`
    page.drawText(title, { x: 50, y: yPos, size: 10, font: fontBold, color: COLORS.dark })
    yPos -= 14

    // Wrap text
    const maxWidth = 495
    const words = clause.split(' ')
    let line = ''
    const lines: string[] = []
    for (const word of words) {
      const testLine = line ? line + ' ' + word : word
      try {
        const testWidth = fontRegular.widthOfTextAtSize(testLine, 9)
        if (testWidth > maxWidth) {
          if (line) lines.push(line)
          line = word
        } else {
          line = testLine
        }
      } catch {
        line = line ? line + ' ' + word : word
      }
    }
    if (line) lines.push(line)

    for (const ln of lines.slice(0, 6)) {
      page.drawText(ln.slice(0, 100), { x: 60, y: yPos, size: 9, font: fontRegular, color: COLORS.gray })
      yPos -= 12
    }
    yPos -= 8
    if (yPos < 180) break
  }

  // Signatures
  yPos = Math.max(yPos, 200)
  page.drawText('Signatures', { x: 50, y: yPos, size: 11, font: fontBold, color: COLORS.dark })
  yPos -= 20

  page.drawLine({ start: { x: 50, y: yPos }, end: { x: 230, y: yPos }, thickness: 1, color: COLORS.gray })
  page.drawLine({ start: { x: 320, y: yPos }, end: { x: 500, y: yPos }, thickness: 1, color: COLORS.gray })

  page.drawText('Pour HireNova', { x: 50, y: yPos - 14, size: 9, font: fontBold, color: COLORS.dark })
  page.drawText(data.recipientName, { x: 320, y: yPos - 14, size: 9, font: fontBold, color: COLORS.dark })

  page.drawText('Date : _______________', { x: 50, y: yPos - 30, size: 9, font: fontRegular, color: COLORS.gray })
  page.drawText('Date : _______________', { x: 320, y: yPos - 30, size: 9, font: fontRegular, color: COLORS.gray })

  return yPos - 50
}

function drawAcceptanceBlock(page: PDFPage, fontBold: PDFFont, fontRegular: PDFFont, startY: number): number {
  let yPos = startY
  const { width } = page.getSize()

  page.drawRectangle({
    x: 50,
    y: yPos - 80,
    width: width - 100,
    height: 80,
    color: COLORS.veryLight,
    borderColor: COLORS.border,
    borderWidth: 1,
  })

  page.drawText('BON POUR ACCORD', { x: 64, y: yPos - 16, size: 10, font: fontBold, color: COLORS.primaryDark })
  page.drawText('Ce devis est valable 30 jours. Pour accepter, signez et renvoyez-le à hello@hirenova.com', {
    x: 64, y: yPos - 32, size: 9, font: fontRegular, color: COLORS.gray,
  })

  page.drawLine({ start: { x: 64, y: yPos - 56 }, end: { x: 250, y: yPos - 56 }, thickness: 1, color: COLORS.gray })
  page.drawLine({ start: { x: 320, y: yPos - 56 }, end: { x: width - 64, y: yPos - 56 }, thickness: 1, color: COLORS.gray })
  page.drawText('Signature du client', { x: 64, y: yPos - 68, size: 8, font: fontRegular, color: COLORS.gray })
  page.drawText('Date', { x: 320, y: yPos - 68, size: 8, font: fontRegular, color: COLORS.gray })

  return yPos - 100
}

function drawPaymentTerms(page: PDFPage, fontBold: PDFFont, fontRegular: PDFFont, data: DocumentData, startY: number): number {
  let yPos = startY
  page.drawText('Modalités de paiement', { x: 50, y: yPos, size: 10, font: fontBold, color: COLORS.dark })
  yPos -= 14
  page.drawText('Paiement à réception. CB, virement ou prélèvement SEPA via la plateforme HireNova.', {
    x: 50, y: yPos, size: 9, font: fontRegular, color: COLORS.gray,
  })
  yPos -= 12
  page.drawText('Passé l\'échéance, des pénalités de retard s\'appliquent (taux légal en vigueur).', {
    x: 50, y: yPos, size: 9, font: fontRegular, color: COLORS.gray,
  })
  return yPos - 20
}

// ============= Public API =============

/**
 * Generate a document PDF and persist it in the database.
 * Returns the generated document with PDF base64.
 */
export async function generateDocument(data: DocumentData): Promise<GeneratedDocument> {
  // Calculate totals
  const subtotal = data.items.reduce((sum, item) => sum + item.total, 0)
  const taxRate = data.taxRate || 0
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount

  // ===== Apply electronic signature (if not already provided) =====
  // The signature hash is computed from the document fingerprint (number + parties + total + items).
  // This makes every document tamper-evident: any change to the data invalidates the hash.
  if (!data.signature) {
    const fingerprint: SignatureFingerprint = {
      number: data.number,
      type: data.type,
      issuer: data.issuerLegal || 'E-Society 2050',
      recipient: data.recipientName,
      recipientEmail: data.recipientEmail,
      subject: data.subject,
      items: JSON.stringify(data.items),
      total,
      currency: data.currency,
      issueDate: (data.issueDate || new Date()).toISOString(),
    }
    data.signature = await applySignature(fingerprint)
  }

  // Build the PDF (now includes logo + signature block)
  const pdfBytes = await buildPdf(data)
  const pdfBase64 = Buffer.from(pdfBytes).toString('base64')

  // Persist to DB (includes signature + bilan fields)
  const doc = await db.document.create({
    data: {
      type: data.type,
      number: data.number,
      recipientName: data.recipientName,
      recipientEmail: data.recipientEmail,
      recipientCompany: data.recipientCompany || null,
      recipientAddress: data.recipientAddress || null,
      recipientCountry: data.recipientCountry || null,
      issuerName: data.issuerName || 'HireNova',
      issuerLegal: data.issuerLegal || 'E-Society 2050',
      issuerAddress: data.issuerAddress || 'Casablanca, Maroc',
      issuerEmail: data.issuerEmail || 'hello@hirenova.com',
      issuerVAT: data.issuerVAT,
      subject: data.subject,
      items: JSON.stringify(data.items),
      currency: data.currency,
      subtotal,
      taxRate,
      taxAmount,
      total,
      status: data.type === 'accounting_statement' ? 'finalized' : (data.paidAt ? 'paid' : 'draft'),
      issueDate: data.issueDate || new Date(),
      dueDate: data.dueDate || null,
      paidAt: data.paidAt || null,
      userId: data.userId || null,
      inquiryId: data.inquiryId || null,
      // Signature fields
      signatureHash: data.signature.hash,
      signatureDate: data.signature.signedAt,
      signedBy: data.signature.signedBy,
      signatureSerial: data.signature.serial,
      // Bilan-specific fields (only populated for accounting_statement type)
      periodStart: data.periodStart || null,
      periodEnd: data.periodEnd || null,
      linkedDocIds: data.linkedInvoices ? JSON.stringify(data.linkedInvoices.map((inv) => inv.number)) : null,
      invoiceCount: data.invoiceCount || 0,
      platformFees: data.platformFees || 0,
      royaltyFees: data.royaltyFees || 0,
      netProfit: data.netProfit || 0,
      totalCollected: data.totalCollected || total,
      pdfBase64,
      notes: data.notes || null,
    },
  })

  return {
    id: doc.id,
    number: doc.number,
    type: doc.type as DocumentType,
    pdfBase64,
    total,
  }
}

/**
 * Generate an invoice automatically when a payment succeeds.
 */
export async function generateInvoiceForPayment(params: {
  userEmail: string
  userName: string
  plan: string
  amount: number
  currency: string
  userId?: string
  paidAt?: Date
}): Promise<GeneratedDocument> {
  const number = await nextDocumentNumber('invoice')
  const planLabels: Record<string, string> = {
    starter: 'HireNova Starter',
    pro: 'HireNova Pro',
    career_plus: 'HireNova Career+',
    employer: 'HireNova Employeur',
    annual: 'HireNova Annuel',
    enterprise: 'HireNova Enterprise',
    api: 'HireNova API',
  }

  return generateDocument({
    type: 'invoice',
    number,
    recipientName: params.userName,
    recipientEmail: params.userEmail,
    subject: `Abonnement ${planLabels[params.plan] || params.plan} — 1 mois`,
    items: [{
      description: `Abonnement ${planLabels[params.plan] || params.plan} — paiement mensuel`,
      quantity: 1,
      unitPrice: params.amount,
      total: params.amount,
    }],
    currency: params.currency,
    taxRate: 0,
    paidAt: params.paidAt || new Date(),
    userId: params.userId,
    notes: 'Paiement reçu via la plateforme HireNova. Merci de votre confiance.',
  })
}

/**
 * Generate a quote (devis) from an Enterprise inquiry.
 */
export async function generateQuoteForInquiry(params: {
  inquiryId: string
  contactName: string
  workEmail: string
  companyName: string
  country?: string
  usersCount?: string
  useCase?: string
  items: DocumentItem[]
  currency?: string
  notes?: string
}): Promise<GeneratedDocument> {
  const number = await nextDocumentNumber('quote')

  return generateDocument({
    type: 'quote',
    number,
    recipientName: params.contactName,
    recipientEmail: params.workEmail,
    recipientCompany: params.companyName,
    recipientCountry: params.country,
    subject: `Proposition commerciale Enterprise — ${params.companyName}`,
    items: params.items,
    currency: params.currency || 'EUR',
    taxRate: 0,
    inquiryId: params.inquiryId,
    notes: params.notes || `Devis valable 30 jours. Basé sur : ${params.usersCount || 'N/A'} utilisateurs, cas d'usage : ${params.useCase || 'N/A'}.`,
  })
}

/**
 * Generate a receipt for a payment.
 */
export async function generateReceiptForPayment(params: {
  userEmail: string
  userName: string
  amount: number
  currency: string
  description: string
  userId?: string
  paidAt?: Date
}): Promise<GeneratedDocument> {
  const number = await nextDocumentNumber('receipt')

  return generateDocument({
    type: 'receipt',
    number,
    recipientName: params.userName,
    recipientEmail: params.userEmail,
    subject: `Reçu de paiement — ${params.description}`,
    items: [{
      description: params.description,
      quantity: 1,
      unitPrice: params.amount,
      total: params.amount,
    }],
    currency: params.currency,
    taxRate: 0,
    paidAt: params.paidAt || new Date(),
    userId: params.userId,
    notes: 'Ce reçu atteste du paiement effectué sur la plateforme HireNova.',
  })
}

/**
 * Generate an agreement (contrat) when a quote is accepted.
 */
export async function generateAgreementForInquiry(params: {
  inquiryId: string
  contactName: string
  workEmail: string
  companyName: string
  country?: string
  totalAmount: number
  currency?: string
  terms?: string
}): Promise<GeneratedDocument> {
  const number = await nextDocumentNumber('agreement')
  const currency = params.currency || 'EUR'

  const defaultTerms = `OBJET DU CONTRAT
Le présent contrat a pour objet la fourniture par HireNova (E-Society 2050) à ${params.companyName} des services de la plateforme Enterprise, incluant notamment l'accès à la génération de CV IA, l'analyse ATS, le portail de recrutement, l'intégration API, et le support dédié.

DURÉE
Le contrat est conclu pour une durée de 12 mois renouvelable par tacite reconduction. Chaque partie peut le résilier avec un préavis de 30 jours avant l'échéance.

TARIF
Le montant annuel est de ${params.totalAmount} ${currency}, payable d'avance. Facturation mensuelle possible sur demande.

ENGAGEMENTS DE HIRENOVA
HireNova s'engage à fournir un service disponible à 99,9% (SLA), un support dédié 24/7, la formation des équipes, et la sécurité des données conformément au RGPD.

ENGAGEMENTS DU CLIENT
Le client s'engage à utiliser le service conformément aux CGU, à désigner un administrateur, et à assurer le paiement aux échéances.

CONFIDENTIALITÉ ET DONNÉES
Chaque partie s'engage à préserver la confidentialité des informations échangées. Les données personnelles sont traitées conformément au RGPD et à la politique de confidentialité HireNova.

RÉSILIATION
En cas de manquement, une mise en demeure préalable de 30 jours est requise. Les sommes versées restent acquises.

LITIGES
Le présent contrat est soumis au droit marocain. Tout litige sera porté devant les tribunaux de Casablanca.`

  return generateDocument({
    type: 'agreement',
    number,
    recipientName: params.contactName,
    recipientEmail: params.workEmail,
    recipientCompany: params.companyName,
    recipientCountry: params.country,
    subject: `Contrat de services Enterprise — ${params.companyName}`,
    items: [{
      description: `Abonnement Enterprise annuel — ${params.companyName}`,
      quantity: 1,
      unitPrice: params.totalAmount,
      total: params.totalAmount,
    }],
    currency,
    taxRate: 0,
    inquiryId: params.inquiryId,
    agreementTerms: params.terms || defaultTerms,
    notes: 'Contrat généré automatiquement après acceptation du devis. À signer et retourner à hello@hirenova.com',
  })
}

// ============= Referral Agreement (Contrat de Parrainage) =============

/**
 * Generate a referral program agreement for a user joining the parrainage program.
 * Auto-generated with logo + electronic signature.
 */
export async function generateReferralAgreement(params: {
  userId: string
  userName: string
  userEmail: string
  referralCode: string
  rewardType?: string // FREE_MONTH | DISCOUNT
  rewardValue?: string
}): Promise<GeneratedDocument> {
  const number = await nextDocumentNumber('referral_agreement')

  const rewardLabel = (params.rewardType || 'FREE_MONTH') === 'DISCOUNT'
    ? `une remise de ${params.rewardValue || '10'}%`
    : `${params.rewardValue || '1'} mois gratuit`

  const terms = `OBJET DU CONTRAT
Le présent contrat a pour objet la participation de ${params.userName} au Programme de Parrainage HireNova. En contrepartie de la recommandation de la plateforme HireNova à de nouveaux utilisateurs, le parrain bénéficie de ${rewardLabel} sur l'abonnement de son choix pour chaque parrainage réussi.

CONDITIONS DE PARRAINAGE
Un parrainage est considéré comme réussi lorsque le filleul s'inscrit sur la plateforme HireNova via le lien de parrainage personnalisé (code : ${params.referralCode}), crée un compte vérifié, et souscrit à un abonnement payant (Starter, Pro, Career+, Employer ou Annuel).

CODE DE PARRAINAGE
Le code de parrainage personnel attribué au parrain est : ${params.referralCode}. Ce code est unique, personnel et incessible. Le parrain s'engage à ne pas utiliser de méthodes de spam, d'achat de leads ou de toute pratique trompeuse pour recruter des filleuls.

RÉCOMPENSE
Pour chaque parrainage réussi et validé, le parrain reçoit ${rewardLabel}. Les récompenses sont cumulables sans plafond. La récompense est appliquée automatiquement sur le prochain renouvellement d'abonnement.

ENGAGEMENTS DU PARRAIN
Le parrain s'engage à : représenter fidèlement les services de HireNova, ne pas faire de fausses déclarations concernant les fonctionnalités de la plateforme, respecter les CGU de HireNova, et informer ses filleuls des conditions d'utilisation.

ENGAGEMENTS DE HIRENOVA
HireNova s'engage à : créditer la récompense dans un délai de 48 heures après validation du parrainage, fournir un tableau de bord de suivi des parrainages, et assurer le support technique du programme.

DURÉE ET RÉSILIATION
Le présent contrat entre en vigueur dès son acceptation et court pour une durée indéterminée. Chaque partie peut y mettre fin à tout moment par simple notification. Les récompenses déjà créditées restent acquises.

CONFIDENTIALITÉ
Les données collectées dans le cadre de ce programme sont traitées conformément au RGPD et à la politique de confidentialité de HireNova.

LITIGES
Le présent contrat est soumis au droit marocain. Tout litige sera soumis à une médiation amiable avant tout recours judiciaire.`

  return generateDocument({
    type: 'referral_agreement',
    number,
    recipientName: params.userName,
    recipientEmail: params.userEmail,
    subject: `Contrat de Parrainage HireNova — ${params.referralCode}`,
    items: [{
      description: `Programme de Parrainage — code ${params.referralCode}`,
      quantity: 1,
      unitPrice: 0,
      total: 0,
    }],
    currency: 'EUR',
    taxRate: 0,
    userId: params.userId,
    agreementTerms: terms,
    notes: `Contrat de parrainage généré automatiquement. Code : ${params.referralCode}. Récompense : ${rewardLabel}.`,
  })
}

// ============= Partnership Agreement (Contrat de Partenariat) =============

/**
 * Generate a partnership agreement for enterprise/API/campus partners.
 * Auto-generated with logo + electronic signature.
 */
export async function generatePartnershipAgreement(params: {
  contactName: string
  workEmail: string
  companyName: string
  country?: string
  partnershipType: 'enterprise' | 'api' | 'campus' | 'agency'
  terms?: string
  usersCount?: string
}): Promise<GeneratedDocument> {
  const number = await nextDocumentNumber('partnership_agreement')

  const typeLabels: Record<string, string> = {
    enterprise: 'Partenariat Enterprise',
    api: 'Partenariat API / Intégration',
    campus: 'Partenariat Campus / Universitaire',
    agency: 'Partenariat Agence de Recrutement',
  }
  const typeLabel = typeLabels[params.partnershipType] || 'Partenariat'
  const usersStr = params.usersCount ? ` pour ${params.usersCount} utilisateurs` : ''

  const defaultTerms = `OBJET DU CONTRAT
Le présent contrat a pour objet l'établissement d'un partenariat entre HireNova (E-Society 2050) et ${params.companyName} pour ${typeLabel}${usersStr}. Les deux parties conviennent de collaborer afin de proposer les services de génération de CV IA, d'analyse ATS et de recrutement à leurs clients ou membres respectifs.

RESPONSABILITÉS DE HIRENOVA
HireNova fournira un accès prioritaire à la plateforme avec des tarifs préférentiels, un support technique dédié, une intégration API ou white-label si applicable, des rapports d'utilisation mensuels, et une formation initiale pour les équipes de ${params.companyName}.

RESPONSABILITÉS DE ${params.companyName?.toUpperCase() || 'LA PARTIE PARTENAIRE'}
${params.companyName} s'engage à promouvoir les services HireNova auprès de son réseau, à fournir les informations nécessaires à l'intégration technique, à désigner un interlocuteur principal, et à respecter les conditions d'utilisation de la plateforme.

CONDITIONS COMMERCIALES
Les conditions tarifaires applicables sont définies dans le devis associé (référence à déterminer). Les tarifs sont garantis pour une durée de 12 mois à compter de la signature du présent contrat. Toute modification tarifaire fera l'objet d'un préavis de 90 jours.

PROPRIÉTÉ INTELLECTUELLE
Chaque partie conserve la propriété de ses marques, logos et contenus. L'utilisation croisée des marques nécessite l'accord préalable écrit de l'autre partie.

CONFIDENTIALITÉ
Les informations commerciales, techniques et financières échangées dans le cadre de ce partenariat sont strictement confidentielles. La durée de confidentialité est de 3 ans après la fin du contrat.

DURÉE
Le contrat est conclu pour une durée de 12 mois renouvelable par tacite reconduction. Résiliation possible avec un préavis de 60 jours.

LITIGES
Le présent contrat est soumis au droit marocain. Tout litige fera l'objet d'une médiation amiable avant recours aux tribunaux de Casablanca.`

  return generateDocument({
    type: 'partnership_agreement',
    number,
    recipientName: params.contactName,
    recipientEmail: params.workEmail,
    recipientCompany: params.companyName,
    recipientCountry: params.country,
    subject: `Contrat de Partenariat ${typeLabel} — ${params.companyName}`,
    items: [{
      description: `Partenariat ${typeLabel} — ${params.companyName}`,
      quantity: 1,
      unitPrice: 0,
      total: 0,
    }],
    currency: 'EUR',
    taxRate: 0,
    agreementTerms: params.terms || defaultTerms,
    notes: `Contrat de partenariat ${typeLabel}. Généré automatiquement par HireNova.`,
  })
}

// ============= Service Agreement (Contrat de Service) =============

/**
 * Generate a service agreement auto-generated when a user purchases a paid plan.
 * Acts as the Terms of Service / Conditions Générales contract for each subscription.
 */
export async function generateServiceAgreement(params: {
  userId: string
  userName: string
  userEmail: string
  plan: string
  amount: number
  currency: string
  paymentProvider?: string
}): Promise<GeneratedDocument> {
  const number = await nextDocumentNumber('service_agreement')

  const planLabels: Record<string, string> = {
    starter: 'Starter',
    pro: 'Pro',
    career_plus: 'Career+',
    employer: 'Employeur',
    annual: 'Annuel',
    enterprise: 'Enterprise',
  }
  const planLabel = planLabels[params.plan] || params.plan
  const provider = params.paymentProvider || 'plateforme'

  const terms = `OBJET DU CONTRAT
Le présent contrat de service a pour objet la souscription par ${params.userName} à l'abonnement HireNova ${planLabel}. En contrepartie du paiement de ${params.amount} ${params.currency}, HireNova (E-Society 2050) accorde à l'utilisateur l'accès aux fonctionnalités correspondant au plan ${planLabel}.

SERVICES INCLUS (PLAN ${planLabel.toUpperCase()})
L'utilisateur bénéficie de l'accès complet à la plateforme HireNova selon les modalités du plan ${planLabel}, incluant la génération de CV IA, l'analyse de score ATS, les lettres de motivation, les templates professionnels, le support prioritaire, et toutes les fonctionnalités associées au plan choisi.

DURÉE ET RENOUVELLEMENT
L'abonnement est mensuel et se renouvelle automatiquement à l'échéance. L'utilisateur peut résilier à tout moment depuis son espace personnel. La résiliation prend effet à la fin de la période en cours. Les services restent accessibles jusqu'à l'expiration de la période payée.

MODALITÉS DE PAIEMENT
Le paiement est effectué via ${provider}. Le montant de ${params.amount} ${params.currency} est prélevé automatiquement à chaque renouvellement. En cas d'échec de paiement, l'accès est suspendu après 7 jours et résilié après 30 jours.

CONDITIONS GÉNÉRALES D'UTILISATION
L'utilisateur s'engage à utiliser la plateforme conformément aux CGU de HireNova, à ne pas partager ses identifiants, à ne pas utiliser les services à des fins illégales, et à respecter les droits de propriété intellectuelle.

PROPRIÉTÉ INTELLECTUELLE
Les contenus générés par la plateforme (CV, lettres de motivation) restent la propriété de l'utilisateur. HireNova conserve la propriété de l'algorithme, de l'interface et des marques.

PROTECTION DES DONNÉES
Les données personnelles sont traitées conformément au RGPD et à la loi 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel au Maroc.

LIMITATION DE RESPONSABILITÉ
HireNova s'engage à fournir un service disponible. En aucun cas, HireNova ne saurait être tenue responsable des dommages indirects résultant de l'utilisation de la plateforme.

LITIGES
Le présent contrat est soumis au droit marocain. Tout litige fera l'objet d'une médiation amiable. À défaut, les tribunaux de Casablanca seront seuls compétents.`

  return generateDocument({
    type: 'service_agreement',
    number,
    recipientName: params.userName,
    recipientEmail: params.userEmail,
    subject: `Contrat de Service — Abonnement ${planLabel}`,
    items: [{
      description: `Abonnement ${planLabel} — 1 mois via ${provider}`,
      quantity: 1,
      unitPrice: params.amount,
      total: params.amount,
    }],
    currency: params.currency,
    taxRate: 0,
    userId: params.userId,
    agreementTerms: terms,
    notes: `Contrat de service auto-généré lors de la souscription au plan ${planLabel}. Paiement : ${params.amount} ${params.currency} via ${provider}.`,
  })
}

// ============= Accounting Statement (Bilan Comptable) =============

/**
 * Draw the bilan content: period title, summary box, invoice table, tax section.
 * Called by buildPdf when data.type === 'accounting_statement'.
 */
function drawBilanContent(
  page: PDFPage,
  fontBold: PDFFont,
  fontRegular: PDFFont,
  fontItalic: PDFFont,
  data: DocumentData,
  startY: number
): number {
  const { width } = page.getSize()
  let yPos = startY

  // Aggregate values from linked invoices (authoritative source for the bilan)
  const linkedInvoices = data.linkedInvoices || []
  const aggSubtotal = linkedInvoices.reduce((sum, inv) => sum + inv.subtotal, 0)
  const aggTax = linkedInvoices.reduce((sum, inv) => sum + inv.taxAmount, 0)
  const aggTotal = data.totalCollected || linkedInvoices.reduce((sum, inv) => sum + inv.total, 0)

  // ===== Period banner =====
  const periodStr = data.periodStart && data.periodEnd
    ? `Période du ${formatDate(data.periodStart)} au ${formatDate(data.periodEnd)}`
    : 'Période courante'

  page.drawRectangle({
    x: 50,
    y: yPos - 24,
    width: width - 100,
    height: 24,
    color: COLORS.primaryLight,
  })
  page.drawText(periodStr, { x: 64, y: yPos - 17, size: 10, font: fontBold, color: COLORS.primaryDark })
  yPos -= 34

  // ===== Summary box (3 columns: Encaissements | Charges | Résultat) =====
  const boxHeight = 96
  const colWidth = (width - 100) / 3

  page.drawRectangle({
    x: 50,
    y: yPos - boxHeight,
    width: width - 100,
    height: boxHeight,
    color: COLORS.veryLight,
    borderColor: COLORS.border,
    borderWidth: 1,
  })

  // Column dividers
  page.drawLine({ start: { x: 50 + colWidth, y: yPos - boxHeight }, end: { x: 50 + colWidth, y: yPos }, thickness: 1, color: COLORS.border })
  page.drawLine({ start: { x: 50 + colWidth * 2, y: yPos - boxHeight }, end: { x: 50 + colWidth * 2, y: yPos }, thickness: 1, color: COLORS.border })

  // Column 1: ENCAISSEMENTS
  let colY = yPos - 16
  page.drawText('ENCAISSEMENTS', { x: 62, y: colY, size: 8, font: fontBold, color: COLORS.gray })
  colY -= 18
  page.drawText('Total HT', { x: 62, y: colY, size: 9, font: fontRegular, color: COLORS.gray })
  page.drawText(formatMoney(aggSubtotal, data.currency), { x: 62 + colWidth - 24, y: colY, size: 9, font: fontBold, color: COLORS.dark, align: TextAlignment.Right })
  colY -= 14
  page.drawText('Total TVA', { x: 62, y: colY, size: 9, font: fontRegular, color: COLORS.gray })
  page.drawText(formatMoney(aggTax, data.currency), { x: 62 + colWidth - 24, y: colY, size: 9, font: fontBold, color: COLORS.dark, align: TextAlignment.Right })
  colY -= 14
  page.drawText('Total TTC', { x: 62, y: colY, size: 9, font: fontBold, color: COLORS.dark })
  page.drawText(formatMoney(aggTotal, data.currency), { x: 62 + colWidth - 24, y: colY, size: 9, font: fontBold, color: COLORS.primaryDark, align: TextAlignment.Right })
  colY -= 14
  page.drawText(`${data.invoiceCount || 0} facture(s)`, { x: 62, y: colY, size: 8, font: fontItalic, color: COLORS.lightGray })

  // Column 2: CHARGES
  colY = yPos - 16
  page.drawText('CHARGES', { x: 62 + colWidth, y: colY, size: 8, font: fontBold, color: COLORS.gray })
  colY -= 18
  page.drawText('Frais plateforme', { x: 62 + colWidth, y: colY, size: 9, font: fontRegular, color: COLORS.gray })
  page.drawText(formatMoney(data.platformFees || 0, data.currency), { x: 62 + colWidth * 2 - 24, y: colY, size: 9, font: fontBold, color: COLORS.rose, align: TextAlignment.Right })
  colY -= 14
  page.drawText('Redevances', { x: 62 + colWidth, y: colY, size: 9, font: fontRegular, color: COLORS.gray })
  page.drawText(formatMoney(data.royaltyFees || 0, data.currency), { x: 62 + colWidth * 2 - 24, y: colY, size: 9, font: fontBold, color: COLORS.rose, align: TextAlignment.Right })
  colY -= 18
  page.drawText('Traitement paiements,', { x: 62 + colWidth, y: colY, size: 7, font: fontItalic, color: COLORS.lightGray })
  colY -= 10
  page.drawText('infra & IA.', { x: 62 + colWidth, y: colY, size: 7, font: fontItalic, color: COLORS.lightGray })

  // Column 3: RÉSULTAT (highlighted)
  page.drawRectangle({
    x: 50 + colWidth * 2,
    y: yPos - boxHeight,
    width: colWidth,
    height: boxHeight,
    color: COLORS.primary,
  })
  colY = yPos - 16
  page.drawText('RÉSULTAT NET', { x: 62 + colWidth * 2, y: colY, size: 8, font: fontBold, color: COLORS.white })
  colY -= 30
  page.drawText('Bénéfice net', { x: 62 + colWidth * 2, y: colY, size: 9, font: fontRegular, color: COLORS.white })
  colY -= 16
  const profitStr = formatMoney(data.netProfit || 0, data.currency)
  const profitWidth = fontBold.widthOfTextAtSize(profitStr, 14)
  page.drawText(profitStr, { x: 50 + colWidth * 2 + (colWidth - profitWidth) / 2, y: colY, size: 14, font: fontBold, color: COLORS.white })
  colY -= 12
  page.drawText('après charges', { x: 62 + colWidth * 2, y: colY, size: 7, font: fontItalic, color: COLORS.white })

  yPos -= boxHeight + 20

  // ===== Invoice detail table =====
  page.drawText('DÉTAIL DES FACTURES', { x: 50, y: yPos, size: 10, font: fontBold, color: COLORS.dark })
  yPos -= 16

  const tableX = 50
  const tableWidth = width - 100
  // Columns: N° (90) | Date (70) | Client (170) | HT (90) | TVA (80) | TTC (90) | rest
  const colNum = 90
  const colDate = 70
  const colClient = tableWidth - colNum - colDate - 90 - 80 - 95
  const colHT = 90
  const colTVA = 80
  const colTTC = 95

  // Table header
  page.drawRectangle({ x: tableX, y: yPos - 20, width: tableWidth, height: 20, color: COLORS.dark })
  page.drawText('N° Facture', { x: tableX + 8, y: yPos - 14, size: 8, font: fontBold, color: COLORS.white })
  page.drawText('Date', { x: tableX + colNum + 8, y: yPos - 14, size: 8, font: fontBold, color: COLORS.white })
  page.drawText('Client', { x: tableX + colNum + colDate + 8, y: yPos - 14, size: 8, font: fontBold, color: COLORS.white })
  page.drawText('HT', { x: tableX + colNum + colDate + colClient + colHT - 8, y: yPos - 14, size: 8, font: fontBold, color: COLORS.white, align: TextAlignment.Right })
  page.drawText('TVA', { x: tableX + colNum + colDate + colClient + colHT + colTVA - 8, y: yPos - 14, size: 8, font: fontBold, color: COLORS.white, align: TextAlignment.Right })
  page.drawText('TTC', { x: tableX + tableWidth - 8, y: yPos - 14, size: 8, font: fontBold, color: COLORS.white, align: TextAlignment.Right })
  yPos -= 20

  // Invoice rows (cap at 10 to fit on one page)
  const maxRows = Math.min(linkedInvoices.length, 10)
  for (let i = 0; i < maxRows; i++) {
    const inv = linkedInvoices[i]
    const rowH = 20
    if (i % 2 === 1) {
      page.drawRectangle({ x: tableX, y: yPos - rowH, width: tableWidth, height: rowH, color: COLORS.veryLight })
    }
    page.drawText(inv.number, { x: tableX + 8, y: yPos - 14, size: 8, font: fontBold, color: COLORS.dark })
    page.drawText(formatDate(inv.date), { x: tableX + colNum + 8, y: yPos - 14, size: 8, font: fontRegular, color: COLORS.gray })
    const client = (inv.client || '').slice(0, 28)
    page.drawText(client, { x: tableX + colNum + colDate + 8, y: yPos - 14, size: 8, font: fontRegular, color: COLORS.dark })
    page.drawText(formatMoney(inv.subtotal, data.currency), { x: tableX + colNum + colDate + colClient + colHT - 8, y: yPos - 14, size: 8, font: fontRegular, color: COLORS.dark, align: TextAlignment.Right })
    page.drawText(formatMoney(inv.taxAmount, data.currency), { x: tableX + colNum + colDate + colClient + colHT + colTVA - 8, y: yPos - 14, size: 8, font: fontRegular, color: COLORS.dark, align: TextAlignment.Right })
    page.drawText(formatMoney(inv.total, data.currency), { x: tableX + tableWidth - 8, y: yPos - 14, size: 8, font: fontBold, color: COLORS.primaryDark, align: TextAlignment.Right })
    yPos -= rowH
  }

  // Table border
  page.drawRectangle({ x: tableX, y: yPos, width: tableWidth, height: 20 + maxRows * 20, borderColor: COLORS.border, borderWidth: 1 })

  // Overflow note
  if (linkedInvoices.length > maxRows) {
    yPos -= 14
    page.drawText(`... et ${linkedInvoices.length - maxRows} autre(s) facture(s) non affichée(s) — voir le détail en base.`, {
      x: 50, y: yPos, size: 8, font: fontItalic, color: COLORS.lightGray,
    })
  }

  yPos -= 24

  // ===== Tax declaration section =====
  if (yPos > 200) {
    page.drawText('SECTION FISCALE', { x: 50, y: yPos, size: 10, font: fontBold, color: COLORS.dark })
    yPos -= 16

    page.drawRectangle({
      x: 50, y: yPos - 56, width: width - 100, height: 56,
      color: COLORS.veryLight, borderColor: COLORS.border, borderWidth: 1,
    })

    page.drawText('Chiffre d\'affaires HT :', { x: 64, y: yPos - 16, size: 9, font: fontRegular, color: COLORS.gray })
    page.drawText(formatMoney(aggSubtotal, data.currency), { x: width - 64, y: yPos - 16, size: 9, font: fontBold, color: COLORS.dark, align: TextAlignment.Right })

    page.drawText('TVA collectée à déclarer :', { x: 64, y: yPos - 32, size: 9, font: fontRegular, color: COLORS.gray })
    page.drawText(formatMoney(aggTax, data.currency), { x: width - 64, y: yPos - 32, size: 9, font: fontBold, color: COLORS.amber, align: TextAlignment.Right })

    page.drawText('Bénéfice net imposable :', { x: 64, y: yPos - 48, size: 9, font: fontBold, color: COLORS.dark })
    page.drawText(formatMoney(data.netProfit || 0, data.currency), { x: width - 64, y: yPos - 48, size: 9, font: fontBold, color: COLORS.primaryDark, align: TextAlignment.Right })

    yPos -= 72
  }

  return yPos
}

/**
 * Generate an accounting statement (bilan comptable) for a given period.
 *
 * Aggregates all paid invoices in the period, computes:
 *   - Total HT (subtotal)
 *   - Total TVA (tax)
 *   - Total TTC encaissé (totalCollected)
 *   - Frais de plateforme (payment processing + infra)
 *   - Redevances (third-party royalties)
 *   - Bénéfice net (totalCollected - platformFees - royaltyFees)
 *
 * The resulting bilan document is linked to all source invoices via linkedDocIds,
 * making it fully auditable for tax declaration and profit tracking.
 *
 * @param params.periodStart  Period start date (inclusive)
 * @param params.periodEnd    Period end date (inclusive)
 * @param params.platformFeesRate  Platform fee rate as decimal (e.g. 0.03 = 3%). Default 0.03
 * @param params.platformFeesFixed  Fixed platform fee per invoice (e.g. 0.30). Default 0.30
 * @param params.royaltyFees  Total royalties for the period. Default 0
 * @param params.currency     Currency code. Default EUR
 */
export async function generateAccountingStatement(params: {
  periodStart: Date
  periodEnd: Date
  platformFeesRate?: number
  platformFeesFixed?: number
  royaltyFees?: number
  currency?: string
  notes?: string
}): Promise<GeneratedDocument & { invoiceCount: number; netProfit: number; totalCollected: number }> {
  const currency = params.currency || 'EUR'
  const feesRate = params.platformFeesRate ?? 0.03   // 3% default (Stripe/LemonSqueezy-like)
  const feesFixed = params.platformFeesFixed ?? 0.30 // 0.30 per invoice
  const royaltyFees = params.royaltyFees ?? 0

  // Query all paid invoices in the period
  const invoices = await db.document.findMany({
    where: {
      type: 'invoice',
      paidAt: {
        gte: params.periodStart,
        lte: params.periodEnd,
      },
    },
    orderBy: { paidAt: 'asc' },
  })

  // Aggregate
  let subtotal = 0
  let taxAmount = 0
  let totalCollected = 0
  const linkedInvoices = invoices.map((inv) => {
    const invSubtotal = inv.subtotal
    const invTax = inv.taxAmount
    const invTotal = inv.total
    subtotal += invSubtotal
    taxAmount += invTax
    totalCollected += invTotal
    return {
      number: inv.number,
      date: inv.paidAt || inv.issueDate,
      client: inv.recipientCompany || inv.recipientName,
      subtotal: invSubtotal,
      taxAmount: invTax,
      total: invTotal,
      status: inv.status,
    }
  })

  // Compute charges
  const platformFees = invoices.length * feesFixed + totalCollected * feesRate
  const netProfit = totalCollected - platformFees - royaltyFees

  const number = await nextDocumentNumber('accounting_statement')
  const periodLabel = `${formatDate(params.periodStart)} - ${formatDate(params.periodEnd)}`

  // Items stored for audit (one item per invoice)
  const items: DocumentItem[] = linkedInvoices.map((inv) => ({
    description: `${inv.number} - ${inv.client}`,
    quantity: 1,
    unitPrice: inv.total,
    total: inv.total,
  }))

  const result = await generateDocument({
    type: 'accounting_statement',
    number,
    recipientName: 'HireNova — Direction Financière',
    recipientEmail: 'finance@hirenova.com',
    recipientCompany: 'E-Society 2050',
    recipientAddress: 'Casablanca, Maroc',
    subject: `Bilan comptable — ${periodLabel} — ${invoices.length} facture(s)`,
    items: items.length > 0 ? items : [{ description: 'Aucune facture sur la période', quantity: 0, unitPrice: 0, total: 0 }],
    currency,
    taxRate: taxAmount > 0 && subtotal > 0 ? (taxAmount / subtotal) * 100 : 0,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    linkedInvoices,
    invoiceCount: invoices.length,
    platformFees,
    royaltyFees,
    netProfit,
    totalCollected,
    notes: params.notes || `Bilan généré automatiquement. ${invoices.length} facture(s) payée(s) sur la période. Frais plateforme: ${(feesRate * 100).toFixed(1)}% + ${feesFixed.toFixed(2)} ${currency}/facture. Ce document lie toutes les factures payées pour le suivi fiscal (TVA, CA, bénéfice).`,
  })

  return {
    ...result,
    invoiceCount: invoices.length,
    netProfit,
    totalCollected,
  }
}
