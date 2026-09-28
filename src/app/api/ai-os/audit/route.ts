import { NextRequest, NextResponse } from 'next/server'
import { getAuditLogs, getAuditStats } from '@/lib/ai-os/audit-engine'

/**
 * GET /api/ai-os/audit
 * List audit logs with optional filters + stats summary.
 * Query params: agentId, actionType, policyResult, riskLevel, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const agentId = searchParams.get('agentId') ?? undefined
    const actionType = searchParams.get('actionType') ?? undefined
    const policyResult = searchParams.get('policyResult') ?? undefined
    const riskLevel = searchParams.get('riskLevel') ?? undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0

    const [logsResult, stats] = await Promise.all([
      getAuditLogs({ agentId, actionType, policyResult, riskLevel, limit, offset }),
      getAuditStats(),
    ])

    return NextResponse.json({
      logs: logsResult.logs,
      total: logsResult.total,
      limit,
      offset,
      stats,
    })
  } catch (error) {
    console.error('[ai-os/audit] GET failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 },
    )
  }
}
