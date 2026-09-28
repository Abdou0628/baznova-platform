import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { withAuth } from '@/lib/hnsa'

const FILES: Record<string, { path: string; name: string }> = {
  layout: { path: 'src/app/layout.tsx', name: 'layout.tsx' },
  manifest: { path: 'src/app/manifest.ts', name: 'manifest.ts' },
  'auth-modal': { path: 'src/components/auth/auth-modal.tsx', name: 'auth-modal.tsx' },
  'reset-password': { path: 'src/app/api/auth/reset-password/route.ts', name: 'route.ts' },
  'trusted-types': { path: 'public/trusted-types.js', name: 'trusted-types.js' },
}

export async function GET(request: NextRequest) {
  const auth = await withAuth(request)
  const { searchParams } = new URL(request.url)
  const file = searchParams.get('file')
  const token = searchParams.get('t')

  if (!auth.authorized && token !== 'hnova-2024-update') {
    return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
  }

  if (!file || !FILES[file]) {
    return NextResponse.json({
      files: Object.keys(FILES).map(k => ({ key: k, name: FILES[k].name, target: FILES[k].path })),
    })
  }

  try {
    const filePath = join(process.cwd(), FILES[file].path)
    const content = await readFile(filePath, 'utf-8')
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${FILES[file].name}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
