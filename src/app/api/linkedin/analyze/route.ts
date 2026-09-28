import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, secureAIInput, validateAIOutput, checkAIAbuseLimit, logAIEvent } from '@/lib/hnsa'

const LANG_PROMPTS: Record<string, string> = {
  fr: `Tu es un expert en optimisation de profils LinkedIn. Analyse le profil LinkedIn suivant et fournis une évaluation détaillée. Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks.

Format de réponse attendu:
{
  "headlineAnalysis": "<analyse détaillée du headline : clarté, mots-clés, impact, suggestions>",
  "summaryReview": "<revue du résumé/About : accroche, longueur, storytelling, impact>",
  "experienceCritique": "<critique des expériences : quantification, verbes d'action, impact mesurable>",
  "skillsGap": "<analyse des compétences : pertinence, tendances du marché, lacunes identifiées>",
  "overallScore": <score global 0-100>,
  "visibility": <score visibilité 0-100>,
  "keywordOptimization": <score optimisation mots-clés 0-100>,
  "completeness": <score complétude 0-100>,
  "strengths": ["<force 1>", "<force 2>", "<force 3>"],
  "weaknesses": ["<faiblesse 1>", "<faiblesse 2>", "<faiblesse 3>"],
  "recommendations": ["<recommandation 1>", "<recommandation 2>", "<recommandation 3>", "<recommandation 4>", "<recommandation 5>"]
}`,
  en: `You are a LinkedIn profile optimization expert. Analyze the following LinkedIn profile and provide a detailed assessment. Respond ONLY in valid JSON, without markdown or backticks.

Expected response format:
{
  "headlineAnalysis": "<detailed headline analysis: clarity, keywords, impact, suggestions>",
  "summaryReview": "<summary/About review: hook, length, storytelling, impact>",
  "experienceCritique": "<experience critique: quantification, action verbs, measurable impact>",
  "skillsGap": "<skills analysis: relevance, market trends, identified gaps>",
  "overallScore": <overall score 0-100>,
  "visibility": <visibility score 0-100>,
  "keywordOptimization": <keyword optimization score 0-100>,
  "completeness": <completeness score 0-100>,
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>", "<recommendation 4>", "<recommendation 5>"]
}`,
  ar: `أنت خبير في تحسين ملفات لينكد إن. حلّل ملف لينكد إن التالي وقدّم تقييماً مفصلاً. أجب فقط بـ JSON صالح، بدون ماركداون أو علامات اقتباس خلفية.

صيغة الاستجابة المتوقعة:
{
  "headlineAnalysis": "<تحليل مفصّل للعنوان: الوضوح، الكلمات المفتاحية، التأثير، الاقتراحات>",
  "summaryReview": "<مراجعة الملخص: الجذب، الطول، السرد، التأثير>",
  "experienceCritique": "<نقد الخبرات: التكميم، أفعال العمل، التأثير المقيس>",
  "skillsGap": "<تحليل المهارات: الصلة، اتجاهات السوق، الفجوات>",
  "overallScore": <الدرجة الإجمالية 0-100>,
  "visibility": <درجة الظهور 0-100>,
  "keywordOptimization": <درجة تحسين الكلمات المفتاحية 0-100>,
  "completeness": <درجة الاكتمال 0-100>,
  "strengths": ["<نقطة قوة 1>", "<نقطة قوة 2>", "<نقطة قوة 3>"],
  "weaknesses": ["<نقطة ضعف 1>", "<نقطة ضعف 2>", "<نقطة ضعف 3>"],
  "recommendations": ["<توصية 1>", "<توصية 2>", "<توصية 3>", "<توصية 4>", "<توصية 5>"]
}`,
  es: `Eres un experto en optimización de perfiles de LinkedIn. Analiza el siguiente perfil de LinkedIn y proporciona una evaluación detallada. Responde SOLO en JSON válido, sin markdown ni backticks.

Formato de respuesta esperado:
{
  "headlineAnalysis": "<análisis detallado del titular: claridad, palabras clave, impacto, sugerencias>",
  "summaryReview": "<revisión del resumen/About: gancho, longitud, storytelling, impacto>",
  "experienceCritique": "<crítica de la experiencia: cuantificación, verbos de acción, impacto medible>",
  "skillsGap": "<análisis de competencias: relevancia, tendencias del mercado, brechas identificadas>",
  "overallScore": <puntuación global 0-100>,
  "visibility": <puntuación de visibilidad 0-100>,
  "keywordOptimization": <puntuación de optimización de palabras clave 0-100>,
  "completeness": <puntuación de completitud 0-100>,
  "strengths": ["<fortaleza 1>", "<fortaleza 2>", "<fortaleza 3>"],
  "weaknesses": ["<debilidad 1>", "<debilidad 2>", "<debilidad 3>"],
  "recommendations": ["<recomendación 1>", "<recomendación 2>", "<recomendación 3>", "<recomendación 4>", "<recomendación 5>"]
}`,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { profileText, language = 'fr' } = body

    if (!profileText || !profileText.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 400, message: 'Le texte du profil est requis' } },
        { status: 400 }
      )
    }

    const lang = ['fr', 'en', 'ar', 'es'].includes(language) ? language : 'fr'
    const systemPrompt = LANG_PROMPTS[lang] || LANG_PROMPTS['fr']

    // --- HNSA AI Security Gateway ---
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: { code: 401, message: 'Auth requis' } },
        { status: auth.statusCode }
      )
    }
    const userId = auth.userId!
    const aiCheck = checkAIAbuseLimit(userId)
    if (!aiCheck.allowed) {
      return NextResponse.json(
        { success: false, error: { code: 429, message: 'AI rate limit exceeded. Please try again later.' } },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(aiCheck.retryAfterMs / 1000)) } }
      )
    }

    const secured = secureAIInput(profileText, userId)
    if (secured.blocked) {
      return NextResponse.json(
        { success: false, error: { code: 400, message: `Request blocked: ${secured.blockReason}` } },
        { status: 400 }
      )
    }

    let analysisResult: Record<string, unknown> = {}
    let overallScore = 0

    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()
      const userPrompt = `PROFIL LINKEDIN À ANALYSER:

${profileText.trim()}

Analyse ce profil en détail selon les critères demandés.`

      const res = await zai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      })

      const content = res.choices?.[0]?.message?.content || ''

      // --- HNSA AI Output Validation ---
      const outputCheck = validateAIOutput(content, userId)
      if (outputCheck.hasPII) {
        logAIEvent({
          userId,
          eventType: 'PII_IN_OUTPUT',
          input: profileText,
          output: content,
          blocked: false,
          details: { piiTypes: outputCheck.piiTypes, path: '/api/linkedin/analyze' },
        }).catch(() => {})
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        analysisResult = {
          headlineAnalysis: parsed.headlineAnalysis || '',
          summaryReview: parsed.summaryReview || '',
          experienceCritique: parsed.experienceCritique || '',
          skillsGap: parsed.skillsGap || '',
          overallScore: Math.min(100, Math.max(0, parseInt(parsed.overallScore) || 0)),
          visibility: Math.min(100, Math.max(0, parseInt(parsed.visibility) || 0)),
          keywordOptimization: Math.min(100, Math.max(0, parseInt(parsed.keywordOptimization) || 0)),
          completeness: Math.min(100, Math.max(0, parseInt(parsed.completeness) || 0)),
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5) : [],
          weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 5) : [],
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 7) : [],
        }
        overallScore = analysisResult.overallScore as number
      }
    } catch (aiError) {
      console.error('LinkedIn analysis AI error:', aiError)
      analysisResult = {
        headlineAnalysis: lang === 'fr' ? 'Analyse non disponible. Veuillez réessayer.' : 'Analysis unavailable. Please try again.',
        summaryReview: '',
        experienceCritique: '',
        skillsGap: '',
        overallScore: 0,
        visibility: 0,
        keywordOptimization: 0,
        completeness: 0,
        strengths: [],
        weaknesses: [],
        recommendations: [],
      }
      overallScore = 0
    }

    // Save to database
    await db.linkedInAnalysis.create({
      data: {
        profileText: profileText.trim().slice(0, 5000),
        analysis: JSON.stringify(analysisResult),
        score: overallScore,
        language: lang,
      },
    })

    return NextResponse.json({
      success: true,
      result: analysisResult,
    })
  } catch (error) {
    console.error('LinkedIn analyze error:', error)
    return NextResponse.json(
      { success: false, error: { code: 500, message: "Erreur lors de l'analyse LinkedIn" } },
      { status: 500 }
    )
  }
}
