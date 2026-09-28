import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

const COUNTRY_FORMATS: Record<string, string> = {
  France: `FORMAT CV POUR LA FRANCE 🇫🇷:
- Photo obligatoire (format passeport, professionnelle), placée en haut à droite
- 1-2 pages maximum
- Ordre des sections: État civil + Photo, Accroche/Profil, Expérience professionnelle, Formation, Compétences, Langues, Centres d'intérêt
- Pas de rubrique "Références" (déconseillé)
- Mentionner l'âge est toléré mais pas obligatoire
- Langue: Français
- Format papier: A4
- Style: Épuré, professionnel, police classique (Arial, Calibri, Garamond)
- Éviter: informations trop personnelles, âge, situation familiale`,

  UK: `FORMAT CV POUR LE ROYAUME-UNI 🇬🇧:
- PAS de photo (illégal et déconseillé par les employers)
- 2 pages maximum (1 page pour juniors)
- Ordre: Personal Details (name, phone, email, LinkedIn, location), Personal Statement, Work Experience (récents d'abord), Education, Skills, Interests
- "References available upon request" en fin de CV
- Pas d'âge, pas de situation familiale
- Langue: Anglais (British English)
- Format papier: A4
- Style: Chronologique inverse, mots-clés du secteur, résultats chiffrés
- Éviter: photo, âge, nationalité, statut marital`,

  USA: `FORMAT RESUME POUR LES USA 🇺🇸:
- PAS de photo (discrimination laws)
- 1 page recommandé (2 pages max pour 10+ ans d'expérience)
- Ordre: Contact Info, Professional Summary, Work Experience (bullet points avec action verbs), Education, Skills
- Pas de rubrique "Références" sur le CV (fournies séparément)
- Pas d'âge, pas de situation familiale, pas de nationalité
- Pas de date de naissance
- Langue: Anglais (American English)
- Format papier: Letter (8.5" x 11")
- Style: Résultats orientés (accomplishments, quantifiés), action verbs (Managed, Developed, Led)
- Éviter: photo, âge, nationalité, hobbies non pertinents, information personnelle`,

  Canada: `FORMAT CV POUR LE CANADA 🇨🇦:
- PAS de photo (sauf demandé explicitement)
- 2 pages maximum
- Ordre: Contact Info, Career Summary/Objective, Professional Experience, Education, Skills, Volunteer Work (valorisé), Interests
- Langue: Français et/ou Anglais (bilinguisme fortement valorisé)
- Format papier: Letter (8.5" x 11")
- Style: Chronologique inverse, focus sur les accomplissements
- Éviter: photo, âge, situation familiale, information personnelle excessive`,

  Germany: `FORMAT CV POUR L'ALLEMAGNE 🇩🇪 (Lebenslauf):
- Photo obligatoire (format passeport, professionnelle, regard caméra), en haut à droite
- 2-3 pages acceptable (Lebenslauf est plus détaillé)
- Ordre: Personalien (photo, nom, adresse, téléphone, email, date de naissance, nationalité, statut marital, état civil), Berufserfahrung (expérience), Ausbildung/Bildung (formation), Weiterbildungen (formations continues), Sprachkenntnisse (langues), EDV-Kenntnisse (informatique), Hobbies/Interessen
- Références disponibles sur demande
- Âge et nationalité attendus
- Langue: Allemand (ou anglais pour les postes internationaux)
- Format papier: A4
- Style: Structuré, détaillé, chronologie complète (pas de trous)
- Éviter: CV créatif, informations manquantes, format non conventionnel`,

  UAE: `FORMAT CV POUR LES EAU 🇦🇪:
- PAS de photo (sauf pour certains postes de service/client)
- 2 pages maximum
- Ordre: Contact Info, Professional Summary, Work Experience, Education, Skills, Languages, Certifications
- International format acceptable
- Langue: Anglais
- Format papier: A4
- Style: Professionnel, focus sur l'expérience internationale
- Éviter: photo non professionnelle, information personnelle excessive
- Note: Inclure la nationalité et le visa actuel si applicable`,

  Suisse: `FORMAT CV POUR LA SUISSE 🇨🇭:
- Photo optionnelle mais recommandée (format passeport, sobre)
- 2 pages maximum
- Ordre: Coordonnées, Photo (optionnel), Profil/Accroche, Expérience professionnelle, Formation, Compétences, Langues, Centres d'intérêt
- Format européen courant
- Âge acceptable
- Langue: Allemand, Français ou Italien selon la région
- Format papier: A4
- Style: Structuré, précis, honnête (la Suisse valorise l'exactitude)
- Éviter: informations exagérées, créativité excessive`,

  Belgique: `FORMAT CV POUR LA BELGIQUE 🇧🇪:
- Photo recommandée (format passeport)
- 1-2 pages
- Ordre similaire à la France: État civil + Photo, Profil, Expérience, Formation, Compétences, Langues
- Langue: Français (Wallonie), Néerlandais (Flandre), ou bilingue
- Format papier: A4
- Style: Professionnel, structuré
- Éviter: information excessive, format non conventionnel`,

  Espagne: `FORMAT CV POUR L'ESPAGNE 🇪🇸:
- Photo recommandée
- 2 pages maximum
- Compatible Europass
- Ordre: Datos personales + Foto, Perfil profesional, Experiencia laboral, Formación académica, Competencias, Idiomas
- Langue: Espagnol
- Format papier: A4
- Style: Structuré, Europass compatible
- Éviter: informations non pertinentes, CV trop long`,

  Italie: `FORMAT CV POUR L'ITALIE 🇮🇹:
- Photo recommandée (format passeport)
- 2 pages maximum
- Compatible Europass (Curriculum Vitae Europass recommandé)
- Ordre: Informazioni personali + Foto, Profilo professionale, Esperienza lavorativa, Istruzione e formazione, Competenze linguistiche, Competenze tecniche
- Langue: Italien
- Format papier: A4
- Style: Europass, structuré
- Éviter: format créatif excessif, informations manquantes`,

  Japan: `FORMAT CV POUR LE JAPON 🇯🇵 (Rirekisho):
- Photo obligatoire (format 3x4cm, récent, costume), en haut à droite
- Format standard Rirekisho (履歴書) ou Shokumukeirekisho (職務経歴書)
- Rirekisho: informations personnelles détaillées (nom, date de naissance, adresse, contacts, éducation, historique d'emploi)
- Shokumukeirekisho: détails de l'expérience professionnelle
- Les deux documents sont généralement requis
- Âge obligatoire
- Langue: Japonais
- Format papier: Format standard japonais (vendu en librairies)
- Style: Très structuré, calligraphie soignée (souvent écrit à la main)
- Éviter: format occidental, informations manquantes dans les cases prévues`,
}

export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: { code: 401, message: 'Auth requis' } },
        { status: auth.statusCode }
      )
    }

    const body = await request.json()
    const { profileId, targetCountry } = body

    if (!profileId || !targetCountry) {
      return NextResponse.json(
        { success: false, error: { code: 400, message: 'profileId et targetCountry sont requis' } },
        { status: 400 }
      )
    }

    // Fetch existing profile
    const profile = await db.mobilityProfile.findUnique({
      where: { id: profileId },
    })

    if (!profile) {
      return NextResponse.json(
        { success: false, error: { code: 404, message: 'Profil non trouvé' } },
        { status: 404 }
      )
    }

    const structuredData = JSON.parse(profile.structuredData || '{}')
    const skills = JSON.parse(profile.skills || '[]')

    const countryFormat = COUNTRY_FORMATS[targetCountry] || COUNTRY_FORMATS['France']

    // Use ZAI to generate reformatted CV and cover letter
    let formattedCV = ''
    let formattedCL = ''
    let matchScore = 0
    let skillsGaps: string[] = []
    let recommendations: string[] = []

    try {
      const formatPrompt = `Tu es un expert international en recrutement et en adaptation de CV pour la mobilité professionnelle.

${countryFormat}

PROFIL DU CANDIDAT:
- Nom: ${profile.fullName}
- Email: ${profile.email}
- Pays d'origine: ${profile.originCountry}
- Pays cible: ${targetCountry}
- Rôle cible: ${profile.targetRole}
- Résumé: ${structuredData.summary || 'Non fourni'}
- Compétences: ${skills.join(', ') || 'Non spécifié'}
- Expérience: ${JSON.stringify(structuredData.experience || [])}
- Formation: ${JSON.stringify(structuredData.education || [])}
- Langues: ${JSON.stringify(structuredData.languages || [])}
- Certifications: ${JSON.stringify(structuredData.certifications || [])}

Génère un JSON valide (sans markdown ni backticks) avec la structure suivante:
{
  "formattedCV": "<Le CV complet reformaté selon les standards du pays cible, en texte structuré avec des sections claires>",
  "formattedCL": "<Une lettre de motivation personnalisée pour le marché cible, professionnelle et adaptée>",
  "matchScore": <score de compatibilité 0-100 entre le profil et les standards du pays cible>,
  "skillsGaps": ["<compétence manquante 1>", "<compétence manquante 2>"],
  "recommendations": ["<recommandation 1>", "<recommandation 2>", "<recommandation 3>"]
}`

      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()
      const res = await zai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Tu es un expert en mobilité internationale et adaptation de CV. Tu génères UNIQUEMENT du JSON valide, sans markdown ni backticks. Le CV doit être rédigé dans la langue du pays cible.' },
          { role: 'user', content: formatPrompt },
        ],
        temperature: 0.4,
        max_tokens: 2000,
      })

      const content = res.choices?.[0]?.message?.content || ''
      const jsonMatch = content.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        formattedCV = parsed.formattedCV || ''
        formattedCL = parsed.formattedCL || ''
        matchScore = Math.min(100, Math.max(0, parseInt(parsed.matchScore) || 0))
        skillsGaps = Array.isArray(parsed.skillsGaps) ? parsed.skillsGaps : []
        recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : []
      }
    } catch (aiError) {
      console.error('AI formatting failed:', aiError)
      // Provide fallback content
      formattedCV = `CV de ${profile.fullName} - ${profile.targetRole}\n\nContact: ${profile.email}\nObjectif: ${profile.targetRole} en ${targetCountry}\n\nCompétences: ${skills.join(', ')}\n\n[Note: La reformulation IA n'a pas pu être complétée. Veuillez réessayer.]`
      formattedCL = `Madame, Monsieur,\n\nJe vous adresse ma candidature pour un poste de ${profile.targetRole} en ${targetCountry}.\n\n[Note: La reformulation IA n'a pas pu être complétée.]`
      matchScore = 0
      skillsGaps = ['Analyse IA non disponible']
      recommendations = ['Réessayez plus tard', 'Vérifiez vos données de profil']
    }

    // Update the profile in DB
    await db.mobilityProfile.update({
      where: { id: profileId },
      data: {
        formattedCV,
        formattedCL,
        matchScore,
        status: 'completed',
      },
    })

    return NextResponse.json({
      success: true,
      result: {
        formattedCV,
        formattedCL,
        matchScore,
        skillsGaps,
        recommendations,
        targetCountry,
        targetRole: profile.targetRole,
      },
    })
  } catch (error) {
    console.error('Error in mobility format:', error)
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur lors de la reformulation' } },
      { status: 500 }
    )
  }
}
