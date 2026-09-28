import { NextResponse } from 'next/server'

interface Transaction {
  id?: string
  clientName?: string
  email?: string
  amountMAD?: number
  currency?: string
  status?: string
  provider?: string
  plan?: string
  description?: string
  createdAt?: string
}

interface MonthlyRevenue {
  month: string
  amount: number
}

interface RequestBody {
  revenue: number
  mrr: number
  subscriptions: number
  revenueTrend: number
  subscriptionTrend: number
  recentTransactions: Transaction[]
  monthlyRevenue: MonthlyRevenue[]
  expenses: number
}

interface AiInsights {
  insights: string[]
  risks: string[]
  recommendations: string[]
  forecast: {
    nextMonthRevenue: number
    confidence: number
    projectedMRR: number
  }
  healthScore: number
  summary: string
}

const SYSTEM_PROMPT = `Tu es l'Agent Paiement BazNova, un agent IA de fintech marocain spécialisé dans la gestion financière SaaS, la fiscalité marocaine (IS, TVA) et l'analyse multi-fournisseur de paiements.

Tu analyses les données financières d'une plateforme SaaS et génères un rapport structuré au format JSON strict.

Règles :
- Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks, sans texte avant ou après.
- Utilise le MAD (Dirham marocain) comme référence monétaire.
- Applique les taux fiscaux marocains actuels (IS : 20-31%, TVA : 7/10/14/20%).
- Sois précis, professionnel et orienté action.
- Les insights doivent être des analyses concrètes basées sur les données fournies.
- Les risques doivent être des alertes spécifiques et mesurables.
- Les recommandations doivent être des actions concrètes et quantifiées quand possible.
- Le healthScore (0-100) doit refléter la santé financière globale.
- Le forecast doit être réaliste, basé sur les tendances observées.

Format de réponse JSON attendu :
{
  "insights": ["...", "...", "...", "..."],
  "risks": ["...", "..."],
  "recommendations": ["...", "...", "..."],
  "forecast": {
    "nextMonthRevenue": <nombre>,
    "confidence": <nombre 0-100>,
    "projectedMRR": <nombre>
  },
  "healthScore": <nombre 0-100>,
  "summary": "..."
}

L'array insights doit contenir 4-5 éléments, risks 2-3 éléments, recommendations 3-4 éléments.`

function buildPrompt(data: RequestBody): string {
  const txnSummary = data.recentTransactions.slice(0, 10).map((t, i) =>
    `${i + 1}. ${t.clientName ?? 'Client inconnu'} — ${t.amountMAD ?? 0} MAD (${t.status ?? 'N/A'}, ${t.provider ?? 'N/A'}, plan: ${t.plan ?? 'N/A'})`
  ).join('\n')

  const revHistory = data.monthlyRevenue.map(m => `${m.month}: ${m.amount} MAD`).join(', ')

  const margin = data.revenue > 0 ? Math.round(((data.revenue - data.expenses) / data.revenue) * 10000) / 100 : 0

  return `Analyse les données financières suivantes de la plateforme BazNova :

--- DONNÉES ---
- Revenu total du mois : ${data.revenue} MAD
- MRR (Revenu Mensuel Récurrent) : ${data.mrr} MAD
- Abonnements actifs : ${data.subscriptions}
- Tendance revenus (MoM) : ${data.revenueTrend > 0 ? '+' : ''}${data.revenueTrend}%
- Tendance abonnements (MoM) : ${data.subscriptionTrend > 0 ? '+' : ''}${data.subscriptionTrend}%
- Dépenses estimées : ${data.expenses} MAD
- Marge brute estimée : ${data.revenue - data.expenses} MAD (${margin}%)

- Historique revenus (6 derniers mois) : ${revHistory}

- Dernières transactions :
${txnSummary || 'Aucune transaction récente.'}

--- FIN DONNÉES ---

Génère l'analyse financière complète au format JSON demandé.`
}

function generateFallback(data: RequestBody): AiInsights {
  const margin = data.revenue > 0 ? Math.round(((data.revenue - data.expenses) / data.revenue) * 10000) / 100 : 0
  const lastMonth = data.monthlyRevenue.length >= 2 ? data.monthlyRevenue[data.monthlyRevenue.length - 2].amount : data.revenue
  const avgGrowth = data.monthlyRevenue.length >= 3
    ? data.monthlyRevenue.slice(-3).reduce((sum, m, i, arr) => {
        if (i === 0) return 0
        const prev = arr[i - 1].amount
        return sum + (prev > 0 ? (m.amount - prev) / prev : 0)
      }, 0) / Math.min(data.monthlyRevenue.length - 1, 2)
    : data.revenueTrend / 100

  const nextRev = Math.round(data.revenue * (1 + avgGrowth) * 100) / 100
  const projectedMRR = Math.round(data.mrr * (1 + avgGrowth * 0.8) * 100) / 100

  const failedTxns = data.recentTransactions.filter(t => t.status === 'failed').length
  const totalTxns = data.recentTransactions.length
  const failRate = totalTxns > 0 ? Math.round((failedTxns / totalTxns) * 10000) / 100 : 0

  let healthScore = 50
  healthScore += data.revenueTrend > 0 ? Math.min(data.revenueTrend, 20) : Math.max(data.revenueTrend, -20)
  healthScore += data.subscriptionTrend > 0 ? Math.min(data.subscriptionTrend, 10) : Math.max(data.subscriptionTrend, -10)
  healthScore += margin > 40 ? 15 : margin > 20 ? 10 : margin > 0 ? 5 : -15
  healthScore -= failRate > 10 ? 15 : failRate > 5 ? 8 : 0
  healthScore = Math.max(0, Math.min(100, Math.round(healthScore)))

  const arpu = data.subscriptions > 0 ? Math.round(data.mrr / data.subscriptions) : 0

  return {
    insights: [
      `Le revenu mensuel atteint ${data.revenue.toLocaleString('fr-FR')} MAD avec une tendance de ${data.revenueTrend > 0 ? '+' : ''}${data.revenueTrend}% par rapport au mois précédent.`,
      `Le MRR s'établit à ${data.mrr.toLocaleString('fr-FR')} MAD pour ${data.subscriptions} abonnements actifs, soit un ARPU moyen de ${arpu} MAD.`,
      `La marge brute estimée est de ${margin}% (${(data.revenue - data.expenses).toLocaleString('fr-FR')} MAD), ${margin >= 40 ? 'ce qui est sain pour une activité SaaS.' : 'ce qui nécessite une attention particulière pour optimiser les coûts.'}`,
      totalTxns > 0
        ? `Sur les ${totalTxns} dernières transactions, ${failedTxns} ont échoué (${failRate}%), ${failRate > 5 ? 'indiquant un problème potentiel avec les fournisseurs de paiement.' : 'un taux acceptable.'}`
        : 'Aucune transaction récente à analyser.',
      `La base d'abonnements ${data.subscriptionTrend > 0 ? 'croît' : 'décroît'} de ${Math.abs(data.subscriptionTrend)}% MoM, ${data.subscriptionTrend >= 5 ? 'signant une dynamique commerciale positive.' : data.subscriptionTrend > 0 ? 'une croissance modérée à surveiller.' : 'nécessitant une action corrective rapide.'}`,
    ],
    risks: [
      ...(data.revenueTrend < -5 ? [`Baisse significative du revenu de ${Math.abs(data.revenueTrend)}% — risque de diminution du MRR si la tendance se poursuit.`] : []),
      ...(failedTxns > 0 ? [`${failedTxns} transactions échouées récemment — vérifier les taux d'échec par fournisseur (CMI, PayMob, Stripe).`] : []),
      ...(margin < 20 ? [`Marge brute faible à ${margin}% — attention à la pression fiscale IS/TVA qui pourrait réduire la rentabilité nette.`] : []),
      ...(data.subscriptions < 10 ? [`Base d'abonnements limitée (${data.subscriptions}) — forte dépendance à quelques clients, risque de concentration.`] : []),
    ].slice(0, 3),
    recommendations: [
      data.revenueTrend < 10 ? 'Lancer une campagne de montée en gamme (upsell) vers les plans Annuel et Enterprise pour booster le MRR de 15-20%.' : 'Maintenir la dynamique de croissance en renforçant les canaux d\'acquisition actuels.',
      failedTxns > 0 ? `Investiguer et résoudre les échecs de paiement — contacter les fournisseurs concernés et implémenter des retry automatiques.` : 'Mettre en place un système de retry automatique pour les paiements échoués afin de réduire le churn involontaire.',
      `Optimiser la déclaration TVA : avec un revenu de ${data.revenue.toLocaleString('fr-FR')} MAD, anticiper la TVA collectée et vérifier les taux applicables (7/10/14/20%).`,
      `Réviser la politique tarifaire : l'ARPU de ${arpu} MAD ${arpu < 200 ? 'est en dessous du marché SaaS marocain — envisager une hausse de 10-15%.' : 'est compétitif — maintenir et axer sur le volume.'}`,
    ].slice(0, 4),
    forecast: {
      nextMonthRevenue: nextRev,
      confidence: Math.min(95, Math.max(40, Math.round(85 - Math.abs(data.revenueTrend) * 0.5 - failRate * 2))),
      projectedMRR,
    },
    healthScore,
    summary: `BazNova affiche un revenu de ${data.revenue.toLocaleString('fr-FR')} MAD avec ${data.subscriptions} abonnements actifs et un MRR de ${data.mrr.toLocaleString('fr-FR')} MAD. ${data.revenueTrend >= 0 ? 'La tendance est positive' : 'La tendance est à la baisse'} (${data.revenueTrend > 0 ? '+' : ''}${data.revenueTrend}%), ${margin >= 30 ? 'avec une marge brute saine' : 'avec une marge à optimiser'} de ${margin}%. ${failedTxns > 0 ? `Attention : ${failedTxns} transactions échouées nécessitent une investigation.` : "Le taux d'échec des paiements est sous contrôle."}`,
  }
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json()

    const { revenue, mrr, subscriptions, revenueTrend, subscriptionTrend, recentTransactions, monthlyRevenue, expenses } = body

    if (typeof revenue !== 'number' || typeof mrr !== 'number') {
      return NextResponse.json({ error: 'Champs revenue et mrr requis (nombre).' }, { status: 400 })
    }

    const prompt = buildPrompt({
      revenue,
      mrr,
      subscriptions: subscriptions ?? 0,
      revenueTrend: revenueTrend ?? 0,
      subscriptionTrend: subscriptionTrend ?? 0,
      recentTransactions: recentTransactions ?? [],
      monthlyRevenue: monthlyRevenue ?? [],
      expenses: expenses ?? 0,
    })

    let aiResponse: AiInsights

    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      })

      const text = completion.choices?.[0]?.message?.content?.trim() || ''
      const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
      const parsed = JSON.parse(cleaned) as Partial<AiInsights>

      const insights = Array.isArray(parsed.insights) && parsed.insights.length > 0
        ? parsed.insights.slice(0, 5).map(String)
        : null
      const risks = Array.isArray(parsed.risks) && parsed.risks.length > 0
        ? parsed.risks.slice(0, 3).map(String)
        : null
      const recommendations = Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0
        ? parsed.recommendations.slice(0, 4).map(String)
        : null
      const summary = typeof parsed.summary === 'string' && parsed.summary.length > 0 ? parsed.summary : null

      if (!insights || !risks || !recommendations || !summary) {
        throw new Error('Réponse IA incomplète')
      }

      aiResponse = {
        insights,
        risks,
        recommendations,
        forecast: {
          nextMonthRevenue: typeof parsed.forecast?.nextMonthRevenue === 'number' ? parsed.forecast.nextMonthRevenue : 0,
          confidence: typeof parsed.forecast?.confidence === 'number' ? Math.max(0, Math.min(100, parsed.forecast.confidence)) : 70,
          projectedMRR: typeof parsed.forecast?.projectedMRR === 'number' ? parsed.forecast.projectedMRR : 0,
        },
        healthScore: typeof parsed.healthScore === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.healthScore))) : 50,
        summary,
      }
    } catch {
      aiResponse = generateFallback({ revenue, mrr, subscriptions, revenueTrend, subscriptionTrend, recentTransactions, monthlyRevenue, expenses })
    }

    return NextResponse.json(aiResponse)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: `Erreur analyse IA : ${message}` }, { status: 500 })
  }
}
