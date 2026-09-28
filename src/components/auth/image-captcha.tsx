'use client'

import { useState, useCallback, useMemo } from 'react'
import { RefreshCw, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react'
import { t, type TranslationKey } from '@/lib/i18n'

// Category definitions with emojis and labels
const CATEGORIES = [
  {
    id: 'cats',
    label: { fr: 'Chats', en: 'Cats', ar: 'قطط', es: 'Gatos' },
    emojis: ['🐱', '🐈', '😺', '😸', '😻', '🙀', '😿', '😾'],
    bgColors: ['bg-amber-50', 'bg-orange-50', 'bg-yellow-50', 'bg-lime-50'],
  },
  {
    id: 'dogs',
    label: { fr: 'Chiens', en: 'Dogs', ar: 'كلاب', es: 'Perros' },
    emojis: ['🐶', '🐕', '🐩', '🦮', '🐕‍🦺', '🐕', '🐾', '🦴'],
    bgColors: ['bg-blue-50', 'bg-cyan-50', 'bg-sky-50', 'bg-indigo-50'],
  },
  {
    id: 'cars',
    label: { fr: 'Voitures', en: 'Cars', ar: 'سيارات', es: 'Coches' },
    emojis: ['🚗', '🚕', '🚙', '🏎️', '🚓', '🚑', '🚒', '🚐'],
    bgColors: ['bg-red-50', 'bg-rose-50', 'bg-pink-50', 'bg-fuchsia-50'],
  },
  {
    id: 'fruits',
    label: { fr: 'Fruits', en: 'Fruits', ar: 'فواكه', es: 'Frutas' },
    emojis: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓'],
    bgColors: ['bg-green-50', 'bg-emerald-50', 'bg-teal-50', 'bg-lime-50'],
  },
  {
    id: 'flowers',
    label: { fr: 'Fleurs', en: 'Flowers', ar: 'زهور', es: 'Flores' },
    emojis: ['🌸', '🌺', '🌻', '🌹', '🌷', '🌼', '🪻', '💐'],
    bgColors: ['bg-pink-50', 'bg-fuchsia-50', 'bg-purple-50', 'bg-violet-50'],
  },
  {
    id: 'sports',
    label: { fr: 'Sports', en: 'Sports', ar: 'رياضات', es: 'Deportes' },
    emojis: ['⚽', '🏀', '🎾', '🏐', '🏈', '🎱', '🏓', '🏸'],
    bgColors: ['bg-sky-50', 'bg-blue-50', 'bg-indigo-50', 'bg-cyan-50'],
  },
]

// All distractor emojis from OTHER categories
const ALL_EMOJIS: Record<string, string[]> = {}
CATEGORIES.forEach((cat) => {
  ALL_EMOJIS[cat.id] = cat.emojis
})

interface ImageCaptchaProps {
  lang: string
  onVerified: () => void
  onError?: () => void
}

interface TileData {
  emoji: string
  isCorrect: boolean
  bg: string
  id: number
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export default function ImageCaptcha({ lang, onVerified, onError }: ImageCaptchaProps) {
  const [tiles, setTiles] = useState<TileData[]>(() => generateChallenge())
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState(false)
  const [animating, setAnimating] = useState(false)

  // Get the current category (the correct one)
  const category = useMemo(() => {
    const correctTile = tiles.find((t) => t.isCorrect)
    if (!correctTile) return null
    const catId = CATEGORIES.find((c) => c.emojis.includes(correctTile.emoji))?.id
    return CATEGORIES.find((c) => c.id === catId) || null
  }, [tiles])

  const correctCount = tiles.filter((t) => t.isCorrect).length
  
const categoryLabel = t(lang, ('captchaCat' + category?.id) as TranslationKey)

  function generateChallenge(): TileData[] {
    // Pick a random category as the target
    const targetCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
    const otherCategories = CATEGORIES.filter((c) => c.id !== targetCategory.id)

    // Pick 3 correct emojis from target category
    const correctEmojis = shuffleArray(targetCategory.emojis).slice(0, 3)

    // Pick 6 distractor emojis from other categories
    const distractorEmojis: { emoji: string; bg: string }[] = []
    for (const otherCat of shuffleArray(otherCategories)) {
      if (distractorEmojis.length >= 6) break
      const count = Math.min(2, 6 - distractorEmojis.length)
      const picked = shuffleArray(otherCat.emojis).slice(0, count)
      picked.forEach((emoji) => {
        const bg = otherCat.bgColors[Math.floor(Math.random() * otherCat.bgColors.length)]
        distractorEmojis.push({ emoji, bg })
      })
    }

    const allTiles: TileData[] = []
    let id = 0

    correctEmojis.forEach((emoji) => {
      allTiles.push({
        emoji,
        isCorrect: true,
        bg: targetCategory.bgColors[Math.floor(Math.random() * targetCategory.bgColors.length)],
        id: id++,
      })
    })

    distractorEmojis.slice(0, 6).forEach((d) => {
      allTiles.push({
        emoji: d.emoji,
        isCorrect: false,
        bg: d.bg,
        id: id++,
      })
    })

    return shuffleArray(allTiles)
  }

  const toggleTile = useCallback(
    (tileId: number) => {
      if (verified || animating) return
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(tileId)) {
          next.delete(tileId)
        } else {
          next.add(tileId)
        }
        return next
      })
      setError(false)
    },
    [verified, animating]
  )

  const handleVerify = useCallback(() => {
    if (verified || animating) return

    const selectedTiles = tiles.filter((t) => selected.has(t.id))
    const correctTiles = tiles.filter((t) => t.isCorrect)
    const allCorrectSelected = correctTiles.every((t) => selected.has(t.id))
    const noIncorrectSelected = selectedTiles.every((t) => t.isCorrect)

    if (allCorrectSelected && noIncorrectSelected) {
      setVerified(true)
      setAnimating(true)
      onVerified()
      setTimeout(() => setAnimating(false), 600)
    } else {
      setError(true)
      onError?.()
      // Auto-clear error after 2 seconds
      setTimeout(() => setError(false), 2000)
    }
  }, [tiles, selected, verified, animating, onVerified, onError])

  const handleRefresh = useCallback(() => {
    if (animating) return
    setTiles(generateChallenge())
    setSelected(new Set())
    setVerified(false)
    setError(false)
  }, [animating])

  return (
    <div className="space-y-3">
      {/* Label & instruction */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          {t(lang as 'fr' | 'en' | 'ar' | 'es', 'captchaSelectImages')} {categoryLabel}
        </label>
        <button
          type="button"
          onClick={handleRefresh}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
          aria-label={t(lang as 'fr' | 'en' | 'ar' | 'es', 'captchaRefreshAriaLabel')}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Selection count */}
      <p className="text-xs text-muted-foreground">
        {selected.size} {t(lang as 'fr' | 'en' | 'ar' | 'es', 'captchaXofYSelected')} {correctCount} {lang === 'ar' ? 'محدد' : lang === 'es' ? 'seleccionados' : lang === 'en' ? 'selected' : 'sélectionnés'}
      </p>

      {/* 3x3 Image grid */}
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((tile) => {
          const isSelected = selected.has(tile.id)
          const isWrong = error && isSelected && !tile.isCorrect
          const isMissed = error && !isSelected && tile.isCorrect

          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => toggleTile(tile.id)}
              disabled={verified || animating}
              className={
                `relative aspect-square rounded-xl border-2 transition-all duration-200 cursor-pointer overflow-hidden group `
                +
                (verified && isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                  : isWrong
                    ? 'border-red-400 ring-2 ring-red-400/30'
                    : isMissed
                      ? 'border-amber-400 ring-2 ring-amber-400/30'
                      : isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50'
                        : 'border-border hover:border-emerald-300 hover:ring-1 hover:ring-emerald-300/20')
              }
            >
              {/* Background */}
              <div className={`absolute inset-0 ${tile.bg}`} />

              {/* Emoji as image */}
              <div className="relative flex items-center justify-center w-full h-full">
                <span className="text-3xl sm:text-4xl select-none transition-transform duration-200 group-hover:scale-110">
                  {tile.emoji}
                </span>
              </div>

              {/* Selection checkmark overlay */}
              {(isSelected || (verified && tile.isCorrect)) && (
                <div className="absolute top-1 right-1">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shadow-sm ${
                      isWrong ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                  >
                    {isWrong ? (
                      <XCircle className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    )}
                </div>
              </div>
              )}

              {/* Wrong flash overlay */}
              {isWrong && (
                <div className="absolute inset-0 bg-red-100/50" />
              )}
            </button>
          )
        })}
      </div>

      {/* Verify button */}
      {!verified && (
        <button
          type="button"
          onClick={handleVerify}
          disabled={selected.size === 0 || animating}
          className={
            `w-full py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer `
            +
            (selected.size === 0
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]')
          }
        >
          {t(lang as 'fr' | 'en' | 'ar' | 'es', 'captchaVerifyBtn')}
        </button>
      )}

      {/* Status messages */}
      {verified && (
        <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {t(lang as 'fr' | 'en' | 'ar' | 'es', 'captchaVerifiedSuccess')}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
          <XCircle className="w-4 h-4 shrink-0" />
          {t(lang as 'fr' | 'en' | 'ar' | 'es', 'captchaWrongSelection')}
        </div>
      )}
    </div>
  )
}
