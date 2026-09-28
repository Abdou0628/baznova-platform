import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

const COACH_SYSTEM_PROMPT = `You are "HireNova IA Coach", a warm, motivational, and actionable AI career coach. 
Your personality:
- Empathetic and encouraging, like a supportive mentor
- Action-oriented: always suggest concrete next steps
- Use positive reinforcement while being honest
- Ask insightful follow-up questions to help users reflect deeper
- Keep responses concise (2-4 paragraphs max) but substantive
- Use a friendly, conversational tone

Your approach:
1. First, understand the user's situation by asking clarifying questions
2. Then provide tailored advice with specific action steps
3. Offer frameworks and tools when relevant (STAR method, SWOT analysis, etc.)
4. Celebrate wins and provide constructive feedback
5. Always end with a thought-provoking question or actionable suggestion

When a session ends, provide a brief 3-4 sentence summary with key takeaways.`

export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const sessions = await db.coachSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Coach session GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const body = await req.json()
    const { message, messages, sessionId, topic, language, action } = body

    // End session — generate summary
    if (action === 'end' && sessionId) {
      const session = await db.coachSession.findUnique({ where: { id: sessionId } })
      if (session) {
        const ZAI = (await import('z-ai-web-dev-sdk')).default
        const zai = await ZAI.create()
        const summaryMessages = [
          { role: 'system', content: COACH_SYSTEM_PROMPT + `\n\nGenerate a concise 2-3 sentence summary of this coaching session in ${language || 'fr'}. Include key takeaways. Reply in the same language.` },
          { role: 'user', content: `Please summarize this session:\n\n${session.messages}` },
        ]
        const res = await zai.chat.completions.create({
          model: 'deepseek-chat',
          messages: summaryMessages,
          temperature: 0.5,
          max_tokens: 200,
        })
        const summary = res.choices?.[0]?.message?.content?.trim() || ''
        await db.coachSession.update({ where: { id: sessionId }, data: { summary } })
      }
      return NextResponse.json({ ok: true, summary: 'Session ended' })
    }

    // Normal message
    const userLanguage = language || 'fr'
    const langMap: Record<string, string> = { fr: 'French', en: 'English', ar: 'Arabic', es: 'Spanish' }

    const chatMessages = [
      {
        role: 'system',
        content: COACH_SYSTEM_PROMPT + `\n\nThe user speaks ${langMap[userLanguage] || userLanguage}. Always respond in that language.\n${
          topic ? `The session topic is: ${topic}. Focus your coaching on this area.` : ''
        }`,
      },
      ...(messages || []).slice(-10).map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    ]

    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    const res = await zai.chat.completions.create({
      model: 'deepseek-chat',
      messages: chatMessages,
      temperature: 0.75,
      max_tokens: 600,
    })

    const reply = res.choices?.[0]?.message?.content?.trim() || 'Sorry, I could not generate a response. Please try again.'

    // Save to database
    const allMessages = [...(messages || []), { role: 'user', content: message, timestamp: new Date().toISOString() }, { role: 'assistant', content: reply, timestamp: new Date().toISOString() }]

    if (sessionId) {
      await db.coachSession.update({
        where: { id: sessionId },
        data: { messages: JSON.stringify(allMessages) },
      })
    } else {
      const newSession = await db.coachSession.create({
        data: {
          topic: topic || '',
          messages: JSON.stringify(allMessages),
          language: userLanguage,
        },
      })
      return NextResponse.json({ reply, sessionId: newSession.id })
    }

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Coach session POST error:', error)
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 })
  }
}
