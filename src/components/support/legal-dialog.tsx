'use client'

import { FileText, Scale, Shield, Globe } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { t } from '@/lib/i18n'
import { useCVStore } from '@/store/cv-store'

interface LegalDialogProps {
  open: boolean
  onClose: () => void
}

export default function LegalDialog({ open, onClose }: LegalDialogProps) {
  const { language } = useCVStore()

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-stone-100">
              <Scale className="w-5 h-5 text-stone-700" />
            </div>
            {t(language, 'legalTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-sm leading-relaxed">
          {/* Editor */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-base">{t(language, 'legalEditorTitle')}</h3>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 space-y-1">
              <p><strong>HireNova</strong></p>
              <p>{t(language, 'legalEditor')} : <strong>E-Society 2050</strong></p>
              <p>{t(language, 'legalEmail')} : <a href="mailto:abdellahbazhani053@gmail.com" className="text-emerald-600 hover:underline">abdellahbazhani053@gmail.com</a></p>
              <p>{t(language, 'legalCountry')} : {t(language, 'legalCountryMorocco')}</p>
            </div>
          </section>

          <Separator />

          {/* Service */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-base">{t(language, 'legalServiceTitle')}</h3>
            </div>
            <p className="text-muted-foreground">
              {t(language, 'legalServiceDesc')}
            </p>
          </section>

          <Separator />

          {/* CGU */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-base">{t(language, 'legalCguTitle')}</h3>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <div>
                <h4 className="font-semibold text-foreground mb-1">{t(language, 'legalCgu31Title')}</h4>
                <p>{t(language, 'legalCgu31Desc')}</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">{t(language, 'legalCgu32Title')}</h4>
                <p>{t(language, 'legalCgu32Desc')}</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">{t(language, 'legalCgu33Title')}</h4>
                <p>{t(language, 'legalCgu33Desc')}</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">{t(language, 'legalCgu34Title')}</h4>
                <p>{t(language, 'legalCgu34Desc')}</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">{t(language, 'legalCgu35Title')}</h4>
                <p>{t(language, 'legalCgu35Desc')}</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">{t(language, 'legalCgu36Title')}</h4>
                <p>{t(language, 'legalCgu36Desc')}</p>
              </div>
            </div>
          </section>

          <Separator />

          {/* Personal data */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-base">{t(language, 'legalDataTitle')}</h3>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <p>{t(language, 'legalDataIntro')}</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t(language, 'legalDataBullet1')}</li>
                <li>{t(language, 'legalDataBullet2')}</li>
                <li>{t(language, 'legalDataBullet3')}</li>
                <li>{t(language, 'legalDataBullet4')}</li>
              </ul>
            </div>
          </section>

          <Separator />

          {/* Droits d'auteur */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Scale className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-base">{t(language, 'legalCopyrightTitle')}</h3>
            </div>
            <p className="text-muted-foreground">
              {t(language, 'legalCopyrightDesc')}
            </p>
          </section>

          <Separator />

          {/* Hosting */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-base">{t(language, 'legalHostingTitle')}</h3>
            </div>
            <p className="text-muted-foreground">
              {t(language, 'legalHostingDesc')}
            </p>
          </section>

          <Separator />

          {/* Contact */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-base">{t(language, 'legalContactTitle')}</h3>
            </div>
            <p className="text-muted-foreground">
              {t(language, 'legalContactDesc')}<br />
              <a href="mailto:abdellahbazhani053@gmail.com" className="text-emerald-600 hover:underline font-medium">abdellahbazhani053@gmail.com</a>
            </p>
          </section>

          <p className="text-xs text-muted-foreground text-center pt-2">
            {t(language, 'legalLastUpdate')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
