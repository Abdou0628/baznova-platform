import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'
import ZAI from 'z-ai-web-dev-sdk'

const zai = ZAI.create()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: { code: 401, message: 'Auth requis' } },
        { status: auth.statusCode }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { candidateName, candidateEmail, coverNote } = body

    if (!candidateName || !candidateEmail) {
      return NextResponse.json(
        { success: false, error: { code: 400, message: 'Nom et email sont requis' } },
        { status: 400 }
      )
    }

    // Check job exists
    const job = await db.globalJobListing.findUnique({
      where: { id },
    })

    if (!job) {
      return NextResponse.json(
        { success: false, error: { code: 404, message: 'Offre non trouvée' } },
        { status: 404 }
      )
    }

    // Check for duplicate application
    const existing = await db.globalApplication.findFirst({
      where: {
        jobId: id,
        candidateEmail,
      },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 409, message: 'Vous avez déjà postulé à cette offre' } },
        { status: 409 }
      )
    }

    // Use ZAI to calculate match score
    let matchScore = 50
    let matchAnalysis = 'Analyse non disponible'

    try {
      const analysisPrompt = `Tu es un expert en recrutement international. Analyse la compatibilité entre un candidat et une offre d'emploi.

OFFRE D'EMPLOI:
Titre: ${job.title}
Entreprise: ${job.company}
Pays: ${job.country}
Description: ${job.description}
Exigences: ${job.requirements}
Compétences requises: ${job.skills || 'Non spécifié'}
Type: ${job.type}

CANDIDAT:
Nom: ${candidateName}
Email: ${candidateEmail}
Lettre de motivation / Notes: ${coverNote || 'Non fourni'}

Réponds UNIQUEMENT en JSON valide (pas de markdown, pas de backticks):
{
  "matchScore": <nombre entre 0 et 100>,
  "matchAnalysis": "<analyse concise en 2-3 phrases expliquant le score>"
}`

      const res = await zai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Tu es un expert en recrutement. Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks.' },
          { role: 'user', content: analysisPrompt },
        ],
        temperature: 0.3,
        max_tokens: 300,
      })

      const content = res.choices?.[0]?.message?.content || ''
      // Try to parse JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        matchScore = Math.min(100, Math.max(0, parseInt(parsed.matchScore) || 50))
        matchAnalysis = parsed.matchAnalysis || matchAnalysis
      }
    } catch (aiError) {
      console.error('AI match analysis failed:', aiError)
    }

    // Create application
    const application = await db.globalApplication.create({
      data: {
        jobId: id,
        candidateName,
        candidateEmail,
        coverNote,
        matchScore,
        matchAnalysis,
      },
    })

    // Update job's applications count
    await db.globalJobListing.update({
      where: { id },
      data: { applicationsCount: { increment: 1 } },
    })

    return NextResponse.json({
      success: true,
      application,
      matchScore,
      matchAnalysis,
    })
  } catch (error) {
    console.error('Error applying to global job:', error)
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur lors de la candidature' } },
      { status: 500 }
    )
  }
}
