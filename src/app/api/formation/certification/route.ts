import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'
import ZAI from 'z-ai-web-dev-sdk'

// GET /api/formation/certification — get user certifications
export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
    }

    const user = await db.user.findUnique({ where: { email: auth.email! } })
    if (!user) {
      return NextResponse.json({ certifications: [] })
    }

    const certifications = await db.certification.findMany({
      where: { userId: user.id },
      orderBy: { issuedAt: 'desc' },
    })

    return NextResponse.json({ certifications })
  } catch (error) {
    console.error('Formation certification GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch certifications' }, { status: 500 })
  }
}

// POST /api/formation/certification — generate exam or submit answers
export async function POST(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
    }
    const body = await req.json()
    const { action, courseId, courseTitle, language, answers } = body

    const user = await db.user.findUnique({ where: { email: auth.email! } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Action: generate exam questions via LLM
    if (action === 'generate') {
      const course = courseId ? await db.formationCourse.findUnique({ where: { id: courseId } }) : null
      const title = courseTitle || course?.title || 'General Knowledge'

      const zai = new ZAI()
      const examLang = language === 'ar' ? 'ar' : language === 'es' ? 'es' : language === 'fr' ? 'fr' : 'en'

      const prompt = examLang === 'fr'
        ? `Génère un examen de 5 questions à choix multiples (QCM) pour le cours "${title}".
Chaque question a 4 options (A, B, C, D) et une bonne réponse.
Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks:
{"questions":[{"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A"}]}`
        : examLang === 'ar'
        ? `أنشئ اختباراً من 5 أسئلة خيار متعدد للدورة "${title}".
كل سؤال له 4 خيارات (A, B, C, D) وإجابة صحيحة.
أجب فقط بـ JSON صالح، بدون تنسيق:
{"questions":[{"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A"}]}`
        : examLang === 'es'
        ? `Genera un examen de 5 preguntas de opción múltiple para el curso "${title}".
Cada pregunta tiene 4 opciones (A, B, C, D) y una respuesta correcta.
Responde SOLO en JSON válido, sin markdown ni backticks:
{"questions":[{"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A"}]}`
        : `Generate a 5-question multiple choice exam for the course "${title}".
Each question has 4 options (A, B, C, D) and one correct answer.
Respond ONLY with valid JSON, no markdown or backticks:
{"questions":[{"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A"}]}`

      const result = await zai.chat({ messages: [{ role: 'user', content: prompt }] })
      const content = typeof result === 'string' ? result : JSON.stringify(result)

      // Parse JSON from LLM response
      let exam
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        exam = jsonMatch ? JSON.parse(jsonMatch[0]) : { questions: [] }
      } catch {
        exam = { questions: [] }
      }

      return NextResponse.json({ exam })
    }

    // Action: AI recommendation based on career goals
    if (action === 'recommend') {
      const courses = await db.formationCourse.findMany({
        orderBy: { rating: 'desc' },
        take: 20,
      })

      const lang = language || 'fr'
      const courseList = courses.map(c => `- ${c.title} (${c.category}, ${c.level}, ${c.duration}h)`).join('\n')

      const zai = new ZAI()
      const prompt = lang === 'fr'
        ? `Voici la liste des cours disponibles:
${courseList}

L'utilisateur veut développer ses compétences professionnelles.
Recommande les 3 cours les plus pertinents. Réponds en JSON:
{"recommendations":[{"courseId":"...","reason":"..."}]}`
        : `Here are the available courses:
${courseList}

The user wants to develop their professional skills.
Recommend the 3 most relevant courses. Respond in JSON:
{"recommendations":[{"courseId":"...","reason":"..."}]}`

      const result = await zai.chat({ messages: [{ role: 'user', content: prompt }] })
      const content = typeof result === 'string' ? result : JSON.stringify(result)

      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { recommendations: [] }
        // Enrich with course data
        const enriched = (parsed.recommendations || []).slice(0, 3).map((r: { courseId: string; reason: string }) => {
          const course = courses.find(c => c.id === r.courseId)
          return course ? { ...course, reason: r.reason } : null
        }).filter(Boolean)
        return NextResponse.json({ recommendations: enriched })
      } catch {
        // Fallback: return top 3 rated courses
        return NextResponse.json({
          recommendations: courses.slice(0, 3).map(c => ({ ...c, reason: 'Top rated course' })),
        })
      }
    }

    // Action: submit exam answers & get score
    if (action === 'submit' && courseId && answers) {
      const course = await db.formationCourse.findUnique({ where: { id: courseId } })
      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 })
      }

      // Count correct answers
      const totalQuestions = answers.length
      let correct = 0
      for (const a of answers) {
        if (a.userAnswer === a.correctAnswer) correct++
      }

      const score = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0
      const passed = score >= 70

      let certification = null
      if (passed) {
        // Generate unique cert ID
        const certId = `HN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
        certification = await db.certification.create({
          data: {
            userId: user.id,
            courseId,
            courseTitle: course.title,
            score,
            certId,
          },
        })
      }

      return NextResponse.json({
        score,
        passed,
        correct,
        total: totalQuestions,
        certification,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Formation certification POST error:', error)
    return NextResponse.json({ error: 'Failed to process certification' }, { status: 500 })
  }
}
