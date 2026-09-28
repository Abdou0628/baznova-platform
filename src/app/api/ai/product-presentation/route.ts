import { NextRequest, NextResponse } from 'next/server'

type CVLanguage = 'fr' | 'en' | 'ar' | 'es'

interface ProductInfo {
  slug: string
  names: Record<CVLanguage, string>
  shortDesc: Record<CVLanguage, string>
}

const PRODUCTS: ProductInfo[] = [
  {
    slug: 'cv',
    names: { fr: 'CV IA Professionnel', en: 'Professional AI Resume', ar: 'سيرة ذاتية احترافية IA', es: 'CV Profesional IA' },
    shortDesc: { fr: 'Créez un CV professionnel optimisé ATS avec l\'intelligence artificielle', en: 'Create an ATS-optimized professional resume with AI', ar: 'أنشئ سيرة ذاتية احترافية محسنة مع الذكاء الاصطناعي', es: 'Crea un CV profesional optimizado con IA' },
  },
  {
    slug: 'cover-letter',
    names: { fr: 'Lettre de Motivation IA', en: 'AI Cover Letter', ar: 'رسالة تحفيزية IA', es: 'Carta de Presentación IA' },
    shortDesc: { fr: 'Générez des lettres de motivation personnalisées et percutantes', en: 'Generate personalized and compelling cover letters', ar: 'أنشئ رسائل تحفيزية مخصصة ومؤثرة', es: 'Genera cartas de presentación personalizadas' },
  },
  {
    slug: 'interview',
    names: { fr: 'Simulateur Entretien IA', en: 'AI Interview Simulator', ar: 'محاكي مقابلة IA', es: 'Simulador de Entrevista IA' },
    shortDesc: { fr: 'Pratiquez vos entretiens avec un coach IA intelligent', en: 'Practice interviews with an intelligent AI coach', ar: 'تدرّب على المقابلات مع مدرب ذكاء اصطناعي', es: 'Practica entrevistas con un coach IA' },
  },
  {
    slug: 'linkedin',
    names: { fr: 'Optimiseur LinkedIn IA', en: 'LinkedIn AI Optimizer', ar: 'محسّن لينكدإن IA', es: 'Optimizador LinkedIn IA' },
    shortDesc: { fr: 'Optimisez votre profil LinkedIn pour attirer les recruteurs', en: 'Optimize your LinkedIn profile to attract recruiters', ar: 'حسّن ملفك على لينكدإن لجذب أصحاب العمل', es: 'Optimiza tu perfil de LinkedIn para atraer reclutadores' },
  },
  {
    slug: 'career',
    names: { fr: 'Plan de Carrière IA', en: 'AI Career Roadmap', ar: 'خطة مسار مهني IA', es: 'Plan de Carrera IA' },
    shortDesc: { fr: 'Obtenez une feuille de route de carrière personnalisée par l\'IA', en: 'Get a personalized career roadmap from AI', ar: 'احصل على خطة مسار مهني مخصصة', es: 'Obtén un plan de carrera personalizado con IA' },
  },
  {
    slug: 'mobility',
    names: { fr: 'Mobilité Internationale', en: 'International Mobility', ar: 'التنقل الدولي', es: 'Movilidad Internacional' },
    shortDesc: { fr: 'Trouvez des opportunités de carrière à l\'international', en: 'Find international career opportunities', ar: 'اعثر على فرص عمل دولية', es: 'Encuentra oportunidades de carrera internacionales' },
  },
]

// Map language to TTS voice
const VOICE_MAP: Record<CVLanguage, string> = {
  fr: 'kazi',
  en: 'jam',
  ar: 'tongtong',
  es: 'xiaochen',
}

// LLM prompt templates per language
const LLM_PROMPTS: Record<CVLanguage, (name: string, desc: string) => string> = {
  fr: (name, desc) =>
    `Tu es un présentateur marketing passionné. Présente le produit HireNova "${name}" en 3 phrases courtes et percutantes pour une présentation vocale. Description: ${desc}. Ne dépasse pas 800 caractères. Sois enthousiaste et professionnel. Ne mets pas de titres ni de listes, juste un texte fluide.`,
  en: (name, desc) =>
    `You are a passionate marketing presenter. Present the HireNova product "${name}" in 3 short, punchy sentences for a voice presentation. Description: ${desc}. Do not exceed 800 characters. Be enthusiastic and professional. No titles or lists, just flowing text.`,
  ar: (name, desc) =>
    `أنت مقدم تسويقي شغوف. قدم منتج HireNova "${name}" في 3 جمل قصيرة ومؤثرة للعرض الصوتي. الوصف: ${desc}. لا تتجاوز 800 حرف. كن متحمساً ومحترفاً. بدون عناوين أو قوائم، فقط نص سلس.`,
  es: (name, desc) =>
    `Eres un presentador de marketing apasionado. Presenta el producto HireNova "${name}" en 3 frases cortas y contundentes para una presentación de voz. Descripción: ${desc}. No excedas 800 caracteres. Sé entusiasta y profesional. Sin títulos ni listas, solo texto fluido.`,
}

// Image prompt templates per language
const IMAGE_PROMPTS: Record<CVLanguage, (name: string, slug: string) => string> = {
  fr: (name, slug) =>
    `Modern futuristic app interface showcasing "${name}" recruitment AI tool, glowing green and white color scheme, dark background with emerald accents, professional tech aesthetic, clean UI mockup, 4k quality`,
  en: (name, slug) =>
    `Modern futuristic app interface showcasing "${name}" recruitment AI tool, glowing green and white color scheme, dark background with emerald accents, professional tech aesthetic, clean UI mockup, 4k quality`,
  ar: (name, slug) =>
    `Modern futuristic app interface showcasing "${name}" recruitment AI tool, glowing green and white color scheme, dark background with emerald accents, professional tech aesthetic, clean UI mockup, 4k quality`,
  es: (name, slug) =>
    `Modern futuristic app interface showcasing "${name}" recruitment AI tool, glowing green and white color scheme, dark background with emerald accents, professional tech aesthetic, clean UI mockup, 4k quality`,
}

// Simple in-memory cache
const cache = new Map<string, { description: string; imageBase64: string; audioBase64: string; timestamp: number }>()
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

export async function POST(req: NextRequest) {
  try {
    const { productSlug, language = 'fr' } = await req.json()
    const lang = (language || 'fr') as CVLanguage

    if (!productSlug) {
      return NextResponse.json({ error: 'productSlug is required' }, { status: 400 })
    }

    const product = PRODUCTS.find((p) => p.slug === productSlug)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Check cache
    const cacheKey = `${productSlug}_${lang}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        productSlug: productSlug,
        productName: product.names[lang],
        ...cached,
        cached: true,
      })
    }

    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    const name = product.names[lang]

    // 1. Generate AI description via LLM
    let description = product.shortDesc[lang] // fallback
    try {
      const llmPrompt = LLM_PROMPTS[lang](name, product.shortDesc[lang])
      const llmResponse = await zai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: llmPrompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.8,
      })
      const generated = llmResponse.choices?.[0]?.message?.content?.trim()
      if (generated && generated.length > 20 && generated.length <= 1024) {
        description = generated
      }
    } catch (e) {
      console.error('[ProductPresentation] LLM error, using fallback:', e)
    }

    // 2. Generate product image
    let imageBase64 = ''
    try {
      const imagePrompt = IMAGE_PROMPTS[lang](name, product.slug)
      const imgResponse = await zai.images.generations.create({
        prompt: imagePrompt,
        size: '1344x768' as const,
      })
      imageBase64 = imgResponse.data?.[0]?.base64 ?? ''
    } catch (e) {
      console.error('[ProductPresentation] Image generation error:', e)
    }

    // 3. Generate TTS audio (max 1024 chars)
    let audioBase64 = ''
    try {
      const ttsText = description.length > 1000 ? description.slice(0, 997) + '...' : description
      const voice = VOICE_MAP[lang] || 'kazi'
      const audioResponse = await zai.audio.tts.create({
        input: ttsText,
        voice: voice,
        speed: 1.0,
        response_format: 'mp3' as const,
        stream: false,
      })
      const arrayBuffer = await audioResponse.arrayBuffer()
      const buffer = Buffer.from(new Uint8Array(arrayBuffer))
      audioBase64 = buffer.toString('base64')
    } catch (e) {
      console.error('[ProductPresentation] TTS error:', e)
    }

    // Cache the result
    cache.set(cacheKey, {
      description,
      imageBase64,
      audioBase64,
      timestamp: Date.now(),
    })

    // Clean old cache entries
    for (const [key, value] of cache.entries()) {
      if (Date.now() - value.timestamp > CACHE_TTL) {
        cache.delete(key)
      }
    }

    return NextResponse.json({
      productSlug: productSlug,
      productName: name,
      description,
      imageBase64,
      audioBase64,
      cached: false,
    })
  } catch (error) {
    console.error('[ProductPresentation] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate presentation' },
      { status: 500 }
    )
  }
}
