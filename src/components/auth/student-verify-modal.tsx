'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  GraduationCap, Upload, Mail, School, X, CheckCircle2,
  Loader2, Clock, AlertCircle, ArrowRight,
} from 'lucide-react'
import { t } from '@/lib/i18n'
import type { CVLanguage, TranslationKey } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

/* Academic email domains for auto-verification */
const ACADEMIC_DOMAINS = [
  // Morocco
  '.ac.ma', '.univ.ma', '.uae.ac.ma', '.uh1.ac.ma', '.uh2.ac.ma',
  '.ensam.ma', '.emi.ac.ma', '.inpt.ac.ma', '.ensa.ac.ma', '.um5.ac.ma',
  '.um6p.ma', '.ueuromed.org',
  // France
  '.edu', '.ac.fr', '.univ-paris.fr', '.universite-paris.fr',
  '.ens.fr', '.polytechnique.fr', '.inria.fr', '.cnrs.fr',
  // UK
  '.ac.uk', '.ox.ac.uk', '.cam.ac.uk',
  // USA
  '.edu',
  // Spain
  '.es', '.upv.es', '.ub.edu', '.ucm.es',
  // GCC / MENA
  '.edu.sa', '.edu.ae', '.edu.kw', '.edu.qa', '.edu.bh', '.edu.om',
  '.edu.eg', '.edu.tn', '.edu.dz',
  // Generic
  '.edu.', '.ac.', '.university.', '.campus.',
]

interface StudentVerifyModalProps {
  isOpen: boolean
  onClose: () => void
  language: CVLanguage
  userId?: string
  userEmail?: string
}

export default function StudentVerifyModal({
  isOpen,
  onClose,
  language,
  userId,
  userEmail,
}: StudentVerifyModalProps) {
  const [step, setStep] = useState<'form' | 'sent' | 'verified' | 'pending' | 'rejected'>('form')
  const [academicEmail, setAcademicEmail] = useState('')
  const [docBase64, setDocBase64] = useState<string | null>(null)
  const [docName, setDocName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const isAcademicDomain = (email: string) => {
    return ACADEMIC_DOMAINS.some(d => email.toLowerCase().includes(d))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error(language === 'fr' ? 'Fichier trop volumineux (max 10 Mo)' : 'File too large (max 10 MB)')
      return
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowed.includes(file.type)) {
      toast.error(language === 'fr' ? 'Format non supporté (JPG, PNG, PDF uniquement)' : 'Unsupported format (JPG, PNG, PDF only)')
      return
    }

    setUploading(true)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setDocBase64(ev.target?.result as string)
      setDocName(file.name)
      setUploading(false)
      toast.success(language === 'fr' ? 'Document chargé' : 'Document uploaded')
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!academicEmail && !docBase64) {
      toast.error(language === 'fr' ? 'Renseignez au moins un justificatif' : 'Provide at least one proof')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/student-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userEmail,
          academicEmail,
          documentBase64: docBase64,
          documentName: docName,
        }),
      })

      const data = await res.json()
      if (data.autoVerified) {
        setStep('verified')
      } else if (data.submitted) {
        setStep('sent')
      }
    } catch {
      toast.error(language === 'fr' ? 'Erreur serveur, réessayez' : 'Server error, please retry')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="border-2 border-emerald-200 bg-white shadow-2xl">
          <CardContent className="p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-600/20">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{t(language, 'studentVerifyTitle')}</h2>
                  <p className="text-xs text-muted-foreground">{t(language, 'studentVerifySubtitle')}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {step === 'form' && (
              <div className="space-y-5">
                {/* Method 1: Academic email */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Mail className="w-4 h-4 text-emerald-600" />
                    {t(language, 'studentVerifyEmail')}
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                      {language === 'fr' ? 'Auto' : language === 'ar' ? 'تلقائي' : language === 'es' ? 'Auto' : 'Auto'}
                    </Badge>
                  </Label>
                  <Input
                    type="email"
                    value={academicEmail}
                    onChange={(e) => setAcademicEmail(e.target.value)}
                    placeholder={t(language, 'studentVerifyEmailPlaceholder')}
                    className="rounded-xl border-emerald-200 focus:border-emerald-400"
                  />
                  {academicEmail && (
                    <p className={`text-[11px] ${isAcademicDomain(academicEmail) ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {isAcademicDomain(academicEmail)
                        ? (language === 'fr' ? '✓ Domaine académique reconnu — vérification automatique' : '✓ Academic domain recognized — auto-verification')
                        : (language === 'fr' ? '⚠ Domaine non académique détecté — vérification manuelle requise' : '⚠ Non-academic domain — manual review required')
                      }
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-grow border-t border-border" />
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">{language === 'fr' ? 'ou' : language === 'ar' ? 'أو' : language === 'es' ? 'o' : 'or'}</span>
                  <div className="flex-grow border-t border-border" />
                </div>

                {/* Method 2: Document upload */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    {t(language, 'studentVerifyDoc')}
                  </Label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-emerald-200 rounded-xl p-4 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
                  >
                    {docBase64 ? (
                      <div className="flex items-center gap-2 justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-700">{docName}</span>
                      </div>
                    ) : uploading ? (
                      <Loader2 className="w-5 h-5 text-emerald-600 animate-spin mx-auto" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">{t(language, 'studentVerifyDocDrop')}</p>
                        <Button variant="link" className="text-xs text-emerald-600 p-0 mt-1 cursor-pointer">
                          {t(language, 'studentVerifyDocBtn')}
                        </Button>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                {/* Method 3: Campus partner */}
                <div className="bg-gradient-to-r from-amber-50 to-emerald-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <School className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-semibold text-foreground">{t(language, 'studentVerifyCampus')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t(language, 'studentVerifyCampusDesc')}</p>
                </div>

                {/* Submit */}
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 text-sm font-semibold cursor-pointer transition-all"
                  onClick={handleSubmit}
                  disabled={submitting || (!academicEmail && !docBase64)}
                >
                  {submitting ? (
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  ) : (
                    <GraduationCap className="mr-1.5 w-4 h-4" />
                  )}
                  {t(language, 'studentVerifySubmit')}
                </Button>
              </div>
            )}

            {step === 'sent' && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <Mail className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-foreground">{t(language, 'studentVerifySent')}</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {language === 'fr'
                    ? 'Votre demande est en cours de révision. Vous recevrez une confirmation par email sous 24-48h.'
                    : language === 'ar'
                    ? 'طلبك قيد المراجعة. ستتلقى تأكيداً عبر البريد الإلكتروني خلال 24-48 ساعة.'
                    : language === 'es'
                    ? 'Tu solicitud está en revisión. Recibirás una confirmación por email en 24-48h.'
                    : 'Your request is under review. You will receive a confirmation by email within 24-48h.'
                  }
                </p>
                <Button variant="outline" className="rounded-xl cursor-pointer" onClick={onClose}>
                  <ArrowRight className="mr-1.5 w-4 h-4" />
                  {language === 'fr' ? 'Retour aux tarifs' : language === 'ar' ? 'العودة للأسعار' : language === 'es' ? 'Volver a precios' : 'Back to pricing'}
                </Button>
              </div>
            )}

            {step === 'verified' && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-emerald-700">{t(language, 'studentVerifyVerified')}</h3>
                <p className="text-sm text-muted-foreground">
                  {language === 'fr'
                    ? 'Votre tarif étudiant est activé ! Vous pouvez maintenant souscrire au plan Starter à 5 €/mois.'
                    : language === 'ar'
                    ? 'تم تفعيل سعر الطالب! يمكنك الآن الاشتراك في خطة Starter بـ 5 €/شهر.'
                    : language === 'es'
                    ? '¡Tu precio estudiantil está activado! Ahora puedes suscribirte al plan Starter por 5 €/mes.'
                    : 'Your student pricing is activated! You can now subscribe to Starter plan at €5/month.'
                  }
                </p>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer" onClick={onClose}>
                  <GraduationCap className="mr-1.5 w-4 h-4" />
                  {t(language, 'studentPremiumCta')}
                </Button>
              </div>
            )}

            {step === 'pending' && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-amber-700">{t(language, 'studentVerifyPending')}</h3>
                <p className="text-sm text-muted-foreground">
                  {language === 'fr'
                    ? 'Votre vérification est toujours en cours. Merci de patienter.'
                    : language === 'ar'
                    ? 'التحقق لا يزال قيد التنفيذ. شكراً لانتظارك.'
                    : language === 'es'
                    ? 'Tu verificación sigue en curso. Gracias por esperar.'
                    : 'Your verification is still in progress. Please wait.'
                  }
                </p>
                <Button variant="outline" className="rounded-xl cursor-pointer" onClick={onClose}>
                  {language === 'fr' ? 'Retour' : language === 'ar' ? 'رجوع' : language === 'es' ? 'Volver' : 'Back'}
                </Button>
              </div>
            )}

            {step === 'rejected' && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-red-700">{t(language, 'studentVerifyRejected')}</h3>
                <p className="text-sm text-muted-foreground">
                  {language === 'fr'
                    ? 'Les justificatifs fournis ne permettent pas de confirmer votre statut étudiant. Vous pouvez soumettre de nouveaux documents.'
                    : language === 'ar'
                    ? 'المستندات المقدمة لا تسمح بتأكيد حالة الطالب. يمكنك تقديم مستندات جديدة.'
                    : language === 'es'
                    ? 'Los documentos proporcionados no permiten confirmar tu estatus estudiantil. Puedes enviar nuevos documentos.'
                    : 'The documents provided cannot confirm your student status. You can submit new documents.'
                  }
                </p>
                <Button
                  variant="outline"
                  className="rounded-xl cursor-pointer"
                  onClick={() => setStep('form')}
                >
                  {t(language, 'studentVerifyResend')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
