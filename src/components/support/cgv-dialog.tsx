'use client'

import { CreditCard, Receipt, RefreshCw, Shield, Ban, Scale, Mail, Clock, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

interface CGVDialogProps {
  open: boolean
  onClose: () => void
}

const sections = [
  {
    icon: CreditCard,
    title: '1. Prix',
    content: (
      <div className="space-y-2 text-muted-foreground">
        <p>Les prix des abonnements sont indiqués en euros (€) ou en dirhams marocains (MAD) sur la plateforme.</p>
        <p>HireNova se réserve le droit de modifier ses tarifs. Les modifications seront notifiées 30 jours avant leur entrée en vigueur.
        L&rsquo;utilisateur peut résilier avant l&rsquo;application des nouveaux tarifs.</p>
      </div>
    ),
  },
  {
    icon: Receipt,
    title: '2. Paiement',
    content: (
      <div className="space-y-2 text-muted-foreground">
        <p>Le paiement s&rsquo;effectue en ligne par carte bancaire (Stripe) ou par mobile money (Paymob).</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Paiement sécurisé conforme PCI DSS Level 1</li>
          <li>Les données bancaires ne transitent jamais par les serveurs de HireNova</li>
          <li>Un reçu est envoyé par email après chaque transaction</li>
        </ul>
      </div>
    ),
  },
  {
    icon: Clock,
    title: '3. Abonnement et Renouvellement',
    content: (
      <div className="space-y-2 text-muted-foreground">
        <p>Les abonnements sont reconduits tacitement à l&rsquo;échéance, sauf résiliation par l&rsquo;utilisateur.</p>
        <p>L&rsquo;utilisateur peut résilier à tout moment depuis son espace personnel.</p>
        <p>En cas de résiliation en cours de période, l&rsquo;utilisateur conserve l&rsquo;accès jusqu&rsquo;à la fin de la période payée.</p>
      </div>
    ),
  },
  {
    icon: RefreshCw,
    title: '4. Rétractation et Remboursement',
    content: (
      <div className="space-y-2 text-muted-foreground">
        <p className="font-medium text-foreground">Droit de rétractation (14 jours — article L.221-18 du Code de la consommation) :</p>
        <p>L&rsquo;utilisateur disposant de la qualité de consommateur au sens de l&rsquo;article préliminaire du Code de la consommation français
        dispose d&rsquo;un délai de 14 jours à compter de la souscription pour exercer son droit de rétractation, sans avoir à motiver sa décision.</p>
        <p>Si le service a été partiellement utilisé pendant ce délai, HireNova pourra exiger une somme proportionnelle au service effectivement fourni.</p>
        <p className="font-medium text-foreground mt-2">Exceptions :</p>
        <p>Le droit de rétractation ne s&rsquo;applique pas aux services entièrement exécutés avant la fin du délai et dont l&rsquo;exécution a commencé
        avec l&rsquo;accord exprès du consommateur.</p>
        <p>Pour toute demande : <a href="mailto:support@hirenova.com" className="text-emerald-600 hover:underline font-medium">support@hirenova.com</a></p>
      </div>
    ),
  },
  {
    icon: Shield,
    title: '5. Garanties',
    content: (
      <div className="space-y-2 text-muted-foreground">
        <p>HireNova garantit :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Un accès continu au service (sauf cas de force majeure ou maintenance planifiée)</li>
          <li>La confidentialité des données conformément à la Politique de Confidentialité</li>
          <li>Un support technique accessible par email</li>
        </ul>
        <p className="text-xs italic mt-2">HireNova ne garantit pas l&rsquo;obtention d&rsquo;un résultat spécifique (emploi, entretien, recrutement).</p>
      </div>
    ),
  },
  {
    icon: Ban,
    title: '6. Responsabilité',
    content: (
      <p className="text-muted-foreground">
        La responsabilité de HireNova est limitée au montant des sommes effectivement versées par l&rsquo;utilisateur
        au cours des 12 derniers mois. HireNova ne saurait être tenue responsable des dommages indirects, perte de chance,
        ou préjudice commercial.
      </p>
    ),
  },
  {
    icon: AlertTriangle,
    title: '7. Force Majeure',
    content: (
      <p className="text-muted-foreground">
        Aucune des parties ne sera responsable de l&rsquo;inexécution de ses obligations due à un cas de force majeure
        tel que défini par l&rsquo;article 269 du Dahir des Obligations et Contrats (DOC) marocain.
      </p>
    ),
  },
  {
    icon: Scale,
    title: '8. Droit Applicable',
    content: (
      <p className="text-muted-foreground">
        Les présentes CGV sont régies par le droit marocain. Tout litige sera soumis à la compétence des tribunaux
        de Marrakech, sous réserve des dispositions protectrices impératives du pays de résidence de l&rsquo;utilisateur.
      </p>
    ),
  },
  {
    icon: Mail,
    title: '9. Contact',
    content: (
      <div className="bg-muted/50 rounded-xl p-4 space-y-2">
        <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-emerald-600" /> <strong>Support & Facturation :</strong> <a href="mailto:support@hirenova.com" className="text-emerald-600 hover:underline">support@hirenova.com</a></p>
        <p className="flex items-center gap-2"><Scale className="w-4 h-4 text-emerald-600" /> <strong>Juridique :</strong> <a href="mailto:legal@hirenova.com" className="text-emerald-600 hover:underline">legal@hirenova.com</a></p>
      </div>
    ),
  },
]

export default function CGVDialog({ open, onClose }: CGVDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <CreditCard className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            </div>
            Conditions Générales de Vente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm leading-relaxed">
          {sections.map((section, i) => {
            const Icon = section.icon
            return (
              <div key={i}>
                {i > 0 && <Separator className="mb-5" />}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                      <Icon className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h3 className="font-bold text-base">{section.title}</h3>
                  </div>
                  {section.content}
                </section>
              </div>
            )
          })}

          <Separator />
          <p className="text-xs text-muted-foreground text-center py-2">
            Dernière mise à jour : 25/07/2025
          </p>
          <p className="text-xs text-muted-foreground text-center font-medium">
            © HireNova Technologies SARL — Tous droits réservés.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
