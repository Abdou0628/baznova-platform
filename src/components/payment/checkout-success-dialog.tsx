'use client'

import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CircleCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

// ── Props ────────────────────────────────────────────────────────────────────

interface CheckoutSuccessDialogProps {
  open: boolean
  onClose: () => void
  planName: string
  amount: number   // in cents
  currency: string // 'EUR' | 'MAD' | 'USD'
}

// ── Currency Formatting ──────────────────────────────────────────────────────

const CURRENCY_CONFIG: Record<string, { locale: string }> = {
  EUR: { locale: 'fr-FR' },
  USD: { locale: 'en-US' },
  MAD: { locale: 'fr-MA' },
  GBP: { locale: 'en-GB' },
}

function formatPrice(amount: number, currency: string): string {
  const config = CURRENCY_CONFIG[currency.toUpperCase()] ?? CURRENCY_CONFIG.EUR
  const value = amount / 100

  if (currency.toUpperCase() === 'MAD') {
    return `${value.toFixed(value % 1 === 0 ? 0 : 2)} MAD`
  }

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(value)
}

// ── Animation Variants ───────────────────────────────────────────────────────

const checkmarkVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 15,
      delay: 0.1,
    },
  },
}

const contentVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.3, duration: 0.4 },
  },
}

// ── Component ────────────────────────────────────────────────────────────────

export function CheckoutSuccessDialog({
  open,
  onClose,
  planName,
  amount,
  currency,
}: CheckoutSuccessDialogProps) {
  const { language, setStep } = useCVStore()

  const handleGoToDashboard = useCallback(() => {
    // Navigate to the user dashboard using the app step system
    setStep('dashboard')
    onClose()
  }, [onClose, setStep])

  const priceDisplay = formatPrice(amount, currency)

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={false}
      >
        <AnimatePresence>
          {open && (
            <div className="flex flex-col items-center py-4">
              {/* Animated checkmark */}
              <motion.div
                variants={checkmarkVariants}
                initial="hidden"
                animate="visible"
                className="mb-4"
              >
                <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
                  <CircleCheck className="size-10 text-emerald-500" />
                </div>
              </motion.div>

              {/* Title and description */}
              <motion.div
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                className="w-full text-center"
              >
                <DialogHeader className="items-center">
                  <DialogTitle className="text-xl font-bold text-gray-900">
                    {t(language, 'uco.successTitle')}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-500">
                    {t(language, 'uco.successDesc')}
                  </DialogDescription>
                </DialogHeader>

                <Separator className="my-4" />

                {/* Plan summary */}
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{planName}</span>
                    <span className="text-sm font-semibold text-gray-900">{priceDisplay}</span>
                  </div>
                </div>

                <Separator className="my-4" />

                <DialogFooter className="flex-col gap-2 sm:flex-col">
                  <Button
                    onClick={handleGoToDashboard}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md hover:from-emerald-600 hover:to-emerald-700"
                    size="lg"
                  >
                    {t(language, 'uco.accessDashboard')}
                  </Button>
                  <Button
                    onClick={onClose}
                    variant="ghost"
                    className="w-full text-gray-500 hover:text-gray-700"
                    size="default"
                  >
                    {t(language, 'uco.close')}
                  </Button>
                </DialogFooter>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
