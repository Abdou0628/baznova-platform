'use client'

import { Lightbulb, Sparkles, ArrowRight } from 'lucide-react'
import type { CVLanguage } from '@/lib/i18n'
import type { PersonaSuggestion } from '@/lib/persona-engine'

interface SuggestionCardProps {
  suggestion: PersonaSuggestion
  language: CVLanguage
  onATS: () => void
  onCareer: () => void
  onInterview: () => void
}

const categoryColors: Record<string, string> = {
  cv: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  cl: 'bg-blue-50 border-blue-200 text-blue-700',
  ats: 'bg-violet-50 border-violet-200 text-violet-700',
  career: 'bg-amber-50 border-amber-200 text-amber-700',
  interview: 'bg-rose-50 border-rose-200 text-rose-700',
}
const categoryKeyMap: Record<string, string> = {
  cv: 'previewSuggestCv',
  cl: 'previewSuggestCl',
  ats: 'previewSuggestAts',
  career: 'previewSuggestCareer',
  interview: 'previewSuggestInterview',
}
const priorityStyles: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
}
export default function SuggestionCard({ suggestion, language, onATS, onCareer, onInterview }: SuggestionCardProps) {
  const catColor = categoryColors[suggestion.category] || categoryColors.cv
  const catLabel = categoryKeyMap[suggestion.category] || 'CV'
  const pStyle = priorityStyles[suggestion.priority] || priorityStyles.low
  const isClickable = suggestion.category !== 'cv' && suggestion.category !== 'cl'

  const handleClick = () => {
    if (suggestion.category === 'ats') onATS()
    else if (suggestion.category === 'career') onCareer()
    else if (suggestion.category === 'interview') onInterview()
  }

  return (
    <div
      onClick={isClickable ? handleClick : undefined}
      className={`flex items-start gap-2 p-3 rounded-lg border ${catColor} ${isClickable ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] font-semibold uppercase">{catLabel}</span>
          <span className={`text-[9px] px-1.5 py-0 rounded-full border ${pStyle}`}>{suggestion.priority === 'high' ? '!' : '●'}</span>
        </div>
        <p className="text-xs font-medium">{suggestion.label[language] ?? suggestion.label.fr}</p>
        <p className="text-[10px] mt-0.5 opacity-80 line-clamp-2">{suggestion.description[language] ?? suggestion.description.fr}</p>
      </div>
      {isClickable && <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-50" />}
    </div>
  )
}
