import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, secureAIInput, validateAIOutput, checkAIAbuseLimit, logAIEvent } from '@/lib/hnsa'
import { scanInput, logSecurityEvent } from '@/lib/security'

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP
  return '127.0.0.1'
}

const PAID_PLANS = ['pro', 'annual', 'lifetime']

const langMap: Record<string, string> = {
  fr: 'français',
  en: 'anglais',
  ar: 'arabe',
  es: 'espagnol',
}

const analysisLangInstructions: Record<string, string> = {
  fr: `Analyse le CV et rédige TOUS tes retours en français. Utilise le "vous" de politesse.`,
  en: `Analyze the resume and write ALL your feedback in English.`,
  ar: `قم بتحليل السيرة الذاتية واكتب جميع ملاحظاتك باللغة العربية.`,
  es: `Analiza el currículum y escribe TODOS tus comentarios en español.`,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      generatedCV,
      targetJob,
      industry,
      language,
      formData,
    } = body

    // Input security scan
    if (targetJob && typeof targetJob === 'string') {
      const scan = scanInput(targetJob)
      if (!scan.isClean) {
        await logSecurityEvent({
          type: scan.sqlInjection ? 'sql_injection_attempt' : 'xss_attempt',
          severity: 'high',
          ip: getClientIP(request),
          path: '/api/analyze-ats',
          method: 'POST',
          userAgent: request.headers.get('user-agent') || undefined,
          details: { field: 'targetJob', sqlInjection: scan.sqlInjection, xss: scan.xss },
        }).catch(() => {})
        return NextResponse.json(
          { error: 'Invalid input detected' },
          { status: 400 }
        )
      }
    }

    // Auth check
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.reason, code: 'AUTH_REQUIRED' },
        { status: auth.statusCode }
      )
    }
    const userId = auth.userId!

    // --- HNSA AI Security Gateway ---
    const aiCheck = checkAIAbuseLimit(userId)
    if (!aiCheck.allowed) {
      return NextResponse.json(
        { error: 'AI rate limit exceeded. Please try again later.', code: 'AI_RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(aiCheck.retryAfterMs / 1000)) } }
      )
    }

    // Combine user text inputs for scanning
    const userText = [targetJob, typeof generatedCV === 'string' ? generatedCV : JSON.stringify(generatedCV)].filter(Boolean).join(' ')
    const secured = secureAIInput(userText, userId)
    if (secured.blocked) {
      return NextResponse.json(
        { error: `Request blocked: ${secured.blockReason}`, code: 'AI_BLOCKED' },
        { status: 400 }
      )
    }

    // Subscription check
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user || !PAID_PLANS.includes(user.plan)) {
      return NextResponse.json(
        { error: 'Abonnement actif requis pour l\'analyse ATS.', code: 'SUBSCRIPTION_REQUIRED' },
        { status: 403 }
      )
    }

    if (!generatedCV || !targetJob) {
      return NextResponse.json(
        { error: 'CV et poste visé sont requis pour l\'analyse ATS.' },
        { status: 400 }
      )
    }

    const langInstr = analysisLangInstructions[language] || analysisLangInstructions.fr
    const langName = langMap[language] || 'français'

    const cvText = `
RÉSUMÉ: ${generatedCV.summary || 'Aucun'}
EXPÉRIENCES:
${generatedCV.experience?.map((e: { title: string; company: string; period: string; description: string }) => `- ${e.title} chez ${e.company} (${e.period}): ${e.description}`).join('\n') || 'Aucune expérience'}
FORMATION:
${generatedCV.education?.map((e: { degree: string; school: string; period: string; description: string }) => `- ${e.degree} - ${e.school} (${e.period}): ${e.description}`).join('\n') || 'Aucune formation'}
COMPÉTENCES: ${generatedCV.skills?.join(', ') || 'Aucune'}
LANGUES: ${generatedCV.languages?.map((l: { name: string; level: string }) => `${l.name} (${l.level})`).join(', ') || 'Aucune'}
    `.trim()

    const prompt = `Tu es un expert en systèmes ATS (Applicant Tracking Systems) et en optimisation de CV pour le recrutement. Tu dois analyser en profondeur le CV suivant et fournir un score ATS détaillé en pourcentage.

${langInstr}

CV À ANALYSER (langue: ${langName}) :
${cvText}

POSTE VISÉ : ${targetJob}
${industry ? `SECTEUR : ${industry}` : ''}
${formData?.softSkills ? `SOFT SKILLS: ${formData.softSkills}` : ''}

INSTRUCTIONS :
- Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après
- Le score global doit être un pourcentage entre 40% et 95%
- Chaque catégorie doit avoir un score individuel entre 30% et 100%
- Fournis 4 à 6 suggestions concrètes et actionnables en ${langName}
- Utilise des critères réels d'évaluation ATS (mots-clés, structure, impact, etc.)

STRUCTURE JSON EXACTE :
{
  "overallScore": 78,
  "categories": [
    {
      "name": "keywords_seo",
      "score": 82,
      "description": "Courte description en ${langName} de la pertinence des mots-clés"
    },
    {
      "name": "structure_format",
      "score": 75,
      "description": "Courte description en ${langName} de la structure et du formatage"
    },
    {
      "name": "experience_impact",
      "score": 80,
      "description": "Courte description en ${langName} de la qualité de l'expérience"
    },
    {
      "name": "skills_match",
      "score": 70,
      "description": "Courte description en ${langName} de l'adéquation des compétences"
    },
    {
      "name": "readability",
      "score": 85,
      "description": "Courte description en ${langName} de la lisibilité"
    }
  ],
  "suggestions": [
    "Suggestion 1 en ${langName} - action concrète",
    "Suggestion 2 en ${langName}",
    "Suggestion 3 en ${langName}",
    "Suggestion 4 en ${langName}"
  ]
}

RÈGLES D'ÉVALUATION :
- keywords_seo: Les mots-clés du CV correspondent-ils au poste visé ? Y a-t-il des termes ATS importants manquants ?
- structure_format: Le CV est-il bien structuré pour les parsers ATS ? Sections claires, ordre logique, absence de tableaux/images complexes ?
- experience_impact: Les descriptions incluent-elles des résultats mesurables, des chiffres, des verbes d'action ? Montrent-elles un impact réel ?
- skills_match: Les compétences listées sont-elles pertinentes pour le poste ? Y a-t-il un bon équilibre entre compétences techniques et soft skills ?
- readability: Le CV est-il clair, concis et professionnel ? Longueur appropriée, phrases courtes, pas de jargon excessif ?`

    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content:
            'Tu es un expert en systèmes ATS. Tu analyses les CV et produit UNIQUEMENT du JSON valide, sans texte supplémentaire.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      thinking: { type: 'disabled' },
    })

    let content = completion.choices[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { error: 'Erreur lors de l\'analyse ATS.' },
        { status: 500 }
      )
    }

    // --- HNSA AI Output Validation ---
    const outputCheck = validateAIOutput(content, userId)
    if (outputCheck.hasPII) {
      logAIEvent({
        userId,
        eventType: 'PII_IN_OUTPUT',
        input: userText,
        output: content,
        blocked: false,
        details: { piiTypes: outputCheck.piiTypes, path: '/api/analyze-ats' },
      }).catch(() => {})
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      content = jsonMatch[0]
    }

    let atsResult
    try {
      atsResult = JSON.parse(content)
    } catch {
      return NextResponse.json(
        { error: 'Erreur de format dans la réponse IA.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, result: atsResult })
  } catch (error) {
    console.error('Error analyzing ATS:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur.' },
      { status: 500 }
    )
  }
}
