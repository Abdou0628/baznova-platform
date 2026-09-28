import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'
import type { CVLanguage, PersonaType } from '@/lib/i18n'

const langInstructions: Record<string, string> = {
  fr: `Rédige la demande d'emploi entièrement en français. Utilise un ton professionnel et adapté au profil du candidat.`,
  en: `Write the entire job application in English. Use a professional tone adapted to the candidate's profile.`,
  ar: `اكتب طلب التوظيف بالكامل باللغة العربية. استخدم نبرة مهنية ملائمة لملف المرشح.`,
  es: `Escribe la solicitud de empleo completa en español. Usa un tono profesional adaptado al perfil del candidato.`,
}

const personaInstructions: Record<string, string> = {
  student: `PROFIL : ÉTUDIANT
- Focus sur le potentiel, les projets académiques, la motivation et la disponibilité pour un stage ou premier emploi.
- Mets en avant les compétences acquises via les projets universitaires, le bénévolat et les activités parascolaires.
- Souligne l'envie d'apprendre, la capacité d'adaptation et l'énergie du candidat.
- Ne mentionne PAS le manque d'expérience comme un défaut — transforme-le en atout (fraîcheur, nouvelles compétences, etc.).`,

  graduate: `PROFIL : JEUNE DIPLÔMÉ
- Focus sur la transition académique vers le monde professionnel, la valeur du diplôme et l'envie de contribuer.
- Mets en avant le mémoire/thèse, les projets académiques significatifs et les stages.
- Valorise les compétences transférables et la capacité à appliquer les connaissances théoriques.
- Souligne la rigueur acquise lors des études et la motivation à démarrer une carrière.`,

  professional: `PROFIL : PROFESSIONNEL EXPÉRIMENTÉ
- Focus sur la valeur de l'expérience actuelle, la progression de carrière et les réalisations spécifiques.
- Mets en avant les résultats mesurables (chiffres, KPIs, pourcentages) pour chaque expérience.
- Démontre une expertise approfondie et une capacité à avoir un impact immédiat.
- Souligne la progression logique de la carrière et les compétences de leadership.`,

  executive: `PROFIL : CADRE DIRIGEANT (C-SUITE)
- Focus sur la vision stratégique, le leadership, l'impact P&L et le positionnement au niveau du conseil d'administration.
- Mets en avant la gestion d'équipes larges, les budgets significatifs et les transformations réussies.
- Démontre une capacité à influencer la stratégie de l'entreprise et à livrer des résultats au niveau du conseil.
- Utilise un ton formel et une posture de leader. Évite les détails opérationnels — reste au niveau stratégique.`,

  freelance: `PROFIL : FREELANCE / INDEPÉNDANT
- Focus sur le portfolio, les résultats de projets, la flexibilité et le modèle d'engagement/tarification.
- Mets en avant les missions réussies, les clients notables et les livrables concrets.
- Souligne l'autonomie, la polyvalence et la capacité à livrer des résultats rapidement.
- Indique clairement la spécialisation, la disponibilité et le modèle de collaboration proposé.`,

  expat: `PROFIL : EXPATRIÉ / MOBILITÉ INTERNATIONALE
- Focus sur l'expérience internationale, l'adaptabilité culturelle, le statut visa et la préparation à la relocalisation.
- Mets en avant la maîtrise de langues étrangères et l'expérience dans des contextes multiculturels.
- Souligne la capacité à s'adapter rapidement à de nouveaux environnements professionnels.
- Mentionne le statut visa/permis de travail et la disposition à déménager.`,
}

interface AppFormData {
  company: string
  position: string
  hiringManager: string
  appType: string
  availability: string
  salary: string
  additionalInfo: string
  personaFields: Record<string, string>
}

export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.reason },
        { status: auth.statusCode }
      )
    }

    const body = await request.json()
    const {
      persona,
      formData,
      appFormData,
      language,
      generatedCVContent,
    } = body as {
      persona: PersonaType
      formData: {
        fullName: string
        email: string
        phone: string
        address: string
        location: string
        targetJob: string
        industry: string
        skills: string
        languages: string
      }
      appFormData: AppFormData
      language: CVLanguage
      generatedCVContent: string
    }

    if (!persona || !formData?.fullName || !appFormData?.company || !appFormData?.position) {
      return NextResponse.json(
        { error: 'Missing required fields: persona, fullName, company, position' },
        { status: 400 }
      )
    }

    const langInstr = langInstructions[language] || langInstructions.fr
    const personaInstr = personaInstructions[persona] || personaInstructions.professional

    // Build persona fields section
    const personaFieldsSection = appFormData.personaFields
      ? Object.entries(appFormData.personaFields)
          .filter(([, v]) => v && v.trim())
          .map(([k, v]) => `- ${k}: ${v}`)
          .join('\n')
      : ''

    const appTypeLabel = appFormData.appType || 'Non spécifié'

    const prompt = `Tu es un expert en rédaction de demandes d'emploi professionnelles et un coach de carrière. Tu dois créer une demande d'emploi exceptionnelle et personnalisée.

${langInstr}

${personaInstr}

INFORMATIONS DU CANDIDAT :
- Nom complet : ${formData.fullName}
- Email : ${formData.email || 'Non fourni'}
- Téléphone : ${formData.phone || 'Non fourni'}
- Adresse : ${formData.address || 'Non fournie'}
- Localisation : ${formData.location || 'Non fournie'}
- Secteur d'activité : ${formData.industry || 'Non fourni'}
- Compétences : ${formData.skills || 'Non fournies'}
- Langues : ${formData.languages || 'Non fournies'}

${personaFieldsSection ? `INFORMATIONS SPÉCIFIQUES AU PROFIL :\n${personaFieldsSection}` : ''}

INFORMATIONS SUR LA CANDIDATURE :
- Entreprise cible : ${appFormData.company}
- Poste visé : ${appFormData.position}
- Responsable du recrutement : ${appFormData.hiringManager || 'Non spécifié'}
- Type de candidature : ${appTypeLabel}
${appFormData.availability ? `- Disponibilité : ${appFormData.availability}` : ''}
${appFormData.salary ? `- Prétentions salariales : ${appFormData.salary}` : ''}
${appFormData.additionalInfo ? `- Informations complémentaires : ${appFormData.additionalInfo}` : ''}

CONTENU DU CV GÉNÉRÉ (pour référence) :
${generatedCVContent || 'Non disponible'}

INSTRUCTIONS DE FORMATAGE :
- Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après
- Structure le JSON exactement comme suit :
{
  "subject": "Objet de la demande d'emploi (ligne d'objet pour email, max 100 caractères)",
  "header": "En-tête formel avec nom du candidat, coordonnées, et date",
  "body": "Corps de la demande d'emploi (3-5 paragraphes bien structurés qui couvrent : introduction, motivation, valeur ajoutée, adéquation avec le poste, et conclusion)",
  "closing": "Paragraphe de conclusion avec appel à l'action (demande d'entretien, disponibilité)",
  "signOff": "Formule de politesse finale et signature"
}

RÈGLES :
- La demande doit être personnalisée pour l'entreprise ${appFormData.company} et le poste de ${appFormData.position}
- Adapte le ton au profil ${persona}
- Utilise des informations spécifiques du CV généré pour renforcer la demande
- Le "subject" doit être accrocheur et professionnel
- Le "body" doit être convaincant, avec des références précises aux compétences et expériences du candidat
- Inclue pourquoi le candidat est intéressé par cette entreprise en particulier
- La demande doit refléter les valeurs d'égalité des chances
- La langue doit être : ${language}`

    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content:
            'Tu es un expert en rédaction de demandes d\'emploi professionnelles. Tu produis uniquement du JSON valide, sans aucun texte supplémentaire.',
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
        { error: 'Error generating job application' },
        { status: 500 }
      )
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      content = jsonMatch[0]
    }

    let application
    try {
      application = JSON.parse(content)
    } catch {
      return NextResponse.json(
        { error: 'Invalid AI response format' },
        { status: 500 }
      )
    }

    // Validate required fields
    if (!application.subject || !application.body) {
      return NextResponse.json(
        { error: 'Incomplete application generated' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      application: {
        subject: application.subject || '',
        header: application.header || '',
        body: application.body || '',
        closing: application.closing || '',
        signOff: application.signOff || '',
      },
    })
  } catch (error) {
    console.error('Error generating job application:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
