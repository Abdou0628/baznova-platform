import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { GeneratedCV } from '@/store/cv-store'
import { withAuth, secureAIInput, validateAIOutput, checkAIAbuseLimit, logAIEvent, forwardToSIEM, createSIEMEvent } from '@/lib/hnsa'
import { encryptBeforeWrite } from '@/lib/hnsa/encryption-middleware'
import { scanInput, logSecurityEvent } from '@/lib/security'

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP
  return '127.0.0.1'
}

const FREE_MONTHLY_LIMIT = 3

async function checkUsageLimit(userId?: string): Promise<{ allowed: boolean; remaining: number }> {
  if (!userId) return { allowed: false, remaining: 0 }
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return { allowed: false, remaining: 0 }
  if (user.plan === 'free') return { allowed: false, remaining: 0 }
  if (user.plan === 'pro' || user.plan === 'annual' || user.plan === 'lifetime') return { allowed: true, remaining: Infinity }
  return { allowed: false, remaining: 0 }
}

const langMap: Record<string, string> = {
  fr: 'français',
  en: 'anglais',
  ar: 'arabe',
  es: 'espagnol',
}

const langInstructions: Record<string, string> = {
  fr: `Rédige le CV entièrement en français. Utilise le "vous" de politesse si nécessaire. Le style doit être professionnel et concis. Utilise des verbes d'action au passé composé pour l'expérience.`,
  en: `Write the entire resume in English. Use a professional and concise style. Use action verbs in past tense for experience descriptions.`,
  ar: `اكتب السيرة الذاتية بالكامل باللغة العربية. استخدم أسلوباً احترافياً ومختصراً. استخدم أفعال الحركة في الماضي لوصف الخبرات.`,
  es: `Escribe el currículum completo en español. Usa un estilo profesional y conciso. Usa verbos de acción en pasado para las descripciones de experiencia.`,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      fullName,
      email,
      phone,
      location,
      linkedin,
      website,
      targetJob,
      industry,
      experience,
      education,
      skills,
      languages,
      summary,
      softSkills,
      dateOfBirth,
      birthPlace,
      birthCountry,
      language,
    } = body

    // Input security scan on all text fields
    const fieldsToScan = [fullName, email, targetJob, experience, education, skills, summary, softSkills]
    for (const field of fieldsToScan) {
      if (field && typeof field === 'string') {
        const scan = scanInput(field)
        if (!scan.isClean) {
          await logSecurityEvent({
            type: scan.sqlInjection ? 'sql_injection_attempt' : 'xss_attempt',
            severity: 'high',
            ip: getClientIP(request),
            path: '/api/generate-cv',
            method: 'POST',
            userAgent: request.headers.get('user-agent') || undefined,
            details: { field, sqlInjection: scan.sqlInjection, xss: scan.xss },
          }).catch(() => {})
          return NextResponse.json(
            { error: 'Invalid input detected' },
            { status: 400 }
          )
        }
      }
    }

    // Auth check
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { error: 'Vous devez créer un compte et souscrire à un abonnement pour générer un CV.', code: 'AUTH_REQUIRED' },
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
    const userText = [fullName, experience, education, skills, summary, targetJob].filter(Boolean).join(' ')
    const secured = secureAIInput(userText, userId)
    if (secured.blocked) {
      return NextResponse.json(
        { error: `Request blocked: ${secured.blockReason}`, code: 'AI_BLOCKED' },
        { status: 400 }
      )
    }

    const usage = await checkUsageLimit(userId)
    if (!usage.allowed) {
      return NextResponse.json(
        { error: 'Vous devez souscrire à un abonnement pour générer des CV. Choisissez un plan Pro ou Annuel.', code: 'SUBSCRIPTION_REQUIRED' },
        { status: 403 }
      )
    }

    if (!fullName || !email || !targetJob) {
      return NextResponse.json(
        { error: 'Nom, email et poste visé sont requis' },
        { status: 400 }
      )
    }

    const langName = langMap[language] || 'français'
    const langInstr = langInstructions[language] || langInstructions.fr

    const prompt = `Tu es un expert en rédaction de CV professionnels et un coach de carrière. Tu dois créer un CV exceptionnel pour le candidat suivant.

${langInstr}

INFORMATIONS DU CANDIDAT :
- Nom complet : ${fullName}
- Email : ${email}
${phone ? `- Téléphone : ${phone}` : ''}
${location ? `- Localisation : ${location}` : ''}
${linkedin ? `- LinkedIn : ${linkedin}` : ''}
${website ? `- Site web : ${website}` : ''}
${dateOfBirth ? `- Date de naissance : ${dateOfBirth}` : ''}
${birthPlace ? `- Lieu de naissance : ${birthPlace}` : ''}
${birthCountry ? `- Pays de naissance : ${birthCountry}` : ''}

POSTE VISÉ : ${targetJob}
${industry ? `SECTEUR : ${industry}` : ''}

EXPÉRIENCE PROFESSIONNELLE :
${experience || 'Aucune information fournie - génère un profil adapté au poste visé'}

FORMATION :
${education || 'Aucune information fournie - suggère une formation pertinente'}

COMPÉTENCES :
${skills || 'Aucune information fournie - suggère des compétences pertinentes pour le poste'}

LANGUES :
${languages || 'Aucune information fournie'}

${softSkills ? `SOFT SKILLS / SAVOIR-ÊTRE :
${softSkills}` : ''}

${summary ? `RÉSUMÉ SOUHAITÉ PAR LE CANDIDAT : ${summary}` : ''}

INSTRUCTIONS DE FORMATAGE :
- Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après
- Structure le JSON exactement comme suit :
{
  "summary": "Un paragraphe professionnel de 3-4 lignes qui met en valeur le candidat",
  "experience": [
    {
      "title": "Titre du poste",
      "company": "Nom de l'entreprise",
      "period": "Mois Année - Mois Année",
      "description": "Description détaillée des responsabilités et réalisations (3-4 phrases avec des résultats concrets et des chiffres quand c'est possible)"
    }
  ],
  "education": [
    {
      "degree": "Nom du diplôme",
      "school": "Nom de l'établissement",
      "period": "Année - Année",
      "description": "Description courte du programme et distinctions éventuelles"
    }
  ],
  "skills": ["Compétence 1", "Compétence 2", "Compétence 3"],
  "softSkills": ["Soft Skill 1", "Soft Skill 2", "Soft Skill 3"],
  "languages": [
    {"name": "Français", "level": "Natif"}
  ]
}

RÈGLES :
- Le CV doit être optimisé pour les systèmes ATS (mots-clés du secteur)
- Chaque expérience doit inclure des résultats mesurables
- Les compétences doivent être pertinentes pour le poste visé
- Le résumé doit être accrocheur et unique
- Si le candidat n'a pas d'expérience, crée un profil adapté en valorisant la formation et les compétences transférables
- Si le candidat a fourni peu d'informations, enrichis le CV avec des détails réalistes et professionnels adaptés au poste visé
- La langue du CV doit être : ${langName}`

    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content:
            'Tu es un expert en rédaction de CV professionnels. Tu produis uniquement du JSON valide, sans aucun texte supplémentaire.',
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
        { error: 'Erreur lors de la génération du CV' },
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
        details: { piiTypes: outputCheck.piiTypes, path: '/api/generate-cv' },
      }).catch(() => {})
    }

    // Extract JSON from response (in case there's markdown wrapping)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      content = jsonMatch[0]
    }

    let generatedCV: GeneratedCV
    try {
      generatedCV = JSON.parse(content)
    } catch {
      return NextResponse.json(
        { error: 'Erreur de format dans la réponse IA' },
        { status: 500 }
      )
    }

    // Save to database — encrypt sensitive fields before write
    try {
      const resumeData = encryptBeforeWrite({
          userId: userId || null,
          fullName,
          email,
          phone: phone || null,
          location: location || null,
          linkedin: linkedin || null,
          website: website || null,
          targetJob,
          industry: industry || null,
          experience,
          education,
          skills,
          languages,
          summary: summary || null,
          softSkills: softSkills || null,
          dateOfBirth: dateOfBirth || null,
          birthPlace: birthPlace || null,
          birthCountry: birthCountry || null,
          language,
          generatedContent: JSON.stringify(generatedCV),
        })
      await db.resume.create({ data: resumeData })
    } catch (encErr) {
      forwardToSIEM(createSIEMEvent({
        type: 'FIELD_ENCRYPTION_ERROR',
        severity: 'critical',
        path: '/api/generate-cv',
        userId,
        metadata: { error: encErr instanceof Error ? encErr.message : String(encErr) },
      })).catch(() => {})
      // Re-throw to trigger the outer 500 handler
      throw encErr
    }

    // Increment usage counter for free users
    if (userId && usage.remaining !== Infinity) {
      await db.user.update({
        where: { id: userId },
        data: { cvCountThisMonth: { increment: 1 } },
      })
    }

    return NextResponse.json({ success: true, cv: generatedCV, remaining: usage.remaining === Infinity ? -1 : usage.remaining - 1 })
  } catch (error) {
    console.error('Error generating CV:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
