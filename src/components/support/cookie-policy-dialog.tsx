'use client'

import { Cookie, Shield, BarChart3, Megaphone, Server } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

interface CookiePolicyDialogProps {
  open: boolean
  onClose: () => void
}

export default function CookiePolicyDialog({ open, onClose }: CookiePolicyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Cookie className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            </div>
            Politique Cookies
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm leading-relaxed">
          {/* Section 1: Qu'est-ce qu'un cookie */}
          <section>
            <h3 className="font-bold text-base mb-2">1. Qu'est-ce qu'un cookie ?</h3>
            <p className="text-muted-foreground">Un cookie est un petit fichier texte déposé sur votre appareil lors de la visite d'un site web. Il permet au site de mémoriser des informations relatives à votre visite (préférences de langue, identifiant de session, etc.).</p>
          </section>

          <Separator />

          {/* Section 2: Types de cookies */}
          <section>
            <h3 className="font-bold text-base mb-3">2. Types de cookies utilisés</h3>
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-semibold">Cookies nécessaires</h4>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Toujours actifs</span>
                </div>
                <p className="text-muted-foreground text-xs">Indispensables au fonctionnement du site : authentification (NextAuth), session utilisateur, sécurité (CSRF), préférences de langue.</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <h4 className="font-semibold">Cookies de mesure d'audience</h4>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Consentement requis</span>
                </div>
                <p className="text-muted-foreground text-xs">Utilisés pour comprendre comment les visiteurs utilisent le site (pages visitées, temps passé, erreurs). Nous utilisons PostHog. Ces cookies ne sont déposés qu'avec votre consentement explicite.</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Megaphone className="w-4 h-4 text-purple-600" />
                  <h4 className="font-semibold">Cookies marketing</h4>
                  <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Consentement requis</span>
                </div>
                <p className="text-muted-foreground text-xs">Utilisés pour vous proposer des offres et communications adaptées à vos centres d'intérêt. Ces cookies ne sont déposés qu'avec votre consentement explicite.</p>
              </div>
            </div>
          </section>

          <Separator />

          {/* Section 3: Durée */}
          <section>
            <h3 className="font-bold text-base mb-2">3. Durée de conservation</h3>
            <p className="text-muted-foreground">Les cookies de session sont supprimés à la fermeture de votre navigateur. Les cookies de préférences sont conservés pendant 13 mois maximum. Vous pouvez à tout moment modifier vos préférences via la bannière de consentement.</p>
          </section>

          <Separator />

          {/* Section 4: Vos droits */}
          <section>
            <h3 className="font-bold text-base mb-2">4. Vos droits</h3>
            <p className="text-muted-foreground">Vous pouvez à tout moment :</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-2">
              <li>Refuser ou accepter les cookies non nécessaires</li>
              <li>Modifier vos préférences de cookies</li>
              <li>Supprimer les cookies via les paramètres de votre navigateur</li>
            </ul>
          </section>

          <Separator />

          {/* Section 5: Contact */}
          <section>
            <h3 className="font-bold text-base mb-2">5. Contact</h3>
            <p className="text-muted-foreground">Pour toute question relative à cette politique : <a href="mailto:privacy@hirenova.com" className="text-emerald-600 hover:underline">privacy@hirenova.com</a></p>
          </section>

          <Separator />
          <p className="text-xs text-muted-foreground text-center py-2">Dernière mise à jour : 25/07/2025</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
