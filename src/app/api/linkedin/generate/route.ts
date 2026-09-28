import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'

const LANG_PROMPTS: Record<string, string> = {
  fr: `Tu es un expert en rédaction de contenus LinkedIn optimisés pour le recrutement. Génère du contenu professionnel et percutant. Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks.

Format de réponse attendu:
{
  "headlines": ["<headline variante 1>", "<headline variante 2>", "<headline variante 3>", "<headline variante 4>", "<headline variante 5>"],
  "summaries": ["<résumé variante 1>", "<résumé variante 2>", "<résumé variante 3>"],
  "experienceBullets": ["<bullet 1>", "<bullet 2>", "<bullet 3>", "<bullet 4>", "<bullet 5>"],
  "suggestedSkills": ["<compétence 1>", "<compétence 2>", "<compétence 3>", "<compétence 4>", "<compétence 5>", "<compétence 6>", "<compétence 7>", "<compétence 8>"]
}

Règles :
- Les headlines doivent être concis (120 caractères max), utiliser des mots-clés pertinents et séparer les éléments par " | " ou " • "
- Les résumés doivent être engageants, raconter une histoire professionnelle et inclure des résultats quantifiables (3-4 paragraphes chacun)
- Les bullets d'expérience doivent commencer par un verbe d'action et inclure des métriques/chiffres
- Les compétences doivent être pertinentes pour le poste cible et inclure des compétences techniques et comportementales`,
  en: `You are an expert in writing recruitment-optimized LinkedIn content. Generate professional and impactful content. Respond ONLY in valid JSON, without markdown or backticks.

Expected response format:
{
  "headlines": ["<headline variant 1>", "<headline variant 2>", "<headline variant 3>", "<headline variant 4>", "<headline variant 5>"],
  "summaries": ["<summary variant 1>", "<summary variant 2>", "<summary variant 3>"],
  "experienceBullets": ["<bullet 1>", "<bullet 2>", "<bullet 3>", "<bullet 4>", "<bullet 5>"],
  "suggestedSkills": ["<skill 1>", "<skill 2>", "<skill 3>", "<skill 4>", "<skill 5>", "<skill 6>", "<skill 7>", "<skill 8>"]
}

Rules:
- Headlines must be concise (max 120 chars), use relevant keywords, and separate elements with " | " or " • "
- Summaries must be engaging, tell a professional story, and include quantifiable results (3-4 paragraphs each)
- Experience bullets must start with an action verb and include metrics/numbers
- Skills must be relevant to the target job and include both technical and soft skills`,
  ar: `أنت خبير في كتابة محتوى لينكد إن محسّن للتوظيف. أنشئ محتوى احترافياً ومؤثراً. أجب فقط بـ JSON صالح، بدون ماركداون أو علامات اقتباس خلفية.

صيغة الاستجابة المتوقعة:
{
  "headlines": ["<عنوان متغير 1>", "<عنوان متغير 2>", "<عنوان متغير 3>", "<عنوان متغير 4>", "<عنوان متغير 5>"],
  "summaries": ["<ملخص متغير 1>", "<ملخص متغير 2>", "<ملخص متغير 3>"],
  "experienceBullets": ["<نقطة 1>", "<نقطة 2>", "<نقطة 3>", "<نقطة 4>", "<نقطة 5>"],
  "suggestedSkills": ["<مهارة 1>", "<مهارة 2>", "<مهارة 3>", "<مهارة 4>", "<مهارة 5>", "<مهارة 6>", "<مهارة 7>", "<مهارة 8>"]
}

القواعد:
- يجب أن تكون العناوين موجزة (120 حرفاً كحد أقصى)، تستخدم كلمات مفتاحية ذات صلة
- يجب أن تكون الملخصات جذابة وتحكي قصة مهنية وتتضمن نتائج قابلة للقياس (3-4 فقرات لكل منها)
- يجب أن تبدأ نقاط الخبرة بفعل عمل وتتضمن مقاييس وأرقام
- يجب أن تكون المهارات ذات صلة بالوظيفة المستهدفة وتشمل مهارات تقنية وسلوكية`,
  es: `Eres un experto en redacción de contenido de LinkedIn optimizado para el reclutamiento. Genera contenido profesional e impactante. Responde SOLO en JSON válido, sin markdown ni backticks.

Formato de respuesta esperado:
{
  "headlines": ["<titular variante 1>", "<titular variante 2>", "<titular variante 3>", "<titular variante 4>", "<titular variante 5>"],
  "summaries": ["<resumen variante 1>", "<resumen variante 2>", "<resumen variante 3>"],
  "experienceBullets": ["<viñeta 1>", "<viñeta 2>", "<viñeta 3>", "<viñeta 4>", "<viñeta 5>"],
  "suggestedSkills": ["<competencia 1>", "<competencia 2>", "<competencia 3>", "<competencia 4>", "<competencia 5>", "<competencia 6>", "<competencia 7>", "<competencia 8>"]
}

Reglas:
- Los titulares deben ser concisos (máx. 120 caracteres), usar palabras clave relevantes y separar elementos con " | " o " • "
- Los resúmenes deben ser atractivos, contar una historia profesional e incluir resultados cuantificables (3-4 párrafos cada uno)
- Las viñetas de experiencia deben comenzar con un verbo de acción e incluir métricas/números
- Las competencias deben ser relevantes para el puesto objetivo e incluir tanto habilidades técnicas como blandas`,
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
    const { targetJob, industry, achievements, currentHeadline, currentSummary, language = 'fr' } = body

    if (!targetJob || !targetJob.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 400, message: 'Le poste cible est requis' } },
        { status: 400 }
      )
    }

    const lang = ['fr', 'en', 'ar', 'es'].includes(language) ? language : 'fr'
    const systemPrompt = LANG_PROMPTS[lang] || LANG_PROMPTS['fr']

    let result: Record<string, unknown> = {
      headlines: [],
      summaries: [],
      experienceBullets: [],
      suggestedSkills: [],
    }

    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()
      const contextParts = []
      if (currentHeadline) contextParts.push(`HEADLINE ACTUEL: ${currentHeadline}`)
      if (currentSummary) contextParts.push(`RÉSUMÉ ACTUEL: ${currentSummary}`)
      if (achievements) contextParts.push(`RÉALISATIONS CLÉS: ${achievements}`)
      if (industry) contextParts.push(`SECTEUR: ${industry}`)

      const userPrompt = `POSTE CIBLE: ${targetJob.trim()}
${contextParts.join('\n')}

Génère le contenu LinkedIn optimisé selon les critères demandés.`

      const res = await zai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      })

      const content = res.choices?.[0]?.message?.content || ''
      const jsonMatch = content.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        result = {
          headlines: Array.isArray(parsed.headlines) ? parsed.headlines.slice(0, 5) : [],
          summaries: Array.isArray(parsed.summaries) ? parsed.summaries.slice(0, 3) : [],
          experienceBullets: Array.isArray(parsed.experienceBullets) ? parsed.experienceBullets.slice(0, 5) : [],
          suggestedSkills: Array.isArray(parsed.suggestedSkills) ? parsed.suggestedSkills.slice(0, 8) : [],
        }
      }
    } catch (aiError) {
      console.error('LinkedIn generate AI error:', aiError)
      // Fallback empty result
    }

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error('LinkedIn generate error:', error)
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur lors de la génération LinkedIn' } },
      { status: 500 }
    )
  }
}
