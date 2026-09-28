import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET() {
  try {
    const content = await readFile(join(process.cwd(), 'public/update-hirenova.ps1'), 'utf-8')
    return new NextResponse(content, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
}
