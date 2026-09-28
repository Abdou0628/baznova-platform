import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

// Seed demo missions if none exist
async function seedDemoMissions() {
  const count = await db.freelanceMission.count()
  if (count > 0) return

  // Ensure demo clients exist in User table
  const demoClientIds = [
    'demo-client-1', 'demo-client-2', 'demo-client-3', 'demo-client-4',
    'demo-client-5', 'demo-client-6', 'demo-client-7', 'demo-client-8',
  ]
  const existingClients = (await db.user.findMany({
    where: { id: { in: demoClientIds } },
    select: { id: true },
  })).map(u => u.id)
  const missingClients = demoClientIds.filter(id => !existingClients.includes(id))

  if (missingClients.length > 0) {
    try {
      await db.user.createMany({
        data: missingClients.map(id => ({
          id,
          name: getClientName(id),
          email: `${id}@hirenova.demo`,
          plan: 'free' as const,
        })),
      })
    } catch {
      // Duplicate emails possible in race conditions — ignore
    }
  }

  const demoMissions = [
    {
      userId: 'demo-client-1',
      title: 'Application e-commerce Next.js',
      description: 'Développement d\'une application e-commerce complète avec Next.js 15, Stripe pour les paiements, et un back-office admin. L\'application doit inclure la gestion des produits, panier, checkout, et suivi de commandes. Design responsive mobile-first avec Tailwind CSS.',
      category: 'tech',
      budgetMin: 3000,
      budgetMax: 5000,
      currency: 'EUR',
      duration: '1 month',
      skills: JSON.stringify(['Next.js', 'TypeScript', 'Stripe', 'Tailwind CSS', 'PostgreSQL']),
      status: 'open',
    },
    {
      userId: 'demo-client-2',
      title: 'Identité visuelle startup fintech',
      description: 'Création d\'une identité visuelle complète pour une startup fintech : logo, charte graphique, templates réseaux sociaux, et mockups d\'application mobile. Style moderne et minimaliste, couleurs sobres inspirées du secteur bancaire.',
      category: 'design',
      budgetMin: 1500,
      budgetMax: 2500,
      currency: 'EUR',
      duration: '2 weeks',
      skills: JSON.stringify(['Figma', 'Illustrator', 'Branding', 'UI/UX', 'Mockups']),
      status: 'open',
    },
    {
      userId: 'demo-client-3',
      title: 'Campagne SEO & Content Marketing',
      description: 'Stratégie et mise en place d\'une campagne SEO complète : audit technique, recherche de mots-clés, optimisation on-page, rédaction de 10 articles de blog optimisés, et création de backlinks. Objectif : positionnement top 10 sur 20 mots-clés cibles en 3 mois.',
      category: 'marketing',
      budgetMin: 2000,
      budgetMax: 4000,
      currency: 'EUR',
      duration: '3 months',
      skills: JSON.stringify(['SEO', 'Content Marketing', 'Google Analytics', 'Copywriting', 'Link Building']),
      status: 'open',
    },
    {
      userId: 'demo-client-4',
      title: 'Traduction site web EN → FR + AR',
      description: 'Traduction complète d\'un site web corporate de l\'anglais vers le français et l\'arabe (environ 15 000 mots). Le traducteur doit s\'assurer de l\'adaptation culturelle et du respect de la terminologie technique du secteur.',
      category: 'translation',
      budgetMin: 800,
      budgetMax: 1200,
      currency: 'EUR',
      duration: '2 weeks',
      skills: JSON.stringify(['Anglais', 'Français', 'Arabe', 'Traduction web', 'Adaptation culturelle']),
      status: 'open',
    },
    {
      userId: 'demo-client-5',
      title: 'Dashboard数据分析可视化',
      description: 'Développement d\'un tableau de bord interactif pour la visualisation de données commerciales. Sources : API REST + CSV. Graphiques : ventes mensuelles, taux de conversion, répartition géographique. Stack : React + D3.js ou Chart.js. L\'outil doit supporter l\'export PDF.',
      category: 'data',
      budgetMin: 1500,
      budgetMax: 3000,
      currency: 'EUR',
      duration: '1 month',
      skills: JSON.stringify(['React', 'D3.js', 'Python', 'Pandas', 'API REST', 'Data Visualization']),
      status: 'open',
    },
    {
      userId: 'demo-client-6',
      title: 'Rédaction e-book leadership & management',
      description: 'Rédaction d\'un e-book de 60-80 pages sur les tendances modernes du leadership et du management. Contenu structuré avec études de cas, exercices pratiques et outils téléchargeables. Ton professionnel mais accessible.',
      category: 'writing',
      budgetMin: 1000,
      budgetMax: 1800,
      currency: 'EUR',
      duration: '1 month',
      skills: JSON.stringify(['Rédaction', 'Recherche', 'Management', 'Leadership', 'Mise en page']),
      status: 'open',
    },
    {
      userId: 'demo-client-7',
      title: 'Vidéo promo produit SaaS (60s)',
      description: 'Production d\'une vidéo promotionnelle de 60 secondes pour un produit SaaS B2B. Script fourni, motion design avec infographie animée, voix-off professionnelle. Format : 16:9 HD + version verticale pour réseaux sociaux.',
      category: 'video',
      budgetMin: 2000,
      budgetMax: 3500,
      currency: 'EUR',
      duration: '2 weeks',
      skills: JSON.stringify(['After Effects', 'Motion Design', 'Illustration', 'Storytelling', 'Voix-off']),
      status: 'open',
    },
    {
      userId: 'demo-client-8',
      title: 'Audit sécurité applicatif + recommandations',
      description: 'Audit de sécurité complet d\'une application web (authentification, autorisations, protection des données, API). Rapport détaillé avec classification des vulnérabilités (critique/haute/moyenne/basse) et plan d\'action priorisé.',
      category: 'consulting',
      budgetMin: 3000,
      budgetMax: 6000,
      currency: 'EUR',
      duration: '2 weeks',
      skills: JSON.stringify(['Sécurité web', 'OWASP', 'Pentest', 'Authentification', 'API Security']),
      status: 'open',
    },
  ]

  await db.freelanceMission.createMany({ data: demoMissions })
}

export async function GET(req: NextRequest) {
  try {
    await seedDemoMissions()

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category') || ''
    const budget = searchParams.get('budget') || ''
    const duration = searchParams.get('duration') || ''
    const keyword = searchParams.get('keyword') || ''
    const featured = searchParams.get('featured') === 'true'

    const where: Record<string, unknown> = { status: 'open' }

    if (category && category !== 'all') {
      where.category = category
    }

    if (budget) {
      const [min, max] = budget.split('-').map(Number)
      if (max) {
        where.AND = [
          { budgetMin: { lte: max } },
          { budgetMax: { gte: min } },
        ]
      } else {
        where.budgetMin = { gte: min }
      }
    }

    if (duration) {
      where.duration = duration
    }

    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
        { skills: { contains: keyword } },
      ]
    }

    let missions = await db.freelanceMission.findMany({
      where,
      include: {
        user: { select: { name: true, companyName: true, image: true } },
        _count: { select: { proposals: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: featured ? 4 : 50,
    })

    // Simulate client names for demo data
    missions = missions.map(m => ({
      ...m,
      user: m.user?.name
        ? m.user
        : { name: getClientName(m.userId), companyName: m.user?.companyName || null, image: null },
    }))

    return NextResponse.json({ missions })
  } catch (error) {
    console.error('Freelance missions GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch missions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
    }

    const body = await req.json()
    const { title, description, category, budgetMin, budgetMax, currency, duration, skills } = body

    if (!title || !description || !budgetMin || !budgetMax || !skills) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const mission = await db.freelanceMission.create({
      data: {
        userId: 'demo-client-1',
        title,
        description,
        category: category || 'tech',
        budgetMin,
        budgetMax,
        currency: currency || 'EUR',
        duration: duration || '',
        skills: typeof skills === 'string' ? skills : JSON.stringify(skills),
      },
    })

    return NextResponse.json({ mission }, { status: 201 })
  } catch (error) {
    console.error('Freelance missions POST error:', error)
    return NextResponse.json({ error: 'Failed to create mission' }, { status: 500 })
  }
}

function getClientName(userId: string): string {
  const names: Record<string, string> = {
    'demo-client-1': 'TechCorp SAS',
    'demo-client-2': 'FinanceLab',
    'demo-client-3': 'GrowthAgency',
    'demo-client-4': 'GlobalConnect',
    'demo-client-5': 'DataViz Inc.',
    'demo-client-6': 'Editions Pro',
    'demo-client-7': 'CreativeStudio',
    'demo-client-8': 'SecureNet',
  }
  return names[userId] || 'Entreprise'
}
