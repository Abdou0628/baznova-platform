import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'
import { encryptBeforeWrite } from '@/lib/hnsa/encryption-middleware'
// NOTE: This route currently parses CV files and returns structured data without saving to DB.
// When a db.resume.create() is added, wrap the data with encryptBeforeWrite() before the write.
// Sensitive fields (phone, location, industry, linkedin, etc.) will be encrypted automatically.

export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const language = (formData.get('language') as string) || 'fr'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read file content
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // If it's a text file, read directly. For PDF/DOCX, extract text via AI.
    let cvText = ''
    const fileName = file.name.toLowerCase()

    if (fileName.endsWith('.txt')) {
      cvText = buffer.toString('utf-8')
    } else if (fileName.endsWith('.pdf') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
      // For binary files, use a base64 representation and let AI parse it
      const base64 = buffer.toString('base64')
      cvText = base64
    } else {
      // Try as text
      cvText = buffer.toString('utf-8')
    }

    if (!cvText || cvText.length < 10) {
      return NextResponse.json({ error: 'File content is empty or too short' }, { status: 400 })
    }

    const isBinary = fileName.endsWith('.pdf') || fileName.endsWith('.doc') || fileName.endsWith('.docx')

    // Use AI to parse the CV content and extract structured data
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    const systemPrompt = `You are an expert CV parser. Extract structured information from the provided CV content.
Return ONLY a valid JSON object with these fields (omit any field that cannot be found):
{
  "fullName": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "targetJob": "string or last job title",
  "industry": "string",
  "experience": "string (concatenated work experience)",
  "education": "string (concatenated education)",
  "skills": "string (comma-separated skills)",
  "languages": "string (comma-separated languages)",
  "summary": "string (professional summary if available)",
  "linkedin": "string (LinkedIn URL if found)",
  "website": "string (personal website/portfolio if found)"
}

Language of the CV: ${language === 'fr' ? 'French' : language === 'en' ? 'English' : language === 'ar' ? 'Arabic' : language === 'es' ? 'Spanish' : language}
Respond ONLY with the JSON object, no markdown, no explanation.`

    const userPrompt = isBinary
      ? `This is a ${fileName.split('.').pop()?.toUpperCase()} file encoded in base64. Parse the CV content and extract all information. The original filename was: ${file.name}`
      : `Parse this CV content and extract all structured information:\n\n${cvText}`

    const completion = await zai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    })

    const responseText = completion.choices[0]?.message?.content || ''
    // Clean up markdown code blocks if present
    let jsonStr = responseText.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const parsedData = JSON.parse(jsonStr)

    return NextResponse.json(parsedData)
  } catch (error) {
    console.error('CV import error:', error)
    const message = error instanceof Error ? error.message : 'Failed to import CV'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
