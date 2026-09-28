'use client'

import { FileText, User, Shield, Cpu, Ban, Scale, AlertTriangle, RefreshCw, Mail } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

interface CGUDialogProps {
  open: boolean
  onClose: () => void
}

const sections = [
  {
    icon: FileText,
    title: '1. Objet',
    content: (
      <p className="text-muted-foreground">
        Les présentes Conditions Générales d&rsquo;Utilisation (CGU) régissent l&rsquo;utilisation de la plateforme
        BazNova (baznova.com) et de l&rsquo;ensemble de ses services. Toute utilisation de la plateforme implique
        l&rsquo;acceptation sans réserve des présentes CGU.
      </p>
    ),
  },
  {
    icon: User,
    title: '2. Inscription et Compte',
    content: (
      <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
        <li>L&rsquo;utilisateur doit fournir des informations exactes et à jour lors de l&rsquo;inscription.</li>
        <li>Chaque compte est strictement personnel et incessible.</li>
        <li>L&rsquo;utilisateur est responsable de la confidentialité de ses identifiants.</li>
        <li>Toute utilisation frauduleuse entraîne la suspension immédiate du compte.</li>
        <li>L&rsquo;inscription est gratuite ; certains services sont payants (voir CGV).</li>
      </ul>
    ),
  },
  {
    icon: Shield,
    title: '3. Utilisation des Services',
    content: (
      <div className="space-y-2 text-muted-foreground">
        <p>L&rsquo;utilisateur s&rsquo;engage à :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Utiliser la plateforme conformément à sa destination</li>
          <li>Ne pas diffuser de contenus illicites, diffamatoires ou contraires à l&rsquo;ordre public</li>
          <li>Ne pas tenter d&rsquo;interférer avec le bon fonctionnement technique du site</li>
          <li>Ne pas utiliser de robots, scrapers ou outils automatisés sans autorisation</li>
          <li>Respecter les droits de propriété intellectuelle de BazNova et de tiers</li>
        </ul>
      </div>
    ),
  },
  {
    icon: Cpu,
    title: '4. Services liés à l\'IA',
    content: (
      <div className="space-y-2 text-muted-foreground">
        <p>BazNova utilise l&rsquo;intelligence artificielle pour assister ses utilisateurs. L&rsquo;utilisateur est informé que :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Les contenus générés par l&rsquo;IA constituent une aide à la décision et non un engagement contractuel</li>
          <li>L&rsquo;utilisateur reste seul responsable des documents et informations qu&rsquo;il transmet ou utilise</li>
          <li>BazNova ne garantit pas l&rsquo;obtention d&rsquo;un emploi ou d&rsquo;un résultat particulier</li>
          <li>Les données transmises aux modèles d&rsquo;IA sont traitées conformément à la Politique de Confidentialité</li>
        </ul>
      </div>
    ),
  },
  {
    icon: Ban,
    title: '5. Contenu Utilisateur',
    content: (
      <div className="space-y-2 text-muted-foreground">
        <p>L&rsquo;utilisateur conserve la propriété de ses données personnelles et documents chargés.</p>
        <p>BazNova accorde à l&rsquo;utilisateur une licence d&rsquo;utilisation des documents générés par la plateforme, dans le cadre de sa recherche d&rsquo;emploi ou de ses activités professionnelles.</p>
      </div>
    ),
  },
  {
    icon: AlertTriangle,
    title: '6. Sanctions',
    content: (
      <p className="text-muted-foreground">
        En cas de manquement aux présentes CGU, BazNova se réserve le droit de suspendre ou supprimer le compte
        de l&rsquo;utilisateur, sans préjudice de toute action en justice qu&rsquo;elle pourrait engager.
      </p>
    ),
  },
  {
    icon: RefreshCw,
    title: '7. Modifications',
    content: (
      <p className="text-muted-foreground">
        BazNova se réserve le droit de modifier les présentes CGU à tout moment. Les modifications seront notifiées
        par email et/ou via un avis sur la plateforme. L&rsquo;utilisation continue de la plateforme après la date
        d&rsquo;entrée en vigueur vaut acceptation des nouvelles CGU.
      </p>
    ),
  },
  {
    icon: Scale,
    title: '8. Droit Applicable et Juridiction',
    content: (
      <p className="text-muted-foreground">
        Les présentes CGU sont régies par le droit marocain. Tout litige sera soumis à la compétence exclusive
        des tribunaux de Marrakech, sans préjudice de l&rsquo;application de dispositions protectrices impératives
        du pays de résidence de l&rsquo;utilisateur (notamment le droit de l&rsquo;UE pour les résidents européens).
      </p>
    ),
  },
  {
    icon: Mail,
    title: '9. Contact',
    content: (
      <div className="bg-muted/50 rounded-xl p-4 space-y-2">
        <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-emerald-600" /> <strong>Support :</strong> <a href="mailto:support@baznova.com" className="text-emerald-600 hover:underline">support@baznova.com</a></p>
        <p className="flex items-center gap-2"><Scale className="w-4 h-4 text-emerald-600" /> <strong>Juridique :</strong> <a href="mailto:legal@baznova.com" className="text-emerald-600 hover:underline">legal@baznova.com</a></p>
      </div>
    ),
  },
]

export default function CGUDialog({ open, onClose }: CGUDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <FileText className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            </div>
            Conditions Générales d&rsquo;Utilisation
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
            © BazNova Technologies SARL — Tous droits réservés.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
