import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const lang = (formData.get('lang') as string) || 'fr'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'docx', 'doc'].includes(ext || '')) {
      return NextResponse.json({ error: 'Unsupported format. Use PDF or Word.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    let cvText = ''

    if (ext === 'pdf') {
      const pdfParse = (await import('pdf-parse')).default
      const parsed = await pdfParse(buffer)
      cvText = parsed.text
    } else if (ext === 'docx' || ext === 'doc') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      cvText = result.value
    }

    if (!cvText || cvText.trim().length < 30) {
      return NextResponse.json({ error: 'Could not extract text from file' }, { status: 400 })
    }

    const zai = await ZAI.create()
    const langInstruction: Record<string, string> = {
      fr: 'Réponds en français. Les clés JSON doivent être exactement : fullName, email, phone, address, location, linkedin, website, targetJob, industry, experience, education, skills, languages, summary, softSkills.',
      en: 'Answer in English. JSON keys must be exactly: fullName, email, phone, address, location, linkedin, website, targetJob, industry, experience, education, skills, languages, summary, softSkills.',
      ar: 'أجب بالعربية. مفاتيح JSON يجب أن تكون بالضبط : fullName, email, phone, address, location, linkedin, website, targetJob, industry, experience, education, skills, languages, summary, softSkills.',
      es: 'Responde en español. Las claves JSON deben ser exactamente: fullName, email, phone, address, location, linkedin, website, targetJob, industry, experience, education, skills, languages, summary, softSkills.',
    }

    const systemPrompt = `You are a CV parser assistant. Extract structured data from the following CV text. ${langInstruction[lang] || langInstruction.en}

Rules:
- If a field is not found, use empty string ""
- For experience, write a detailed description of all work experiences in one paragraph
- For education, write a detailed description of all degrees in one paragraph  
- For skills, separate with commas
- For languages, separate with commas including level (e.g. "French - native, English - fluent")
- For softSkills, separate with commas
- For summary, write a professional summary paragraph
- Respond with valid JSON only, no markdown, no extra text.`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: cvText },
      ],
      thinking: { type: 'disabled' },
    })

    let parsed: Record<string, string> = {}
    try {
      const raw = completion.choices[0]?.message?.content || ''
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      }
    } catch {
      // If parsing fails, return empty data
    }

    return NextResponse.json({
      success: true,
      data: {
        fullName: parsed.fullName || '',
        email: parsed.email || '',
        phone: parsed.phone || '',
        address: parsed.address || '',
        location: parsed.location || '',
        linkedin: parsed.linkedin || '',
        website: parsed.website || '',
        targetJob: parsed.targetJob || '',
        industry: parsed.industry || '',
        experience: parsed.experience || '',
        education: parsed.education || '',
        skills: parsed.skills || '',
        languages: parsed.languages || '',
        summary: parsed.summary || '',
        softSkills: parsed.softSkills || '',
      },
    })
  } catch (error) {
    console.error('CV Import error:', error)
    return NextResponse.json({ error: 'Failed to process CV' }, { status: 500 })
  }
}
