'use client'

import { useState } from 'react'
import { Star, ThumbsUp, ThumbsDown, Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { t } from '@/lib/i18n'
import { useCVStore } from '@/store/cv-store'

interface SatisfactionPromptProps {
  open: boolean
  onClose: () => void
  type: 'cv' | 'cover_letter'
  itemId?: string
}

export default function SatisfactionPrompt({ open, onClose, type, itemId }: SatisfactionPromptProps) {
  const { language } = useCVStore()
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const title = type === 'cv' ? t(language, 'satTitleCv') : t(language, 'satTitleCoverLetter')

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error(t(language, 'satPleaseRate'))
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/satisfaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          itemId,
          rating,
          comment: comment.trim() || undefined,
        }),
      })
      if (res.ok) {
        setSubmitted(true)
        setTimeout(() => {
          onClose()
          setSubmitted(false)
          setRating(0)
          setComment('')
        }, 2000)
      }
    } catch {
      toast.error(t(language, 'satError'))
    } finally {
      setLoading(false)
    }
  }

  const ratingLabels = [
    '',
    t(language, 'satVeryDissatisfied'),
    t(language, 'satDissatisfied'),
    t(language, 'satNeutral'),
    t(language, 'satSatisfied'),
    t(language, 'satVerySatisfied'),
  ]

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        {submitted ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <ThumbsUp className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold mb-2">{t(language, 'satThankYou')}</h3>
            <p className="text-sm text-muted-foreground">{t(language, 'satHelpImprove')}</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100">
                  <Star className="w-5 h-5 text-amber-600" />
                </div>
                {type === 'cv' ? t(language, 'satHowRateCv') : t(language, 'satHowRateCoverLetter')}
              </DialogTitle>
              <DialogDescription>
                {t(language, 'satFeedbackValuable')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {/* Star Rating */}
              <div className="flex items-center justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    className="p-1 transition-transform hover:scale-110 cursor-pointer"
                  >
                    <Star
                      className={`w-10 h-10 transition-colors ${
                        star <= (hovered || rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-stone-300'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {rating > 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  {ratingLabels[rating]}
                </p>
              )}

              {/* Optional Comment */}
              {rating > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t(language, 'satCommentLabel')}</Label>
                  <Textarea
                    placeholder={t(language, 'satCommentPlaceholder')}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={loading || rating === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Send className="mr-2 w-4 h-4" />}
                {t(language, 'satSubmit')}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
