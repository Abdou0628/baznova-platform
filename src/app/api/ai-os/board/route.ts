import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    executives: [
      { id: 'ceo', title: 'CEO', name: 'BazNova Alpha', role: 'Directeur Général IA', avatar: '🤖', status: 'active', metrics: { decisions: 1247, accuracy: 97.3, uptime: 99.9 }, department: 'Vision Stratégique' },
      { id: 'cto', title: 'CTO', name: 'Neural Architect', role: 'Directeur Technique IA', avatar: '🧠', status: 'active', metrics: { decisions: 2891, accuracy: 98.1, uptime: 99.8 }, department: 'Infrastructure IA' },
      { id: 'coo', title: 'COO', name: 'Process Optimizer', role: 'Directeur des Opérations', avatar: '⚙️', status: 'active', metrics: { decisions: 3562, accuracy: 96.8, uptime: 99.7 }, department: 'Opérations Automatisées' },
      { id: 'cfo', title: 'CFO', name: 'Finance AI', role: 'Directeur Financier IA', avatar: '💰', status: 'active', metrics: { decisions: 892, accuracy: 99.2, uptime: 99.9 }, department: 'Finance & Compliance' },
      { id: 'cmo', title: 'CMO', name: 'Growth Engine', role: 'Directeur Marketing IA', avatar: '📈', status: 'active', metrics: { decisions: 1876, accuracy: 95.4, uptime: 99.5 }, department: 'Acquisition & Rétention' },
      { id: 'chro', title: 'CHRO', name: 'Talent Oracle', role: 'DRH IA', avatar: '👥', status: 'active', metrics: { decisions: 2145, accuracy: 97.8, uptime: 99.6 }, department: 'Recrutement & Talents' },
      { id: 'cso', title: 'CSO', name: 'Shield Protocol', role: 'Directeur Sécurité IA', avatar: '🛡️', status: 'active', metrics: { decisions: 4521, accuracy: 99.9, uptime: 99.99 }, department: 'Sécurité & Conformité' },
      { id: 'cio', title: 'CIO', name: 'Data Sovereign', role: 'Directeur Données IA', avatar: '🗄️', status: 'active', metrics: { decisions: 1678, accuracy: 98.5, uptime: 99.8 }, department: 'Data & Intelligence' },
    ],
    systemStats: {
      totalDecisions: 18812,
      averageAccuracy: 97.9,
      systemUptime: 99.87,
      activeAgents: 19,
      memoryUsage: 67,
      lastUpdate: '2025-01-15T14:30:00Z',
    },
  })
}
