/**
 * Generate the official HireNova logo as PNG (transparent background).
 *
 * Design: "HN" monogram in a rounded emerald square with an integrated
 * upward arrow (growth/career progression).
 *
 * Output: public/hirenova-mark.png  (512x512, transparent)
 *         public/hirenova-mark-white.png (512x512, white-on-transparent for dark headers)
 *
 * Run: bun run scripts/generate-logo.ts
 */
import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { join } from 'path'

// ============= Design =============

const ICON_SVG = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="55%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
    <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#d1fae5"/>
    </linearGradient>
  </defs>

  <!-- Rounded square background -->
  <rect x="20" y="20" width="472" height="472" rx="108" ry="108" fill="url(#bgGrad)"/>

  <!-- Subtle inner highlight (glass effect) -->
  <rect x="20" y="20" width="472" height="236" rx="108" ry="108" fill="#ffffff" opacity="0.08"/>

  <!-- "H" letter — geometric, 3 rounded rectangles -->
  <g fill="#ffffff">
    <!-- H left vertical -->
    <rect x="96" y="176" width="56" height="200" rx="18"/>
    <!-- H right vertical -->
    <rect x="232" y="176" width="56" height="200" rx="18"/>
    <!-- H crossbar -->
    <rect x="108" y="258" width="168" height="48" rx="18"/>
  </g>

  <!-- "N" letter — integrated with upward arrow (career growth) -->
  <g fill="#ffffff">
    <!-- N left vertical -->
    <rect x="316" y="176" width="52" height="200" rx="18"/>
    <!-- N right vertical -->
    <rect x="404" y="176" width="52" height="200" rx="18"/>
    <!-- N diagonal — drawn as a thick rounded line -->
    <line x1="368" y1="376" x2="416" y2="176" stroke="#ffffff" stroke-width="52" stroke-linecap="round"/>
  </g>

  <!-- Upward arrow (growth) — centered above the H, pointing up -->
  <g fill="url(#arrowGrad)">
    <!-- Arrow shaft -->
    <rect x="238" y="96" width="36" height="68" rx="8"/>
    <!-- Arrow head (triangle) -->
    <polygon points="256,72 216,124 296,124"/>
  </g>

  <!-- Small dot accents (modern tech feel) -->
  <circle cx="96" cy="120" r="8" fill="#ffffff" opacity="0.6"/>
  <circle cx="416" cy="120" r="8" fill="#ffffff" opacity="0.6"/>
</svg>
`

// White-on-transparent version (for dark backgrounds / colored headers)
const ICON_WHITE_SVG = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- "H" letter -->
  <g fill="#ffffff">
    <rect x="96" y="176" width="56" height="200" rx="18"/>
    <rect x="232" y="176" width="56" height="200" rx="18"/>
    <rect x="108" y="258" width="168" height="48" rx="18"/>
  </g>
  <!-- "N" letter -->
  <g fill="#ffffff">
    <rect x="316" y="176" width="52" height="200" rx="18"/>
    <rect x="404" y="176" width="52" height="200" rx="18"/>
    <line x1="368" y1="376" x2="416" y2="176" stroke="#ffffff" stroke-width="52" stroke-linecap="round"/>
  </g>
  <!-- Upward arrow -->
  <g fill="#ffffff">
    <rect x="238" y="96" width="36" height="68" rx="8"/>
    <polygon points="256,72 216,124 296,124"/>
  </g>
</svg>
`

// ============= Render =============

const PUBLIC_DIR = join(process.cwd(), 'public')

async function main() {
  mkdirSync(PUBLIC_DIR, { recursive: true })

  // Full color mark (emerald bg + white HN)
  await sharp(Buffer.from(ICON_SVG))
    .png({ compressionLevel: 9 })
    .toFile(join(PUBLIC_DIR, 'hirenova-mark.png'))

  // White-only mark (transparent bg, for overlay on colored headers)
  await sharp(Buffer.from(ICON_WHITE_SVG))
    .png({ compressionLevel: 9 })
    .toFile(join(PUBLIC_DIR, 'hirenova-mark-white.png'))

  console.log('✓ Logos generated:')
  console.log('  - public/hirenova-mark.png        (emerald square + white HN)')
  console.log('  - public/hirenova-mark-white.png  (white HN, transparent bg)')
}

main().catch((err) => {
  console.error('✗ Logo generation failed:', err)
  process.exit(1)
})
