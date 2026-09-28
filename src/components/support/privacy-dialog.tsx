'use client'

import { Shield, Database, Clock, Users, Eye, Pencil, Trash2, Ban, FileDown, Scale, Mail, Lock, Building2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

interface PrivacyDialogProps {
  open: boolean
  onClose: () => void
}

const sections = [
  {
    icon: Building2,
    title: '1. Responsable du Traitement',
    content: (
      <div className="bg-muted/50 rounded-xl p-4 space-y-1">
        <p><strong>Responsable :</strong> HireNova Technologies SARL</p>
        <p><strong>Siège social :</strong> 123 Avenue Mohammed V, Guéliz, 40000 Marrakech, Maroc</p>
        <p><strong>Contact DPO :</strong> <a href="mailto:privacy@hirenova.com" className="text-emerald-600 hover:underline">privacy@hirenova.com</a></p>
        <p className="text-xs text-muted-foreground mt-2">
          Autorités de contrôle compétentes : CNDP (Maroc) — CNIL (France, pour les utilisateurs résidant dans l&rsquo;UE).
        </p>
      </div>
    ),
  },
  {
    icon: Database,
    title: '2. Données Collectées',
    content: (
      <div className="space-y-3">
        <p className="text-muted-foreground">HireNova collecte les catégories de données suivantes :</p>
        <div className="grid gap-2">
          {[
            { cat: 'Identité', data: 'Nom, prénom, adresse email, photo de profil', base: 'Exécution du contrat' },
            { cat: 'Connexion', data: 'Adresse IP, User-Agent, logs de connexion', base: 'Intérêt légitime (sécurité)' },
            { cat: 'CV & Carrière', data: 'Expériences, formations, compétences, langues', base: 'Exécution du contrat / Consentement' },
            { cat: 'Paiement', data: 'Coordonnées de facturation, historique d&rsquo;achat', base: 'Obligation légale' },
            { cat: 'Utilisation', data: 'Fonctionnalités utilisées, préférences, consentements', base: 'Consentement / Intérêt légitime' },
            { cat: 'Cookies', data: 'Identifiants de session, préférences, analytique (si consenti)', base: 'Consentement' },
          ].map((item) => (
            <div key={item.cat} className="bg-muted/40 rounded-lg p-3 space-y-1">
              <p className="font-medium text-sm">{item.cat}</p>
              <p className="text-xs text-muted-foreground">{item.data}</p>
              <p className="text-[10px] text-emerald-600 font-medium">Base légale : {item.base}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Clock,
    title: '3. Durées de Conservation',
    content: (
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">Les données sont conservées selon les durées suivantes :</p>
        <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span>Données de compte actif</span><span className="font-medium">Durée du contrat</span></div>
          <div className="flex justify-between"><span>Historique de paiement</span><span className="font-medium">5 ans (obligation comptable)</span></div>
          <div className="flex justify-between"><span>CV et documents générés</span><span className="font-medium">1 an après fin d&rsquo;abonnement</span></div>
          <div className="flex justify-between"><span>Logs de connexion</span><span className="font-medium">13 mois</span></div>
          <div className="flex justify-between"><span>Consentements cookies</span><span className="font-medium">13 mois (renouvellement)</span></div>
          <div className="flex justify-between"><span>Données candidature</span><span className="font-medium">2 ans après dernière interaction</span></div>
          <div className="flex justify-between"><span>Compte supprimé</span><span className="font-medium text-rose-600">Suppression dans les 30 jours</span></div>
        </div>
      </div>
    ),
  },
  {
    icon: Users,
    title: '4. Sous-traitants',
    content: (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">HireNova fait appel aux sous-traitants suivants :</p>
        <div className="bg-muted/50 rounded-xl p-4 space-y-3 text-sm">
          <div>
            <p className="font-medium">Vercel Inc.</p>
            <p className="text-xs text-muted-foreground">Hébergement — États-Unis (SOC 2 Type II, clauses contractuelles types)</p>
          </div>
          <div>
            <p className="font-medium">PostHog Inc.</p>
            <p className="text-xs text-muted-foreground">Analytique (uniquement si consenti) — États-Unis</p>
          </div>
          <div>
            <p className="font-medium">Stripe / Paymob</p>
            <p className="text-xs text-muted-foreground">Paiement sécurisé — PCI DSS Level 1</p>
          </div>
          <div>
            <p className="font-medium">Fournisseurs d&rsquo;IA</p>
            <p className="text-xs text-muted-foreground">Génération de CV, lettres, analyse ATS — Données non stockées par le fournisseur</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: Eye,
    title: '5. Vos Droits (RGPD / Loi 09-08)',
    content: (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">Conformément au RGPD et à la loi marocaine 09-08, vous disposez des droits suivants :</p>
        <div className="grid grid-cols-1 gap-2">
          {[
            { icon: Eye, right: 'Droit d&rsquo;accès', desc: 'Obtenir une copie de vos données personnelles' },
            { icon: Pencil, right: 'Droit de rectification', desc: 'Corriger vos données inexactes' },
            { icon: Trash2, right: 'Droit à l&rsquo;effacement', desc: 'Demander la suppression de vos données' },
            { icon: Ban, right: 'Droit d&rsquo;opposition', desc: 'Vous opposer au traitement de vos données' },
            { icon: Lock, right: 'Droit à la limitation', desc: 'Limiter le traitement de vos données' },
            { icon: FileDown, right: 'Droit à la portabilité', desc: 'Recevoir vos données dans un format structuré' },
          ].map((item) => (
            <div key={item.right} className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3">
              <item.icon className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm text-emerald-700 dark:text-emerald-400">{item.right}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Pour exercer vos droits : <a href="mailto:privacy@hirenova.com" className="text-emerald-600 hover:underline font-medium">privacy@hirenova.com</a>
        </p>
        <p className="text-xs text-muted-foreground">
          Vous pouvez également supprimer votre compte ou exporter vos données depuis votre espace personnel (Dashboard).
        </p>
      </div>
    ),
  },
  {
    icon: Lock,
    title: '6. Sécurité des Données',
    content: (
      <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-sm">
        <li>Chiffrement TLS 1.3 en transit</li>
        <li>Mots de passe hashés (bcrypt)</li>
        <li>Accès administrateur protégé par authentification multi-facteurs</li>
        <li>Audit de sécurité régulier</li>
        <li>Sauvegarde quotidienne chiffrée</li>
      </ul>
    ),
  },
  {
    icon: Scale,
    title: '7. Transferts Internationaux',
    content: (
      <p className="text-muted-foreground text-sm">
        Certaines données peuvent être transférées vers des pays hors UE/EEE (États-Unis) dans le cadre de l&rsquo;hébergement et de l&rsquo;analytique.
        Ces transferts reposent sur des garanties appropriées (clauses contractuelles types, décisions d&rsquo;adéquation).
      </p>
    ),
  },
  {
    icon: Mail,
    title: '8. Contact',
    content: (
      <div className="bg-muted/50 rounded-xl p-4 space-y-2">
        <p className="flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-600" /> <strong>Données personnelles :</strong> <a href="mailto:privacy@hirenova.com" className="text-emerald-600 hover:underline">privacy@hirenova.com</a></p>
        <p className="flex items-center gap-2"><Scale className="w-4 h-4 text-emerald-600" /> <strong>Juridique :</strong> <a href="mailto:legal@hirenova.com" className="text-emerald-600 hover:underline">legal@hirenova.com</a></p>
        <p className="text-xs text-muted-foreground mt-2">
          Réponse sous 30 jours conformément aux exigences du RGPD.
        </p>
      </div>
    ),
  },
]

export default function PrivacyDialog({ open, onClose }: PrivacyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <Shield className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            </div>
            Politique de Confidentialité
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
