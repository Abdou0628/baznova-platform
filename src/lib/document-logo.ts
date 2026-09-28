/**
 * HireNova Document Logo Loader
 *
 * Loads and caches the HireNova logo PNG for embedding in PDF documents.
 * Two variants:
 *   - mark (emerald square + white HN)  → for white/light document body
 *   - mark-white (white HN, transparent) → for colored header bands
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { PDFDocument, PNG } from 'pdf-lib'

type LogoVariant = 'color' | 'white'

const LOGO_PATHS: Record<LogoVariant, string> = {
  color: join(process.cwd(), 'public', 'hirenova-mark.png'),
  white: join(process.cwd(), 'public', 'hirenova-mark-white.png'),
}

// In-memory cache so we only read from disk once per server lifetime.
const bufferCache: Partial<Record<LogoVariant, Buffer>> = {}

function getLogoBuffer(variant: LogoVariant): Buffer {
  if (bufferCache[variant]) return bufferCache[variant]!
  const buf = readFileSync(LOGO_PATHS[variant])
  bufferCache[variant] = buf
  return buf
}

/**
 * Embed the HireNova logo into a PDFDocument.
 * Returns the embedded PNG, ready to be drawn on a page via page.drawImage().
 *
 * @param pdfDoc  The PDFDocument to embed the logo into
 * @param variant 'color' (emerald square, for light backgrounds)
 *                or 'white' (white HN only, for colored header bands)
 */
export async function embedHireNovaLogo(
  pdfDoc: PDFDocument,
  variant: LogoVariant = 'color'
) {
  const buffer = getLogoBuffer(variant)
  return pdfDoc.embedPng(buffer)
}

/**
 * Pre-validate that the logo files exist (used at server boot).
 */
export function validateLogoAssets(): { ok: boolean; missing: string[] } {
  const missing: string[] = []
  for (const [variant, path] of Object.entries(LOGO_PATHS)) {
    try {
      readFileSync(path)
    } catch {
      missing.push(`${variant}: ${path}`)
    }
  }
  return { ok: missing.length === 0, missing }
}
