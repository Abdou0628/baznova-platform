import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category') || ''
    const sort = searchParams.get('sort') || 'new'
    const search = searchParams.get('search') || ''
    const language = searchParams.get('language') || 'fr'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = { language }
    if (category && category !== 'all') {
      where.category = category
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { body: { contains: search } },
      ]
    }

    const orderBy = sort === 'top' ? { upvotes: 'desc' as const } : { createdAt: 'desc' as const }

    const [posts, total] = await Promise.all([
      db.communityPost.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, image: true } },
          replies: {
            take: 3,
            orderBy: { createdAt: 'asc' },
            include: {
              user: { select: { id: true, name: true, image: true } },
            },
          },
        },
      }),
      db.communityPost.count({ where }),
    ])

    return NextResponse.json({ posts, total, page, limit })
  } catch (error) {
    console.error('GET /api/marketplace/posts error:', error)
    return NextResponse.json({ posts: [], total: 0 }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const body = await req.json()
    const { title, body: postBody, category, language } = body

    if (!title || !postBody) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })
    }

    const post = await db.communityPost.create({
      data: {
        userId: auth.email || null,
        title,
        body: postBody,
        category: category || 'career-advice',
        language: language || 'fr',
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    })

    // Update community profile stats
    if (auth.email) {
      const existingProfile = await db.communityProfile.findUnique({
        where: { userId: auth.email },
      })
      if (existingProfile) {
        await db.communityProfile.update({
          where: { userId: auth.email },
          data: { postsCount: { increment: 1 }, reputation: { increment: 5 } },
        })
      }
    }

    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    console.error('POST /api/marketplace/posts error:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}

// PUT /api/marketplace/posts — for upvoting and replying
export async function PUT(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const body = await req.json()
    const { postId, action } = body

    if (action === 'upvote') {
      const updated = await db.communityPost.update({
        where: { id: postId },
        data: { upvotes: { increment: 1 } },
      })
      return NextResponse.json({ upvotes: updated.upvotes })
    }

    if (action === 'downvote') {
      const updated = await db.communityPost.update({
        where: { id: postId },
        data: { upvotes: { decrement: 1 } },
      })
      return NextResponse.json({ upvotes: updated.upvotes })
    }

    if (action === 'reply') {
      const { body: replyBody } = body
      if (!replyBody) {
        return NextResponse.json({ error: 'Reply body is required' }, { status: 400 })
      }

      const reply = await db.communityReply.create({
        data: {
          postId,
          userId: auth.email || null,
          body: replyBody,
        },
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      })

      await db.communityPost.update({
        where: { id: postId },
        data: { replyCount: { increment: 1 } },
      })

      // Update community profile stats
      if (auth.email) {
        const existingProfile = await db.communityProfile.findUnique({
          where: { userId: auth.email },
        })
        if (existingProfile) {
          await db.communityProfile.update({
            where: { userId: auth.email },
            data: { repliesCount: { increment: 1 }, reputation: { increment: 2 } },
          })
        }
      }

      return NextResponse.json({ reply }, { status: 201 })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('PUT /api/marketplace/posts error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// Seed demo data on first request if empty
export async function PATCH(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
    const count = await db.communityPost.count()
    if (count > 0) {
      return NextResponse.json({ seeded: false, message: 'Posts already exist' })
    }

    const demoPosts = [
      { title: 'Comment se préparer à un entretien technique ?', body: 'Je passe un entretien technique la semaine prochaine pour un poste de développeur frontend. Quelles sont les meilleures stratégies de préparation ? Quels types de questions puis-je m\'attendre à recevoir ?', category: 'interview-prep', language: 'fr', upvotes: 24, replyCount: 3 },
      { title: 'Les tendances du marché de l\'emploi 2025', body: 'Le marché de l\'emploi évolue rapidement. L\'IA, le travail hybride et les compétences numériques transforment les attentes des recruteurs. Quelles compétences seront les plus demandées cette année ?', category: 'industry-news', language: 'fr', upvotes: 18, replyCount: 2 },
      { title: 'Avis sur mon CV — Développeur Junior', body: 'Bonjour, je viens de terminer mon master en informatique et je cherche mon premier emploi. Pourriez-vous me donner des retours sur mon approche ? Quels éléments mettre en avant en tant que junior ?', category: 'cv-review', language: 'fr', upvotes: 31, replyCount: 5 },
      { title: 'Transition de carrière : du marketing vers la tech', body: 'Après 5 ans dans le marketing digital, je souhaite me reconvertir vers la tech. Quelqu\'un a-t-il fait une transition similaire ? Quels parcours de formation recommandez-vous ?', category: 'career-advice', language: 'fr', upvotes: 42, replyCount: 7 },
      { title: 'Remote work : comment gérer la productivité ?', body: 'Le travail à distance a beaucoup d\'avantages mais aussi des défis. Comment maintenez-vous votre productivité et votre équilibre vie pro/perso ? Quels outils utilisez-vous ?', category: 'off-topic', language: 'fr', upvotes: 15, replyCount: 2 },
      { title: 'How to ace a behavioral interview?', body: 'I have a behavioral interview coming up at a FAANG company. Any tips on how to structure answers using the STAR method? What are common pitfalls to avoid?', category: 'interview-prep', language: 'en', upvotes: 56, replyCount: 8 },
      { title: 'Best job search strategies for 2025', body: 'With AI changing recruitment, what are the most effective job search strategies? Should I focus more on networking, online applications, or reaching out directly to hiring managers?', category: 'job-search', language: 'en', upvotes: 38, replyCount: 4 },
      { title: 'Conseils pour négocier son salaire', body: 'J\'ai reçu une offre d\'emploi mais le salaire proposé est en dessous de mes attentes. Comment aborder la négociation salariale de manière professionnelle ? Quels arguments avancer ?', category: 'career-advice', language: 'fr', upvotes: 29, replyCount: 6 },
    ]

    for (const p of demoPosts) {
      await db.communityPost.create({ data: p })
    }

    const demoEvents = [
      { title: 'Webinar : L\'IA au service du recrutement', description: 'Découvrez comment l\'IA transforme le processus de recrutement. Présentation des outils les plus récents et démo live.', type: 'webinar', date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), duration: 90, location: 'Zoom', attendeeCount: 127, capacity: 300, language: 'fr', status: 'upcoming' },
      { title: 'Meetup HireNova Paris', description: 'Rencontrez d\'autres professionnels lors de notre meetup mensuel. Networking, talks et cocktails.', type: 'meetup', date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), duration: 120, location: 'Paris, Station F', attendeeCount: 89, capacity: 150, language: 'fr', status: 'upcoming' },
      { title: 'Atelier : Optimisez votre CV avec l\'IA', description: 'Atelier pratique pour apprendre à utiliser les outils IA d\'HireNova et créer un CV qui passe les filtres ATS.', type: 'workshop', date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), duration: 60, location: 'En ligne', attendeeCount: 215, capacity: 500, language: 'fr', status: 'upcoming' },
      { title: 'Salon de l\'Emploi Numérique', description: 'Plus de 50 entreprises du numérique présentes. Entretiens express, workshops et conférences.', type: 'job-fair', date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), duration: 240, location: 'Lyon, Eurexpo', attendeeCount: 340, capacity: 1000, language: 'fr', status: 'upcoming' },
    ]

    for (const e of demoEvents) {
      await db.communityEvent.create({ data: e })
    }

    return NextResponse.json({ seeded: true, posts: demoPosts.length, events: demoEvents.length })
  } catch (error) {
    console.error('PATCH /api/marketplace/posts seed error:', error)
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 })
  }
}
