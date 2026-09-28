/**
 * HireNova Electronic Signature Engine
 *
 * Generates a cryptographic fingerprint (SHA-256) for each document and
 * renders a professional signature block on the PDF.
 *
 * The signature block includes:
 *   - A visual seal/badge (geometric shield)
 *   - Signer identity (HireNova — E-Society 2050)
 *   - Signature hash (truncated SHA-256, verifiable)
 *   - Signature serial number (SIG-YYYY-NNNNNN)
 *   - Timestamp (ISO 8601, UTC)
 *   - Verification note
 *
 * This is a "simple electronic signature" (eIDAS level 1) — legally
 * admissible and tamper-evident. The hash can be recomputed from the
 * document data and compared to detect any modification.
 */
import { createHash, randomBytes } from 'crypto'
import { PDFPage, PDFFont, rgb, degrees } from 'pdf-lib'
import { db } from '@/lib/db'

// ============= Types =============

export interface SignatureFingerprint {
  /** The document number (e.g. FAC-2026-0001) */
  number: string
  /** Document type */
  type: string
  /** Issuer legal name */
  issuer: string
  /** Recipient name */
  recipient: string
  /** Recipient email */
  recipientEmail: string
  /** Total amount */
  total: number
  /** Currency */
  currency: string
  /** Issue date ISO string */
  issueDate: string
  /** JSON-stringified items */
  items: string
  /** Subject */
  subject: string
}

export interface AppliedSignature {
  hash: string
  serial: string
  signedAt: Date
  signedBy: string
}

// ============= Hash generation =============

const SIGNATURE_SALT =
  process.env.DOCUMENT_SIGNATURE_SALT || 'hirenova-esign-salt-2026-e-society-2050'

/**
 * Compute the SHA-256 fingerprint of a document.
 * The hash is derived from the document's core data + a server-side salt,
 * making it tamper-evident: any change to the document data produces a
 * completely different hash.
 */
export function computeSignatureHash(fp: SignatureFingerprint): string {
  const payload = [
    `num:${fp.number}`,
    `typ:${fp.type}`,
    `iss:${fp.issuer}`,
    `rcp:${fp.recipient}`,
    `eml:${fp.recipientEmail}`,
    `sub:${fp.subject}`,
    `itm:${fp.items}`,
    `tot:${fp.total.toFixed(2)}`,
    `cur:${fp.currency}`,
    `dat:${fp.issueDate}`,
    `salt:${SIGNATURE_SALT}`,
  ].join('|')

  return createHash('sha256').update(payload, 'utf8').digest('hex')
}

/**
 * Generate the next sequential signature serial number: SIG-2026-000001
 * Uses the Document table's signatureSerial column for uniqueness.
 */
export async function nextSignatureSerial(date = new Date()): Promise<string> {
  const year = date.getFullYear()
  // Count existing signatures this year to derive the next sequence
  const existing = await db.document.findMany({
    where: {
      signatureSerial: { startsWith: `SIG-${year}-` },
    },
    orderBy: { signatureSerial: 'desc' },
    take: 1,
  })

  let next = 1
  if (existing.length > 0 && existing[0].signatureSerial) {
    const match = existing[0].signatureSerial.match(/-(\d+)$/)
    if (match) next = parseInt(match[1], 10) + 1
  }

  return `SIG-${year}-${String(next).padStart(6, '0')}`
}

/**
 * Short display form of a hash: first 8 + last 8 chars, uppercase.
 * Example: "A3F2B1C9 … 7E4D8F01"
 */
export function shortHash(hash: string): string {
  if (hash.length < 20) return hash.toUpperCase()
  return `${hash.slice(0, 8).toUpperCase()}…${hash.slice(-8).toUpperCase()}`
}

// ============= Color palette (must match documents.ts) =============

const SIG_COLORS = {
  seal: rgb(0.055, 0.725, 0.506),       // emerald-600
  sealDark: rgb(0.024, 0.588, 0.412),   // emerald-700
  dark: rgb(0.059, 0.094, 0.165),       // slate-900
  gray: rgb(0.4, 0.447, 0.529),         // slate-500
  lightGray: rgb(0.635, 0.671, 0.737),  // slate-400
  border: rgb(0.902, 0.914, 0.933),     // slate-200
  veryLight: rgb(0.972, 0.976, 0.984),  // slate-50
  white: rgb(1, 1, 1),
  gold: rgb(0.835, 0.643, 0.024),       // amber-600
}

// ============= Signature block renderer =============

/**
 * Draw the electronic signature block at the bottom of a PDF page.
 *
 * Layout (height ~95pt, full width minus margins):
 *
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │  [SEAL]  SIGNATURE ÉLECTRONIQUE                              │
 *  │  ┌──┐    Signé par HireNova — E-Society 2050                 │
 *  │  │HN│    Hash SHA-256: A3F2B1C9…7E4D8F01                     │
 *  │  └──┘    N° SIG-2026-000001 · 27/07/2026 14:32 UTC           │
 *  │          Document authentifié — toute modification invalide  │
 *  │          cette signature. Vérifiable sur demande.            │
 *  └──────────────────────────────────────────────────────────────┘
 *
 * @returns the Y position above the signature block (for layout calculations)
 */
export function drawSignatureBlock(
  page: PDFPage,
  fontBold: PDFFont,
  fontRegular: PDFFont,
  fontItalic: PDFFont,
  sig: AppliedSignature,
  startY: number
): number {
  const { width } = page.getSize()
  const margin = 50
  const boxX = margin
  const boxWidth = width - margin * 2
  const boxHeight = 92
  const boxY = startY - boxHeight

  // Background (very light) + border
  page.drawRectangle({
    x: boxX,
    y: boxY,
    width: boxWidth,
    height: boxHeight,
    color: SIG_COLORS.veryLight,
    borderColor: SIG_COLORS.seal,
    borderWidth: 1.2,
  })

  // Left accent bar (emerald)
  page.drawRectangle({
    x: boxX,
    y: boxY,
    width: 4,
    height: boxHeight,
    color: SIG_COLORS.seal,
  })

  // ===== Seal (geometric shield with "HN") =====
  const sealSize = 44
  const sealX = boxX + 16
  const sealY = boxY + (boxHeight - sealSize) / 2

  // Seal background (rounded square, emerald)
  page.drawRectangle({
    x: sealX,
    y: sealY,
    width: sealSize,
    height: sealSize,
    color: SIG_COLORS.seal,
    borderWidth: 0,
  })
  // Round corners by drawing white corner triangles (pdf-lib has no rounded rect)
  const corner = 6
  page.drawRectangle({ x: sealX, y: sealY + sealSize - corner, width: corner, height: corner, color: SIG_COLORS.veryLight })
  page.drawRectangle({ x: sealX + sealSize - corner, y: sealY + sealSize - corner, width: corner, height: corner, color: SIG_COLORS.veryLight })
  page.drawRectangle({ x: sealX, y: sealY, width: corner, height: corner, color: SIG_COLORS.veryLight })
  page.drawRectangle({ x: sealX + sealSize - corner, y: sealY, width: corner, height: corner, color: SIG_COLORS.veryLight })
  // Re-draw the rounded background properly with a single rounded look using a slightly smaller rect
  page.drawRectangle({
    x: sealX + 2,
    y: sealY + 2,
    width: sealSize - 4,
    height: sealSize - 4,
    color: SIG_COLORS.seal,
  })

  // "HN" text in the seal (white, bold, centered)
  const hnText = 'HN'
  const hnSize = 16
  const hnWidth = fontBold.widthOfTextAtSize(hnText, hnSize)
  page.drawText(hnText, {
    x: sealX + (sealSize - hnWidth) / 2,
    y: sealY + sealSize / 2 - hnSize / 2 + 2,
    size: hnSize,
    font: fontBold,
    color: SIG_COLORS.white,
  })

  // Checkmark below HN (small, gold — certification feel)
  page.drawText('✓', {
    x: sealX + sealSize - 12,
    y: sealY + 4,
    size: 10,
    font: fontBold,
    color: SIG_COLORS.gold,
  })

  // ===== Text content (right of seal) =====
  const textX = sealX + sealSize + 14
  let textY = boxY + boxHeight - 16

  // Title
  page.drawText('SIGNATURE ÉLECTRONIQUE', {
    x: textX,
    y: textY,
    size: 9,
    font: fontBold,
    color: SIG_COLORS.sealDark,
  })

  textY -= 13
  // Signer
  page.drawText(`Signé par ${sig.signedBy}`, {
    x: textX,
    y: textY,
    size: 9,
    font: fontBold,
    color: SIG_COLORS.dark,
  })

  textY -= 13
  // Hash
  page.drawText('Hash SHA-256 :', {
    x: textX,
    y: textY,
    size: 8,
    font: fontRegular,
    color: SIG_COLORS.gray,
  })
  page.drawText(shortHash(sig.hash), {
    x: textX + 72,
    y: textY,
    size: 8,
    font: fontBold,
    color: SIG_COLORS.dark,
  })

  textY -= 12
  // Serial + date
  const sigDate = new Date(sig.signedAt)
  const dateStr = `${String(sigDate.getUTCDate()).padStart(2, '0')}/${String(sigDate.getUTCMonth() + 1).padStart(2, '0')}/${sigDate.getUTCFullYear()} ${String(sigDate.getUTCHours()).padStart(2, '0')}:${String(sigDate.getUTCMinutes()).padStart(2, '0')} UTC`
  page.drawText(`N° ${sig.serial}`, {
    x: textX,
    y: textY,
    size: 8,
    font: fontBold,
    color: SIG_COLORS.sealDark,
  })
  page.drawText(`· ${dateStr}`, {
    x: textX + fontBold.widthOfTextAtSize(`N° ${sig.serial}`, 8) + 6,
    y: textY,
    size: 8,
    font: fontRegular,
    color: SIG_COLORS.gray,
  })

  textY -= 12
  // Verification note
  page.drawText('Document authentifié par HireNova — toute modification invalide cette signature.', {
    x: textX,
    y: textY,
    size: 7,
    font: fontItalic,
    color: SIG_COLORS.lightGray,
  })

  return boxY - 8
}

/**
 * Apply a full electronic signature to a document:
 * 1. Compute the SHA-256 hash from the document fingerprint
 * 2. Generate the next signature serial number
 * 3. Return the signature data for DB persistence + PDF rendering
 */
export async function applySignature(
  fp: SignatureFingerprint,
  signedBy = 'HireNova — E-Society 2050'
): Promise<AppliedSignature> {
  const hash = computeSignatureHash(fp)
  const serial = await nextSignatureSerial()
  return {
    hash,
    serial,
    signedAt: new Date(),
    signedBy,
  }
}
