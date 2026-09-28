import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'

export const dynamic = 'force-dynamic'

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

export interface BlogArticleFull {
  slug: string
  title: string
  description: string
  excerpt: string
  category: string
  author: string
  date: string
  readingTime: number
  keywords: string[]
  lang: string
  content: string
  htmlAvailable: boolean
}

/**
 * GET /api/blog/[slug]
 * Returns the full content (frontmatter + markdown body) of a single article.
 *
 * Response:
 *  200 — { success: true, data: BlogArticleFull }
 *  404 — { success: false, error: { code: 404, message: 'Article introuvable' } }
 *  500 — { success: false, error: { code: 500, message: 'Erreur serveur' } }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Basic slug sanitization (alphanumeric, hyphens only)
    if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
      return NextResponse.json(
        { success: false, error: { code: 400, message: 'Slug invalide' } },
        { status: 400 }
      )
    }

    const filePath = path.join(BLOG_DIR, `${slug}.md`)

    let raw: string
    try {
      raw = await fs.readFile(filePath, 'utf-8')
    } catch (err) {
      return NextResponse.json(
        { success: false, error: { code: 404, message: 'Article introuvable' } },
        { status: 404 }
      )
    }

    const { data, content } = matter(raw)

    const article: BlogArticleFull = {
      slug: data.slug || slug,
      title: data.title || slug,
      description: data.description || '',
      excerpt: data.excerpt || '',
      category: data.category || 'Carrière',
      author: data.author || 'HireNova',
      date: data.date ? String(data.date) : new Date().toISOString().slice(0, 10),
      readingTime: Number(data.readingTime) || 5,
      keywords: Array.isArray(data.keywords) ? data.keywords : [],
      lang: data.lang || 'fr',
      content,
      htmlAvailable: false,
    }

    return NextResponse.json({ success: true, data: article })
  } catch (error) {
    console.error('[/api/blog/[slug]] GET error:', error)
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur serveur lors de la récupération de l\'article' } },
      { status: 500 }
    )
  }
}
