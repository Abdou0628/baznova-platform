import type { UserIntentCategory, ServiceMode, Workflow, WorkflowNode, WorkflowEdge, WorkflowNodeStatus } from './types'

interface WorkflowTemplate {
  id: string
  intent: UserIntentCategory
  label: string
  description: string
  nodes: Omit<WorkflowNode, 'status' | 'output' | 'error' | 'durationMs' | 'wuCost'>[]
  edges: WorkflowEdge[]
}

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'wf_optimize_profile', intent: 'optimize_profile',
    label: 'Profile Optimization Pipeline', description: 'Optimize CV → ATS scan → Generate cover letter → LinkedIn boost',
    nodes: [
      { id: 'n1', serviceId: 'cv_generator', action: 'generate_cv', label: 'Generate CV', mode: 'saas_simple', dependencies: [] },
      { id: 'n2', serviceId: 'ats_scanner', action: 'ats_scan', label: 'ATS Analysis', mode: 'saas_simple', dependencies: ['n1'] },
      { id: 'n3', serviceId: 'cover_letter', action: 'generate_cl', label: 'Cover Letter', mode: 'saas_simple', dependencies: ['n1'] },
      { id: 'n4', serviceId: 'linkedin_optimizer', action: 'optimize_linkedin', label: 'LinkedIn Boost', mode: 'saas_simple', dependencies: ['n2'] },
    ],
    edges: [{ from: 'n1', to: 'n2' }, { from: 'n1', to: 'n3' }, { from: 'n2', to: 'n4' }],
  },
  {
    id: 'wf_job_copilot', intent: 'find_job',
    label: 'Job Copilot Pipeline', description: 'Analyze offer → Match score → Optimize CV → Generate CL → Interview prep → Career advice',
    nodes: [
      { id: 'n1', serviceId: 'agent_job_copilot', action: 'analyze_offer', label: 'Analyze Offer', mode: 'saas_labour', dependencies: [] },
      { id: 'n2', serviceId: 'agent_job_copilot', action: 'match_score', label: 'Match Score', mode: 'saas_labour', dependencies: ['n1'] },
      { id: 'n3', serviceId: 'agent_cv_optimization', action: 'optimize_cv', label: 'Optimize CV', mode: 'saas_labour', dependencies: ['n2'] },
      { id: 'n4', serviceId: 'agent_cv_optimization', action: 'generate_cl', label: 'Generate CL', mode: 'saas_labour', dependencies: ['n3'] },
      { id: 'n5', serviceId: 'agent_career_plan', action: 'interview_prep', label: 'Interview Prep', mode: 'saas_labour', dependencies: ['n3'] },
      { id: 'n6', serviceId: 'agent_career_plan', action: 'career_advice', label: 'Career Advice', mode: 'saas_labour', dependencies: ['n5'] },
    ],
    edges: [{ from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' }, { from: 'n3', to: 'n4' }, { from: 'n3', to: 'n5' }, { from: 'n5', to: 'n6' }],
  },
  {
    id: 'wf_career_growth', intent: 'career_growth',
    label: 'Career Growth Pipeline', description: 'Assessment → Career plan → Skill gaps → Formation → Coaching',
    nodes: [
      { id: 'n1', serviceId: 'career_planner', action: 'assess', label: 'Career Assessment', mode: 'saas_simple', dependencies: [] },
      { id: 'n2', serviceId: 'agent_career_plan', action: 'create_plan', label: 'AI Career Plan', mode: 'saas_labour', dependencies: ['n1'] },
      { id: 'n3', serviceId: 'formation', action: 'recommend', label: 'Formation Recs', mode: 'saas_simple', dependencies: ['n2'] },
      { id: 'n4', serviceId: 'career_planner', action: 'coach_session', label: 'Coaching Session', mode: 'saas_simple', dependencies: ['n2'] },
    ],
    edges: [{ from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' }, { from: 'n2', to: 'n4' }],
  },
  {
    id: 'wf_market_intelligence', intent: 'analyze_market',
    label: 'Market Intelligence Pipeline', description: 'Salary analysis → Trend forecast → Career opportunities',
    nodes: [
      { id: 'n1', serviceId: 'market_intelligence', action: 'salary_analysis', label: 'Salary Analysis', mode: 'saas_simple', dependencies: [] },
      { id: 'n2', serviceId: 'agent_market_analysis', action: 'trend_forecast', label: 'AI Trend Forecast', mode: 'saas_labour', dependencies: ['n1'] },
      { id: 'n3', serviceId: 'market_intelligence', action: 'opportunities', label: 'Opportunities', mode: 'saas_simple', dependencies: ['n2'] },
    ],
    edges: [{ from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' }],
  },
  {
    id: 'wf_sourcing', intent: 'get_hired',
    label: 'Candidate Sourcing Pipeline', description: 'Job posting → AI Sourcing → Scoring → Pipeline management',
    nodes: [
      { id: 'n1', serviceId: 'job_search', action: 'post_job', label: 'Post Job', mode: 'saas_simple', dependencies: [] },
      { id: 'n2', serviceId: 'agent_sourcing', action: 'source_candidates', label: 'AI Sourcing', mode: 'saas_labour', dependencies: ['n1'] },
      { id: 'n3', serviceId: 'agent_sourcing', action: 'score_candidates', label: 'AI Scoring', mode: 'saas_labour', dependencies: ['n2'] },
    ],
    edges: [{ from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' }],
  },
]

export function buildWorkflow(intent: UserIntentCategory, _userPlan: string = 'pro'): Workflow {
  const template = WORKFLOW_TEMPLATES.find(t => t.intent === intent) ?? WORKFLOW_TEMPLATES[0]
  const now = new Date()
  return {
    id: `wf_${Date.now()}`, intent: template.intent,
    nodes: template.nodes.map(n => ({ ...n, status: 'pending' as WorkflowNodeStatus })),
    edges: template.edges, status: 'draft', totalWuCost: 0, totalDurationMs: 0, startedAt: now,
  }
}

export function getWorkflowTemplates(): WorkflowTemplate[] { return WORKFLOW_TEMPLATES }
export function getTemplatesForIntent(intent: UserIntentCategory): WorkflowTemplate[] { return WORKFLOW_TEMPLATES.filter(t => t.intent === intent) }

export function calculateWorkflowCost(workflow: Workflow): number {
  return workflow.nodes.reduce((sum, node) => sum + (node.wuCost ?? 0), 0)
}

export function getExecutionOrder(workflow: Workflow): string[][] {
  const nodesById = new Map(workflow.nodes.map(n => [n.id, n]))
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()
  for (const node of workflow.nodes) { inDegree.set(node.id, 0); adj.set(node.id, []) }
  for (const edge of workflow.edges) { adj.get(edge.from)?.push(edge.to); inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1) }
  const levels: string[][] = []
  let queue = workflow.nodes.filter(n => (inDegree.get(n.id) ?? 0) === 0).map(n => n.id)
  while (queue.length > 0) {
    levels.push([...queue])
    const nextQueue: string[] = []
    for (const nodeId of queue) {
      for (const neighbor of (adj.get(nodeId) ?? [])) {
        const newDegree = (inDegree.get(neighbor) ?? 1) - 1
        inDegree.set(neighbor, newDegree)
        if (newDegree === 0) nextQueue.push(neighbor)
      }
    }
    queue = nextQueue
  }
  const processed = levels.flat()
  for (const node of workflow.nodes) { if (!processed.includes(node.id)) levels.push([node.id]) }
  return levels
}

export function getWorkflowModeDistribution(workflow: Workflow): { simple: number; labour: number } {
  let simple = 0, labour = 0
  for (const node of workflow.nodes) { if (node.mode === 'saas_simple') simple++; else labour++ }
  return { simple, labour }
}
