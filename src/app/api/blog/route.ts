import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'

export const dynamic = 'force-dynamic'

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

export interface BlogArticleMeta {
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
}

/**
 * GET /api/blog
 * Returns the list of all blog articles (metadata only).
 *
 * Query params:
 *  - category: filter by category (CV, ATS, Carrière, Mobilité, Emploi, Lettre de motivation)
 *  - lang: filter by language (fr, en, ar, es)
 *  - limit: max number of articles to return (default: all)
 *
 * Response:
 *  200 — { success: true, data: { articles: BlogArticleMeta[], total: number } }
 *  500 — { success: false, error: { code, message } }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const lang = searchParams.get('lang')
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : null

    let files: string[]
    try {
      files = await fs.readdir(BLOG_DIR)
    } catch (err) {
      // Directory does not exist (yet) — return empty list
      return NextResponse.json({ success: true, data: { articles: [], total: 0 } })
    }

    const mdFiles = files.filter((f) => f.endsWith('.md'))

    const articles: BlogArticleMeta[] = []
    for (const file of mdFiles) {
      const filePath = path.join(BLOG_DIR, file)
      try {
        const raw = await fs.readFile(filePath, 'utf-8')
        const { data } = matter(raw)
        const slug = file.replace(/\.md$/, '')

        // Skip files that don't have the required frontmatter
        if (!data.title || !data.slug) continue

        articles.push({
          slug: data.slug || slug,
          title: data.title,
          description: data.description || '',
          excerpt: data.excerpt || '',
          category: data.category || 'Carrière',
          author: data.author || 'HireNova',
          date: data.date ? String(data.date) : new Date().toISOString().slice(0, 10),
          readingTime: Number(data.readingTime) || 5,
          keywords: Array.isArray(data.keywords) ? data.keywords : [],
          lang: data.lang || 'fr',
        })
      } catch (err) {
        // Skip unreadable files but continue processing others
        continue
      }
    }

    // Sort by date descending (most recent first)
    articles.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

    // Apply filters
    let filtered = articles
    if (category) {
      filtered = filtered.filter((a) => a.category.toLowerCase() === category.toLowerCase())
    }
    if (lang) {
      filtered = filtered.filter((a) => a.lang.toLowerCase() === lang.toLowerCase())
    }

    // Apply limit
    const total = filtered.length
    if (limit && !Number.isNaN(limit) && limit > 0) {
      filtered = filtered.slice(0, limit)
    }

    return NextResponse.json({
      success: true,
      data: { articles: filtered, total },
    })
  } catch (error) {
    console.error('[/api/blog] GET error:', error)
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur serveur lors de la récupération des articles' } },
      { status: 500 }
    )
  }
}
