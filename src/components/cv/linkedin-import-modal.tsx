'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Linkedin, ArrowLeft, X, Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useCVStore } from '@/store/cv-store'

interface LinkedInImportModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function LinkedInImportModal({ isOpen, onClose }: LinkedInImportModalProps) {
  const { formData, updateFormData } = useCVStore()
  const [step, setStep] = useState<'choose' | 'importing' | 'success' | 'error'>('choose')
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setStep('importing')
    setError(null)

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)

      const res = await fetch('/api/import-cv', {
        method: 'POST',
        body: formDataUpload,
      })

      if (!res.ok) {
        throw new Error("Erreur lors de l'import")
      }

      const data = await res.json()

      if (data.success && data.profile) {
        // Auto-fill form fields from parsed CV
        const profile = data.profile
        const updates: Record<string, string> = {}
        if (profile.fullName) updates.fullName = profile.fullName
        if (profile.email) updates.email = profile.email
        if (profile.phone) updates.phone = profile.phone
        if (profile.location) updates.location = profile.location
        if (profile.linkedin) updates.linkedin = profile.linkedin
        if (profile.targetJob) updates.targetJob = profile.targetJob
        if (profile.industry) updates.industry = profile.industry
        if (profile.summary) updates.summary = profile.summary
        if (profile.experience) updates.experience = profile.experience
        if (profile.education) updates.education = profile.education
        if (profile.skills) updates.skills = profile.skills
        if (profile.languages) updates.languages = profile.languages

        updateFormData(updates)
        setStep('success')
        toast.success('CV importé avec succès ! Les champs ont été remplis automatiquement.')
      } else {
        throw new Error(data.error || "Impossible d'analyser le fichier")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setStep('error')
      toast.error("Erreur lors de l'import du CV")
    }
  }, [updateFormData])

  const handleClose = useCallback(() => {
    setStep('choose')
    setError(null)
    onClose()
  }, [onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-sky-500 to-sky-600 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Linkedin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Importer depuis LinkedIn</h2>
                    <p className="text-sm text-sky-100">Importez votre profil LinkedIn ou CV existant</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                {step === 'choose' && (
                  <motion.div
                    key="choose"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <div className="space-y-4">
                      {/* File upload option */}
                      <Card className="border-2 border-dashed border-sky-200 hover:border-sky-400 transition-colors cursor-pointer group"
                        onClick={() => document.getElementById('cv-upload-input')?.click()}
                      >
                        <CardContent className="p-6 text-center">
                          <div className="w-14 h-14 rounded-full bg-sky-50 flex items-center justify-center mx-auto mb-3 group-hover:bg-sky-100 transition-colors">
                            <Upload className="w-7 h-7 text-sky-600" />
                          </div>
                          <h3 className="font-semibold text-foreground mb-1">Importer un CV</h3>
                          <p className="text-sm text-muted-foreground">
                            PDF, Word ou fichier texte
                          </p>
                          <Badge className="mt-2 bg-sky-100 text-sky-700 hover:bg-sky-100">PDF • DOCX • TXT</Badge>
                        </CardContent>
                      </Card>
                      <input
                        id="cv-upload-input"
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </div>
                  </motion.div>
                )}

                {step === 'importing' && (
                  <motion.div
                    key="importing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-12 text-center"
                  >
                    <Loader2 className="w-12 h-12 text-sky-600 animate-spin mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">Analyse en cours...</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      L'IA extrait vos informations du document
                    </p>
                  </motion.div>
                )}

                {step === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-8 text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-9 h-9 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Import réussi !</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vos informations ont été extraites et remplies automatiquement.
                    </p>
                    <div className="flex gap-3 mt-6 justify-center">
                      {/* VISIBLE GREEN BACK BUTTON */}
                      <Button
                        onClick={handleClose}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-600/25 transition-all cursor-pointer text-base"
                      >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Continuer
                      </Button>
                    </div>
                  </motion.div>
                )}

                {step === 'error' && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-8 text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-9 h-9 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Erreur d'import</h3>
                    <p className="text-sm text-muted-foreground mt-1">{error}</p>
                    <div className="flex gap-3 mt-6 justify-center">
                      <Button
                        variant="outline"
                        onClick={() => setStep('choose')}
                        className="px-6 py-3 rounded-xl font-semibold cursor-pointer"
                      >
                        Réessayer
                      </Button>
                      {/* VISIBLE GREEN BACK BUTTON */}
                      <Button
                        onClick={handleClose}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
                      >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Retour
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer with prominent green back button */}
            {step === 'choose' && (
              <div className="px-6 pb-6">
                <Button
                  onClick={handleClose}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-semibold shadow-lg shadow-emerald-600/25 transition-all cursor-pointer text-base"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Retour au formulaire
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
