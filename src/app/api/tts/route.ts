import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory rate limiter
const ttsRateLimit = {
  count: 0,
  lastReset: Date.now(),
  maxPerMinute: 5,
}

function isRateLimited(): boolean {
  const now = Date.now()
  if (now - ttsRateLimit.lastReset > 60000) {
    ttsRateLimit.count = 0
    ttsRateLimit.lastReset = now
  }
  ttsRateLimit.count++
  return ttsRateLimit.count > ttsRateLimit.maxPerMinute
}

const MARKETING_SLIDES = {
  fr: [
    'Découvrez HireNova, votre plateforme IA de gestion de carrière et recrutement. Créez des CV professionnels, optimisez votre profil LinkedIn, et préparez-vous aux entretiens avec notre intelligence artificielle avancée.',
    'Notre écosystème complet comprend vingt modules intelligents : CV IA, Lettre de Motivation, Analyse ATS, Simulateur d\'entretien, Optimiseur LinkedIn, Plan de Carrière, Coach IA, et bien plus encore.',
    'Le Command Center IA supervise l\'ensemble de la plateforme en temps réel. Dix-neuf agents autonomes collaborent pour vous offrir une expérience sans précédent.',
    'Rejoignez des milliers de professionnels qui font confiance à HireNova pour accélérer leur carrière. L\'intelligence artificielle au service de votre réussite.',
  ],
  en: [
    'Discover HireNova, your AI-powered career management and recruitment platform. Create professional resumes, optimize your LinkedIn profile, and prepare for interviews with our advanced artificial intelligence.',
    'Our complete ecosystem includes twenty intelligent modules: AI Resume, Cover Letter, ATS Analysis, Interview Simulator, LinkedIn Optimizer, Career Roadmap, AI Coach, and much more.',
    'The AI Command Center supervises the entire platform in real time. Nineteen autonomous agents collaborate to provide you with an unprecedented experience.',
    'Join thousands of professionals who trust HireNova to accelerate their careers. Artificial intelligence at the service of your success.',
  ],
  ar: [
    'اكتشف HireNova، منصتك المدعومة بالذكاء الاصطناعي لإدارة المسار المهني التوظيف. أنشئ سيرًا ذاتية احترافية، وحسّن ملفك على لينكد إن، واستعد للمقابلات.',
    'يضم نظامنا المتكامل عشرين وحدة ذكية: سيرة ذاتية، رسالة تعريف، تحليل ATS، محاكاة مقابلات، تحسين لينكد إن، خارطة طريق مهنية، مدرب ذكي، والمزيد.',
    'يراقب مركز القيادة الذكي المنصة بالكامل في الوقت الفعلي. تسعة عشر وكيلًا مستقلًا يتعاونون لتقديم تجربة استثنائية.',
    'انضم إلى آلاف المحترفين الذين يثقون في HireNova لتسريع مساراتهم المهنية. الذكاء الاصطناعي في خدمة نجاحك.',
  ],
  es: [
    'Descubre HireNova, tu plataforma de gestión de carrera y reclutamiento con IA. Crea currículums profesionales, optimiza tu perfil de LinkedIn y prepárate para entrevistas.',
    'Nuestro ecosistema completo incluye veinte módulos inteligentes: CV IA, Carta de Presentación, Análisis ATS, Simulador de Entrevistas, Optimizador de LinkedIn y mucho más.',
    'El Centro de Mando IA supervisa toda la plataforma en tiempo real. Diecinueve agentes autónomos colaboran para ofrecerte una experiencia sin precedentes.',
    'Únete a miles de profesionales que confían en HireNova para acelerar sus carreras. Inteligencia artificial al servicio de tu éxito.',
  ],
}

export async function POST(req: NextRequest) {
  // Rate limit check — prevent retry storms
  if (isRateLimited()) {
    return NextResponse.json(
      { error: 'Rate limited — too many TTS requests' },
      { status: 429 },
    )
  }

  try {
    const { text, language = 'fr', slideIndex = 0 } = await req.json()
    
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const inputText = text || MARKETING_SLIDES[language as keyof typeof MARKETING_SLIDES]?.[slideIndex]
    if (!inputText) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    // Split into chunks of 1000 chars max
    const chunks: string[] = []
    if (inputText.length <= 1000) {
      chunks.push(inputText)
    } else {
      const sentences = inputText.match(/[^.!?]+[.!?]+/g) || [inputText]
      let current = ''
      for (const s of sentences) {
        if ((current + s).length <= 1000) {
          current += s
        } else {
          if (current) chunks.push(current.trim())
          current = s
        }
      }
      if (current) chunks.push(current.trim())
    }

    // Generate audio for each chunk and concatenate
    const buffers: Buffer[] = []
    for (const chunk of chunks) {
      try {
        const response = await zai.audio.tts.create({
          input: chunk,
          voice: 'xiaochen',
          speed: 0.95,
          response_format: 'wav',
          stream: false,
        })
        const arrayBuffer = await response.arrayBuffer()
        buffers.push(Buffer.from(new Uint8Array(arrayBuffer)))
      } catch (chunkErr: unknown) {
        // If the API returns 429, stop immediately instead of retrying
        const msg = chunkErr instanceof Error ? chunkErr.message : String(chunkErr)
        if (msg.includes('429') || msg.includes('Too many')) {
          console.warn('[TTS] Rate limited by upstream API, stopping early')
          break
        }
        throw chunkErr
      }
    }

    if (buffers.length === 0) {
      return NextResponse.json(
        { error: 'TTS temporarily unavailable — rate limited' },
        { status: 503 },
      )
    }

    const finalBuffer = Buffer.concat(buffers)

    return new NextResponse(finalBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': finalBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.warn('[TTS] Generation failed:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'TTS generation failed' },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    slides: Object.fromEntries(
      Object.entries(MARKETING_SLIDES).map(([lang, texts]) => [lang, texts.length])
    ),
  })
}
