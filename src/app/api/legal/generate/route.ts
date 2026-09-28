import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

export async function POST(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })
    }

    const { employer, employee, contractType, startDate, salary, responsibilities, clauses, language } = await req.json()

    if (!employer?.trim() || !employee?.trim()) {
      return NextResponse.json({ error: 'Employer and employee names are required' }, { status: 400 })
    }

    const lang = language || 'fr'
    const langMap: Record<string, string> = { fr: 'French', en: 'English', ar: 'Arabic', es: 'Spanish' }
    const responseLang = langMap[lang] || 'English'

    const typeLabels: Record<string, string> = {
      cdi: 'CDI (Permanent)',
      cdt: 'CDT (Fixed-term)',
      freelance: 'Freelance',
      internship: 'Internship',
    }

    const systemPrompt = `You are BazNova IA LEGAL, an expert legal AI assistant specializing in employment law and contract drafting across multiple jurisdictions (Morocco, France, EU, Saudi Arabia, UAE). Generate professional, legally-sound contracts. Respond in ${responseLang}. Always use formal legal language and structure.`

    const userPrompt = `Generate a complete, professional ${typeLabels[contractType] || contractType} employment contract with the following details:

- Employer: ${employer}
- Employee: ${employee}
- Contract Type: ${typeLabels[contractType] || contractType}
- Start Date: ${startDate || 'To be determined'}
- Salary/Compensation: ${salary || 'To be agreed'}
- Responsibilities: ${responsibilities || 'Standard responsibilities for the position'}
${clauses ? `- Additional Clauses: ${clauses}` : ''}

Please generate the complete contract text including:
1. Title and preamble (date, parties)
2. Article 1: Object and purpose
3. Article 2: Duration and start date
4. Article 3: Workplace and working hours
5. Article 4: Salary and benefits
6. Article 5: Responsibilities and duties
7. Article 6: Confidentiality
8. Article 7: Termination conditions
9. Article 8: Dispute resolution (jurisdiction)
10. Article 9: General provisions
11. Signature block

Respond with the contract text ONLY, no markdown formatting.`

    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    })

    const content = completion.choices[0]?.message?.content || ''

    // Save to DB
    const doc = await db.legalDocument.create({
      data: {
        title: `${typeLabels[contractType] || contractType} — ${employer} / ${employee}`,
        type: contractType,
        content,
        language: lang,
        status: 'draft',
      },
    })

    return NextResponse.json({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      status: doc.status,
      content,
      language: doc.language,
      createdAt: doc.createdAt,
    })
  } catch (error) {
    console.error('[POST /api/legal/generate]', error)
    return NextResponse.json({ error: 'Failed to generate contract' }, { status: 500 })
  }
}
