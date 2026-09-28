import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, checkAIAbuseLimit, secureAIInput, validateAIOutput, logAIEvent } from '@/lib/hnsa'
import { scanInput, logSecurityEvent } from '@/lib/security'
import {
  buildCopilotPipeline,
  getAccessibleSteps,
  getBlockedStepsUpgradePath,
  calculateMatchScore,
  basicKeywordMatch,
  getAllStepDefinitions,
  type CopilotStep,
} from '@/lib/ai-orchestrator'

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP
  return '127.0.0.1'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobDescription, jobTitle, company } = body

    // --- Input Validation ---
    if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length < 30) {
      return NextResponse.json(
        { error: 'Veuillez coller une offre d\'emploi complète (minimum 30 caractères).', code: 'INVALID_INPUT' },
        { status: 400 },
      )
    }

    if (!jobTitle || typeof jobTitle !== 'string') {
      return NextResponse.json(
        { error: 'Le titre du poste est requis.', code: 'INVALID_INPUT' },
        { status: 400 },
      )
    }

    // Security scan on inputs
    const fieldsToScan = [jobTitle, company, jobDescription]
    for (const field of fieldsToScan) {
      if (typeof field === 'string' && field.length > 0) {
        const scan = scanInput(field)
        if (!scan.isClean) {
          await logSecurityEvent({
            type: scan.sqlInjection ? 'sql_injection_attempt' : 'xss_attempt',
            severity: 'high',
            ip: getClientIP(request),
            path: '/api/copilot/analyze',
            method: 'POST',
            userAgent: request.headers.get('user-agent') || undefined,
            details: { sqlInjection: scan.sqlInjection, xss: scan.xss },
          }).catch(() => {})
          return NextResponse.json(
            { error: 'Invalid input detected', code: 'SECURITY_BLOCKED' },
            { status: 400 },
          )
        }
      }
    }

    // --- Auth ---
    const auth = await withAuth(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.reason, code: 'AUTH_REQUIRED' },
        { status: auth.statusCode },
      )
    }
    const userId = auth.userId!

    // --- Get User Plan & Latest CV ---
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { plan: true, resumes: { orderBy: { createdAt: 'desc' }, take: 1 } },
    })

    const userPlan = user?.plan ?? 'free'

    // --- Build Pipeline ---
    const pipeline = buildCopilotPipeline({
      jobDescription: jobDescription.trim(),
      jobTitle: jobTitle.trim(),
      company: (company || '').trim(),
      userId,
      userPlan,
    })

    // --- Accessible / Blocked Analysis ---
    const accessibleSteps = getAccessibleSteps(userPlan)
    const blockedSteps = pipeline.steps.filter((s) => s.status === 'blocked').map((s) => s.step)
    const upgradeInfo = getBlockedStepsUpgradePath(userPlan, blockedSteps as CopilotStep[])

    // --- Match Score (basic keyword matching if CV exists) ---
    let matchScore: ReturnType<typeof calculateMatchScore> | null = null
    let keywordMatch: ReturnType<typeof basicKeywordMatch> | null = null

    const latestResume = user?.resumes?.[0]
    if (latestResume && latestResume.generatedData) {
      try {
        const cvData = typeof latestResume.generatedData === 'string'
          ? JSON.parse(latestResume.generatedData)
          : latestResume.generatedData

        // Build plain text from CV data
        const cvText = [
          cvData.summary || '',
          ...(cvData.experience || []).map((e: { title?: string; company?: string; description?: string }) =>
            `${e.title || ''} ${e.company || ''} ${e.description || ''}`
          ),
          ...(cvData.education || []).map((e: { degree?: string; school?: string }) =>
            `${e.degree || ''} ${e.school || ''}`
          ),
          ...(cvData.skills || []).join(' '),
        ].filter(Boolean).join(' ')

        keywordMatch = basicKeywordMatch(cvText, jobDescription)

        matchScore = calculateMatchScore({
          keywordsMatch: keywordMatch.score,
          skillsMatch: keywordMatch.score, // approximate
          experienceMatch: Math.min(100, keywordMatch.score + 5), // slightly boost if keywords match
        })
      } catch {
        // If CV data is malformed, skip match score
      }
    }

    // --- Step definitions for the UI ---
    const stepDefs = getAllStepDefinitions()

    // --- AI abuse check (lightweight since this is just analysis, not generation) ---
    const aiCheck = checkAIAbuseLimit(userId)
    if (!aiCheck.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans quelques instants.', code: 'AI_RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(aiCheck.retryAfterMs / 1000)) } },
      )
    }

    return NextResponse.json({
      success: true,
      pipeline,
      accessibleSteps,
      blockedSteps,
      upgradeInfo: upgradeInfo.upgradePath
        ? {
            targetPlan: upgradeInfo.upgradePath.targetPlan,
            targetBundle: upgradeInfo.upgradePath.targetBundle,
            additionalCost: upgradeInfo.upgradePath.additionalCost,
            neededSteps: upgradeInfo.neededSteps,
          }
        : null,
      cheapestBundle: upgradeInfo.cheapestBundleName
        ? { name: upgradeInfo.cheapestBundleName, price: upgradeInfo.cheapestBundlePrice }
        : null,
      matchScore,
      keywordMatch: keywordMatch
        ? { matchedCount: keywordMatch.matchedKeywords.length, missingCount: keywordMatch.missingKeywords.length }
        : null,
      stepDefinitions: stepDefs,
      hasCv: !!latestResume,
    })
  } catch (error) {
    console.error('Error in copilot/analyze:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur.', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}
