import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

// POST /api/linkedin/import — Import LinkedIn profile from URL or raw text
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const body = await req.json()
    const { linkedinUrl, profileText, method } = body

    if (!profileText && !linkedinUrl) {
      return NextResponse.json(
        { error: 'MISSING_DATA', message: 'Provide a LinkedIn URL or profile text' },
        { status: 400 }
      )
    }

    let rawText = profileText || ''

    // If URL provided, try to fetch the page content
    if (linkedinUrl && !rawText) {
      try {
        const zai = await ZAI.create()
        const result = await zai.functions.invoke('page_reader', {
          url: linkedinUrl,
        })

        // Extract text from HTML
        const html = result.data?.html || ''
        rawText = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')
          .trim()
      } catch {
        rawText = ''
      }
    }

    if (!rawText || rawText.length < 50) {
      return NextResponse.json(
        {
          error: 'FETCH_FAILED',
          message:
            'Could not extract LinkedIn profile data. LinkedIn profiles require login. Please copy your profile text and paste it directly.',
        },
        { status: 400 }
      )
    }

    // Use LLM to parse the profile text into structured data
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `You are an expert resume parser. Extract structured professional profile data from LinkedIn profile text.
Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "fullName": "string",
  "headline": "string — current job title",
  "summary": "string — about/summary section (2-3 sentences)",
  "location": "string — city, country",
  "email": "string or null",
  "phone": "string or null",
  "website": "string or null",
  "experience": [
    { "title": "string", "company": "string", "period": "string (e.g. Jan 2020 - Present)", "description": "string (2-3 key bullet points)" }
  ],
  "education": [
    { "degree": "string", "school": "string", "period": "string", "description": "string or null" }
  ],
  "skills": ["skill1", "skill2", ...],
  "languages": [{ "name": "string", "level": "string" }],
  "certifications": ["cert1", ...],
  "industry": "string or null"
}
If a field cannot be determined, use null. For skills, provide 8-15 most relevant skills.`,
        },
        {
          role: 'user',
          content: rawText.substring(0, 8000),
        },
      ],
      thinking: { type: 'disabled' },
    })

    let parsedData: Record<string, unknown>
    const responseText = completion.choices[0]?.message?.content || ''

    // Try to extract JSON from the response (handle markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        parsedData = JSON.parse(jsonMatch[0])
      } catch {
        parsedData = { fullName: '', headline: '', summary: rawText.substring(0, 500), skills: [], experience: [], education: [], languages: [] }
      }
    } else {
      parsedData = { fullName: '', headline: '', summary: rawText.substring(0, 500), skills: [], experience: [], education: [], languages: [] }
    }

    // Save to database
    const profile = await db.linkedInProfile.create({
      data: {
        userId: session.user.id,
        linkedinUrl: linkedinUrl || null,
        profileData: JSON.stringify(parsedData),
        rawText: rawText.substring(0, 50000),
        importMethod: method || (linkedinUrl ? 'url' : 'manual'),
        status: 'completed',
      },
    })

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        data: parsedData,
        importedAt: profile.createdAt,
      },
    })
  } catch (error) {
    console.error('[LinkedIn Import Error]', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to import LinkedIn profile' },
      { status: 500 }
    )
  }
}
