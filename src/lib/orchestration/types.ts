// ── User Intent ──
export type UserIntentCategory =
  | 'optimize_profile' | 'find_job' | 'get_hired' | 'career_growth'
  | 'delegate_work' | 'analyze_market' | 'manage_team' | 'learn_skill' | 'legal_compliance'

export interface UserIntent {
  category: UserIntentCategory
  confidence: number
  rawInput: string
  metadata: Record<string, unknown>
}

// ── Service Mode ──
export type ServiceMode = 'saas_simple' | 'saas_labour'

// ── Service Selection ──
export interface ServiceDefinition {
  id: string
  name: string
  mode: ServiceMode
  intentCategories: UserIntentCategory[]
  planRequired: string[]
  labourCost?: number // WU per execution
}

// ── Workflow ──
export type WorkflowNodeStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface WorkflowNode {
  id: string
  serviceId: string
  action: string
  label: string
  mode: ServiceMode
  dependencies: string[]
  status?: WorkflowNodeStatus
  output?: unknown
  error?: string
  durationMs?: number
  wuCost?: number
}

export interface WorkflowEdge {
  from: string
  to: string
}

export interface Workflow {
  id: string
  intent: UserIntentCategory
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  status: 'draft' | 'running' | 'completed' | 'failed'
  totalWuCost: number
  totalDurationMs: number
  startedAt: Date
}

// ── Next Action ──
export type ActionPriority = 'critical' | 'high' | 'medium' | 'low'

export interface NextAction {
  id: string
  title: string
  description: string
  category: UserIntentCategory
  mode: ServiceMode
  priority: ActionPriority
  impact: number // 0-100
  effort: number // 0-100
  expectedValue: number
  confidence: number
  products: string[]
  labourCost?: number
}

// ── Value Metrics ──
export interface ValueMetric {
  metric: string
  simpleValue: number
  labourValue: number
  combinedValue: number
  unit: string
}

// ── Commercial Flow ──
export interface CommercialFlow {
  users: number
  subscriptions: number
  services: number
  usages: number
  valuePerUser: number
  retentionRate: number
  profitabilityMargin: number
}
