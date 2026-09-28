import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// ─── Types ──────────────────────────────────────────────────────────────────

interface DimensionScore {
  key: string
  label: string
  score: number
  description: string
}

interface Recommendation {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  dimension: string
  impact: number
}

interface TimelineEntry {
  id: string
  type: 'resume' | 'cover_letter' | 'application' | 'global_application' | 'mobility'
  title: string
  date: string
  status?: string
  score?: number | null
}

interface NextStep {
  id: string
  action: string
  description: string
  priority: number
  dimension: string
}

interface LevelInfo {
  level: string
  levelColor: string
}

// ─── Level mapping ──────────────────────────────────────────────────────────

function getLevelInfo(score: number): LevelInfo {
  if (score >= 90) return { level: 'Expert', levelColor: '#10B981' }
  if (score >= 75) return { level: 'Avancé', levelColor: '#3B82F6' }
  if (score >= 55) return { level: 'Intermédiaire', levelColor: '#F59E0B' }
  if (score >= 30) return { level: 'En développement', levelColor: '#F97316' }
  return { level: 'Débutant', levelColor: '#EF4444' }
}

// ─── Dimension labels (French) ─────────────────────────────────────────────

const DIMENSION_LABELS: Record<string, string> = {
  personalInfo: 'Informations personnelles',
  professionalSummary: 'Résumé professionnel',
  experience: 'Expérience',
  education: 'Formation',
  skills: 'Compétences',
  languages: 'Langues',
  documents: 'Documents',
  applications: 'Candidatures',
  mobility: 'Mobilité internationale',
}

const DIMENSION_DESCRIPTIONS: Record<string, string> = {
  personalInfo: 'Nom, email, téléphone et localisation complétés',
  professionalSummary: 'Un résumé professionnel détaillé et percutant',
  experience: 'Historique professionnel complet et structuré',
  education: 'Diplômes et formations documentés',
  skills: 'Compétences techniques identifiées',
  languages: 'Langues parlées et niveaux de maîtrise',
  documents: 'CV et lettres de motivation générés',
  applications: 'Candidatures envoyées à des offres d\'emploi',
  mobility: 'Profils de mobilité internationale complétés',
}

// ─── Recommendation engine (static, based on lowest-scoring dimensions) ────

function generateRecommendations(
  dimensions: Record<string, number>,
  hasResumes: boolean,
  hasCoverLetters: boolean,
  totalApplications: number
): Recommendation[] {
  const recs: Recommendation[] = []

  // Find weakest dimensions (sorted ascending by score)
  const sorted = Object.entries(dimensions).sort((a, b) => a[1] - b[1])

  for (const [key, score] of sorted) {
    if (score >= 90) continue // already strong

    switch (key) {
      case 'personalInfo':
        if (score < 50) {
          recs.push({
            id: 'rec-personal',
            title: 'Complétez vos informations de contact',
            description: 'Ajoutez votre nom, numéro de téléphone et ville pour que les recruteurs puissent vous joindre facilement.',
            priority: score < 25 ? 'high' : 'medium',
            dimension: 'personalInfo',
            impact: 15,
          })
        }
        break

      case 'professionalSummary':
        if (score < 50) {
          recs.push({
            id: 'rec-summary',
            title: 'Rédigez un résumé professionnel',
            description: 'Un bon résumé (150-300 mots) met en valeur vos forces et accroche le recruteur dès les premières lignes.',
            priority: 'high',
            dimension: 'professionalSummary',
            impact: 18,
          })
        } else if (score < 90) {
          recs.push({
            id: 'rec-summary-optimize',
            title: 'Optimisez votre résumé professionnel',
            description: 'Enrichissez votre résumé avec des chiffres concrets et des réalisations mesurables.',
            priority: 'medium',
            dimension: 'professionalSummary',
            impact: 10,
          })
        }
        break

      case 'experience':
        if (score < 50) {
          recs.push({
            id: 'rec-experience',
            title: 'Décrivez vos expériences professionnelles',
            description: 'Détaillez vos postes, responsabilités et réalisations pour chaque expérience significative.',
            priority: 'high',
            dimension: 'experience',
            impact: 20,
          })
        } else if (score < 90) {
          recs.push({
            id: 'rec-experience-deepen',
            title: 'Approfondissez vos descriptions d\'expérience',
            description: 'Ajoutez des résultats quantifiables et des responsabilités spécifiques pour renforcer votre profil.',
            priority: 'medium',
            dimension: 'experience',
            impact: 12,
          })
        }
        break

      case 'education':
        if (score < 50) {
          recs.push({
            id: 'rec-education',
            title: 'Ajoutez vos diplômes et formations',
            description: 'Listez vos diplômes, certifications et formations pertinentes pour votre secteur.',
            priority: 'medium',
            dimension: 'education',
            impact: 12,
          })
        }
        break

      case 'skills':
        if (score < 50) {
          recs.push({
            id: 'rec-skills',
            title: 'Identifiez vos compétences techniques',
            description: 'Listez vos compétences clés (techniques, logiciels, méthodes) pour améliorer votre visibilité ATS.',
            priority: 'high',
            dimension: 'skills',
            impact: 20,
          })
        } else if (score < 90) {
          recs.push({
            id: 'rec-skills-expand',
            title: 'Élargissez votre panel de compétences',
            description: 'Ajoutez des compétences complémentaires et certifiez vos niveaux de maîtrise.',
            priority: 'medium',
            dimension: 'skills',
            impact: 10,
          })
        }
        break

      case 'languages':
        if (score < 50) {
          recs.push({
            id: 'rec-languages',
            title: 'Précisez vos langues',
            description: 'Indiquez les langues que vous parlez et votre niveau pour les opportunités internationales.',
            priority: 'low',
            dimension: 'languages',
            impact: 8,
          })
        }
        break

      case 'documents':
        if (!hasResumes) {
          recs.push({
            id: 'rec-cv',
            title: 'Générez votre premier CV',
            description: 'Utilisez le générateur de CV d\'HireNova pour créer un CV professionnel optimisé ATS.',
            priority: 'high',
            dimension: 'documents',
            impact: 25,
          })
        }
        if (!hasCoverLetters) {
          recs.push({
            id: 'rec-cl',
            title: 'Rédigez une lettre de motivation',
            description: 'Accompagnez vos candidatures d\'une lettre de motivation personnalisée pour augmenter vos chances.',
            priority: 'medium',
            dimension: 'documents',
            impact: 15,
          })
        }
        if (hasResumes && hasCoverLetters && score < 90) {
          recs.push({
            id: 'rec-docs-diversify',
            title: 'Diversifiez vos documents',
            description: 'Créez plusieurs versions de votre CV adaptées à différents types de postes.',
            priority: 'low',
            dimension: 'documents',
            impact: 8,
          })
        }
        break

      case 'applications':
        if (totalApplications === 0) {
          recs.push({
            id: 'rec-apply',
            title: 'Postulez à vos premières offres',
            description: 'Consultez les offres d\'emploi disponibles et soumettez vos premières candidatures.',
            priority: 'high',
            dimension: 'applications',
            impact: 25,
          })
        } else if (totalApplications < 5) {
          recs.push({
            id: 'rec-apply-more',
            title: 'Augmentez votre volume de candidatures',
            description: 'Postulez régulièrement à des offres pertinentes pour maximiser vos opportunités.',
            priority: 'medium',
            dimension: 'applications',
            impact: 15,
          })
        }
        break

      case 'mobility':
        if (score < 50) {
          recs.push({
            id: 'rec-mobility',
            title: 'Explorez la mobilité internationale',
            description: 'Utilisez HireNova Mobilité pour évaluer vos opportunités à l\'international et adapter votre CV.',
            priority: 'low',
            dimension: 'mobility',
            impact: 10,
          })
        }
        break
    }
  }

  // Ensure at least 3 recommendations
  if (recs.length < 3) {
    const defaultRecs: Recommendation[] = [
      {
        id: 'rec-network',
        title: 'Développez votre réseau professionnel',
        description: 'Participez à des événements, rejoignez des communautés professionnelles et misez sur LinkedIn.',
        priority: 'medium',
        dimension: 'personalInfo',
        impact: 10,
      },
      {
        id: 'rec-interview',
        title: 'Pratiquez les entretiens',
        description: 'Utilisez le simulateur d\'entretien d\'HireNova pour vous entraîner et gagner en confiance.',
        priority: 'medium',
        dimension: 'experience',
        impact: 12,
      },
      {
        id: 'rec-ats',
        title: 'Optimisez pour les ATS',
        description: 'Passez l\'analyse ATS pour vérifier que votre CV est bien détecté par les logiciels de recrutement.',
        priority: 'low',
        dimension: 'documents',
        impact: 10,
      },
    ]

    for (const def of defaultRecs) {
      if (!recs.find(r => r.id === def.id)) {
        recs.push(def)
        if (recs.length >= 5) break
      }
    }
  }

  // Sort by priority (high first) then by impact descending
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
  recs.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (pDiff !== 0) return pDiff
    return b.impact - a.impact
  })

  return recs.slice(0, 7)
}

// ─── Timeline builder ───────────────────────────────────────────────────────

function buildTimeline(
  resumes: { id: string; targetJob: string; createdAt: Date }[],
  coverLetters: { id: string; jobTitle: string; companyName: string; createdAt: Date }[],
  localApplications: { id: string; status: string; createdAt: Date; job: { title: string; company: string } | null }[],
  globalApplications: { id: string; status: string; createdAt: Date; job: { title: string; company: string; country: string } | null }[],
  mobilityProfiles: { id: string; targetCountry: string; targetRole: string; status: string; matchScore: number | null; createdAt: Date }[]
): TimelineEntry[] {
  const timeline: TimelineEntry[] = []

  for (const r of resumes) {
    timeline.push({
      id: `resume-${r.id}`,
      type: 'resume',
      title: `CV — ${r.targetJob}`,
      date: r.createdAt.toISOString(),
    })
  }

  for (const cl of coverLetters) {
    timeline.push({
      id: `cl-${cl.id}`,
      type: 'cover_letter',
      title: `Lettre — ${cl.jobTitle} chez ${cl.companyName}`,
      date: cl.createdAt.toISOString(),
    })
  }

  for (const app of localApplications) {
    timeline.push({
      id: `app-${app.id}`,
      type: 'application',
      title: `${app.job?.title ?? 'Poste'} chez ${app.job?.company ?? 'Entreprise'}`,
      date: app.createdAt.toISOString(),
      status: app.status,
    })
  }

  for (const app of globalApplications) {
    timeline.push({
      id: `gapp-${app.id}`,
      type: 'global_application',
      title: `${app.job?.title ?? 'Poste'} chez ${app.job?.company ?? 'Entreprise'} (${app.job?.country ?? ''})`,
      date: app.createdAt.toISOString(),
      status: app.status,
    })
  }

  for (const mp of mobilityProfiles) {
    timeline.push({
      id: `mob-${mp.id}`,
      type: 'mobility',
      title: `Mobilité → ${mp.targetCountry} (${mp.targetRole})`,
      date: mp.createdAt.toISOString(),
      status: mp.status,
      score: mp.matchScore,
    })
  }

  // Sort by date descending, take last 15
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return timeline.slice(0, 15)
}

// ─── Next steps builder ────────────────────────────────────────────────────

function buildNextSteps(
  dimensions: Record<string, number>,
  hasResumes: boolean,
  hasCoverLetters: boolean,
  totalApplications: number,
  hasMobility: boolean
): NextStep[] {
  const steps: NextStep[] = []
  let priority = 1

  // Always prioritize: have a CV first
  if (!hasResumes) {
    steps.push({
      id: 'step-cv',
      action: 'Créer votre premier CV',
      description: 'Générez un CV professionnel optimisé ATS avec le constructeur HireNova.',
      priority,
      dimension: 'documents',
    })
    priority++
  }

  // Then professional summary
  if (dimensions.professionalSummary < 50) {
    steps.push({
      id: 'step-summary',
      action: 'Rédiger votre résumé professionnel',
      description: 'Ajoutez un résumé percutant de 150-300 mots en haut de votre CV.',
      priority,
      dimension: 'professionalSummary',
    })
    priority++
  }

  // Complete personal info
  if (dimensions.personalInfo < 75) {
    steps.push({
      id: 'step-info',
      action: 'Compléter vos coordonnées',
      description: 'Ajoutez votre téléphone et votre localisation pour être joignable.',
      priority,
      dimension: 'personalInfo',
    })
    priority++
  }

  // Add experience
  if (dimensions.experience < 50) {
    steps.push({
      id: 'step-exp',
      action: 'Ajouter vos expériences',
      description: 'Décrivez vos postes précédents avec des réalisations concrètes.',
      priority,
      dimension: 'experience',
    })
    priority++
  }

  // Add skills
  if (dimensions.skills < 50) {
    steps.push({
      id: 'step-skills',
      action: 'Lister vos compétences',
      description: 'Identifiez vos compétences techniques et transversales.',
      priority,
      dimension: 'skills',
    })
    priority++
  }

  // Generate cover letter
  if (!hasCoverLetters && hasResumes) {
    steps.push({
      id: 'step-cl',
      action: 'Générer une lettre de motivation',
      description: 'Créez une lettre de motivation personnalisée pour vos candidatures.',
      priority,
      dimension: 'documents',
    })
    priority++
  }

  // Start applying
  if (totalApplications === 0 && hasResumes) {
    steps.push({
      id: 'step-apply',
      action: 'Postuler à des offres d\'emploi',
      description: 'Parcourez les offres locales et internationales et envoyez vos candidatures.',
      priority,
      dimension: 'applications',
    })
    priority++
  }

  // Explore mobility
  if (!hasMobility && dimensions.experience >= 50) {
    steps.push({
      id: 'step-mobility',
      action: 'Explorer la mobilité internationale',
      description: 'Découvrez vos options à l\'international avec HireNova Mobilité.',
      priority,
      dimension: 'mobility',
    })
    priority++
  }

  return steps.slice(0, 6)
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 401, message: 'Authentification requise' } },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // ── Fetch user ──────────────────────────────────────────────────────────
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        plan: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 404, message: 'Utilisateur non trouvé' } },
        { status: 404 }
      )
    }

    // ── Fetch all related data in parallel ──────────────────────────────────
    const [resumes, coverLetters, localApplications, globalApplications, mobilityProfiles] =
      await Promise.all([
        db.resume.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            location: true,
            targetJob: true,
            experience: true,
            education: true,
            skills: true,
            languages: true,
            summary: true,
            createdAt: true,
          },
        }),

        db.coverLetter.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            jobTitle: true,
            companyName: true,
            createdAt: true,
          },
        }),

        db.application.findMany({
          where: { candidateId: userId },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            status: true,
            createdAt: true,
            job: {
              select: { title: true, company: true },
            },
          },
        }),

        db.globalApplication.findMany({
          where: { candidateId: userId },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            status: true,
            createdAt: true,
            job: {
              select: { title: true, company: true, country: true },
            },
          },
        }),

        db.mobilityProfile.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            targetCountry: true,
            targetRole: true,
            matchScore: true,
            status: true,
            createdAt: true,
          },
        }),
      ])

    // ── Compute dimension scores (same logic as profile endpoint) ───────────
    const primaryResume = resumes.length > 0 ? resumes[0] : null

    const dimensions: Record<string, number> = {
      personalInfo: (() => {
        let s = 0, t = 0
        if (user.name?.trim()) { s += 25; } t += 25
        if (user.email?.trim()) { s += 25; } t += 25
        if (primaryResume?.phone?.trim()) { s += 25; } t += 25
        if (primaryResume?.location?.trim()) { s += 25; } t += 25
        return Math.round((s / t) * 100)
      })(),

      professionalSummary: (() => {
        if (!primaryResume?.summary?.trim()) return 0
        const len = primaryResume.summary.trim().length
        if (len < 30) return 20
        if (len < 80) return 50
        if (len < 200) return 80
        return 100
      })(),

      experience: (() => {
        if (!primaryResume?.experience?.trim()) return 0
        const len = primaryResume.experience.trim().length
        if (len < 50) return 20
        if (len < 150) return 50
        if (len < 400) return 80
        return 100
      })(),

      education: (() => {
        if (!primaryResume?.education?.trim()) return 0
        const len = primaryResume.education.trim().length
        if (len < 30) return 25
        if (len < 80) return 60
        if (len < 200) return 85
        return 100
      })(),

      skills: (() => {
        if (!primaryResume?.skills?.trim()) return 0
        const len = primaryResume.skills.trim().length
        if (len < 20) return 25
        if (len < 60) return 55
        if (len < 150) return 80
        return 100
      })(),

      languages: (() => {
        if (!primaryResume?.languages?.trim()) return 0
        const len = primaryResume.languages.trim().length
        if (len < 10) return 30
        if (len < 40) return 65
        return 100
      })(),

      documents: (() => {
        let s = 0
        if (resumes.length > 0) s += 50
        if (coverLetters.length > 0) s += 50
        return Math.min(s, 100)
      })(),

      applications: (() => {
        const total = localApplications.length + globalApplications.length
        if (total === 0) return 0
        if (total === 1) return 20
        if (total <= 3) return 50
        if (total <= 7) return 75
        return 100
      })(),

      mobility: (() => {
        if (mobilityProfiles.length === 0) return 0
        const completed = mobilityProfiles.filter(p => p.status === 'completed')
        if (completed.length === 0) return 30
        if (completed.length >= 2) return 100
        return 70
      })(),
    }

    // ── Overall score (weighted) ───────────────────────────────────────────
    const weights: Record<string, number> = {
      personalInfo: 0.10,
      professionalSummary: 0.10,
      experience: 0.15,
      education: 0.10,
      skills: 0.15,
      languages: 0.05,
      documents: 0.15,
      applications: 0.10,
      mobility: 0.10,
    }

    const overallScore = Math.round(
      Object.entries(dimensions).reduce(
        (sum, [key, value]) => sum + value * (weights[key] ?? 0),
        0
      )
    )

    // ── Level info ──────────────────────────────────────────────────────────
    const { level, levelColor } = getLevelInfo(overallScore)

    // ── Dimension details array ─────────────────────────────────────────────
    const dimensionsArray: DimensionScore[] = Object.entries(dimensions).map(
      ([key, score]) => ({
        key,
        label: DIMENSION_LABELS[key] ?? key,
        score,
        description: DIMENSION_DESCRIPTIONS[key] ?? '',
      })
    )

    // ── Recommendations ─────────────────────────────────────────────────────
    const recommendations = generateRecommendations(
      dimensions,
      resumes.length > 0,
      coverLetters.length > 0,
      localApplications.length + globalApplications.length
    )

    // ── Timeline ────────────────────────────────────────────────────────────
    const timeline = buildTimeline(
      resumes,
      coverLetters,
      localApplications,
      globalApplications,
      mobilityProfiles
    )

    // ── Next steps ──────────────────────────────────────────────────────────
    const nextSteps = buildNextSteps(
      dimensions,
      resumes.length > 0,
      coverLetters.length > 0,
      localApplications.length + globalApplications.length,
      mobilityProfiles.length > 0
    )

    return NextResponse.json({
      success: true,
      data: {
        overallScore,
        level,
        levelColor,
        dimensions: dimensionsArray,
        recommendations,
        timeline,
        nextSteps,
      },
    })
  } catch (error) {
    console.error('[career-intel/score] Error:', error)
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur interne du serveur' } },
      { status: 500 }
    )
  }
}
