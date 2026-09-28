'use client'

import { motion } from 'framer-motion'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import Image from 'next/image'
import { FileText, Sparkles, PenLine } from 'lucide-react'

export default function Generating() {
  const { language, isCLGenerating } = useCVStore()
  const generatingBoth = isCLGenerating

  const stepKeysBoth = ['cvGenStepAnalyzeProfile', 'cvGenStepWriteCv', 'cvGenStepWriteCl', 'cvGenStepFormatting'] as const
  const stepKeysCvOnly = ['cvGenStepAnalyzeProfile', 'cvGenStepOptimizeContent', 'cvGenStepWriteSections', 'cvGenStepFormatting'] as const
  const cvSteps = (generatingBoth ? stepKeysBoth : stepKeysCvOnly).map(key => ({ label: t(language, key) }))

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50/30 to-amber-50/20 px-4">
      {/* Background image */}
      <div className="absolute inset-0 -z-10">
        <Image src="/images/hero-cv.jpg" alt="" fill className="object-cover opacity-10" />
      </div>
      <motion.div
        className="text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
      {/* Logo */}
      <div className="flex flex-col items-center mb-6">
        <Image src="/hirenova-logo.png" alt="HireNova" width={48} height={48} className="rounded-xl shadow-md" />
        <span className="text-[10px] font-semibold text-emerald-600 tracking-widest mt-1">{t(language, 'poweredByIa')}</span>
      </div>

      {/* Animated icon */}
        <div className="relative mb-8">
          <motion.div
            className="w-24 h-24 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            {generatingBoth ? (
              <div className="flex items-center gap-1">
                <FileText className="w-10 h-10 text-emerald-600" />
                <PenLine className="w-10 h-10 text-emerald-400" />
              </div>
            ) : (
              <FileText className="w-12 h-12 text-emerald-600" />
            )}
          </motion.div>
          <motion.div
            className="absolute -top-1 -right-1"
            animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </motion.div>
          {/* Pulse rings */}
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-emerald-200"
            animate={{ scale: [1, 1.3, 1.5], opacity: [0.6, 0.2, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          />
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">
          {generatingBoth ? t(language, 'generatingBoth') : t(language, 'generating')}
        </h2>
        <p className="text-muted-foreground mb-4">
          {generatingBoth ? t(language, 'generatingBothSubtitle') : t(language, 'generatingSubtitle')}
        </p>
        <p className="text-emerald-600 text-sm italic max-w-sm mx-auto">{t(language, 'cvGenQuote')}</p>

        {/* Animated steps */}
        <div className="space-y-3 max-w-xs mx-auto text-left">
          {cvSteps.map((step, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.5 }}
            >
              <motion.div
                className="w-6 h-6 rounded-full border-2 border-emerald-300 flex items-center justify-center shrink-0"
                animate={{
                  borderColor: ['#d1fae5', '#059669', '#d1fae5'],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: 'easeInOut',
                }}
              >
                <motion.div
                  className="w-2 h-2 rounded-full bg-emerald-500"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.3,
                  }}
                />
              </motion.div>
              <span className="text-sm text-muted-foreground">{step.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Loading bar */}
        <div className="mt-8 w-64 h-1.5 bg-muted rounded-full overflow-hidden mx-auto">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '60%' }}
          />
        </div>
      </motion.div>
    </div>
  )
}