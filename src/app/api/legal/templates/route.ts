import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/hnsa'

interface Template {
  id: string
  name: string
  type: string
  category: string
  description: string
  content: string
}

const templates: Template[] = [
  {
    id: 'tpl-nda-fr',
    name: 'Accord de Confidentialité (NDA)',
    type: 'nda',
    category: 'protection',
    description: 'Modèle de accord de non-divulgation bilatéral pour protéger les informations confidentielles entre deux parties.',
    content: `ACCORD DE NON-DIVULGATION (NDA)

Date: [DATE]
Entre les soussignés :
Partie A: [NOM DE LA PARTIE A], domicilié au [ADRESSE]
Partie B: [NOM DE LA PARTIE B], domicilié au [ADRESSE]

Article 1 — Objet
Le présent accord a pour objet de définir les conditions de confidentialité applicables aux informations échangées entre les Parties dans le cadre de [CONTEXTE DE LA COLLABORATION].

Article 2 — Définition des Informations Confidentielles
Sont considérées comme Informations Confidentielles toutes les informations techniques, commerciales, financières ou stratégiques, qu'elles soient transmises oralement, par écrit ou sous toute autre forme.

Article 3 — Obligations des Parties
Chaque Partie s'engage à :
a) Maintenir la confidentialité des Informations Confidentielles reçues
b) Ne pas les divulguer à des tiers sans accord préalable écrit
c) Les utiliser uniquement aux fins prévues par l'accord principal
d) Assurer la protection par des moyens au moins équivalents à ceux utilisés pour ses propres informations confidentielles

Article 4 — Durée
Le présent accord entre en vigueur à la date de sa signature et reste en vigueur pendant une durée de [DURÉE] ans.

Article 5 — Sanctions
Toute violation du présent accord donnera droit à des dommages et intérêts.

Article 6 — Droit applicable
Le présent accord est soumis au droit [JURIDICTION].

Signature des Parties :
[PARTIE A] — [Date]
[PARTIE B] — [Date]`,
  },
  {
    id: 'tpl-service-fr',
    name: 'Contrat de Prestation de Services',
    type: 'service',
    category: 'business',
    description: 'Modèle de contrat de prestation de services entre un prestataire et un client.',
    content: `CONTRAT DE PRESTATION DE SERVICES

Date: [DATE]
Entre les soussignés :
Le Client: [NOM DU CLIENT], [FORME JURIDIQUE], au capital de [MONTANT], dont le siège social est situé [ADRESSE]
Le Prestataire: [NOM DU PRESTATAIRE], [FORME JURIDIQUE], dont le siège social est situé [ADRESSE]

Article 1 — Objet
Le Prestataire s'engage à fournir au Client les services décrits à l'Annexe 1 dans les conditions définies par le présent contrat.

Article 2 — Durée
Le présent contrat est conclu pour une durée de [DURÉE] à compter du [DATE DE DÉBUT]. Il sera renouvelé par tacite reconduction.

Article 3 — Rémunération
La rémunération du Prestataire est fixée à [MONTANT] HT. Les factures seront émises [FRÉQUENCE] et payées dans un délai de [DÉLAI] jours.

Article 4 — Obligations du Prestataire
a) Réaliser les prestations avec diligence et compétence professionnelle
b) Respecter les délais convenus
c) Fournir des rapports d'avancement réguliers
d) Garantir la conformité des livrables avec le cahier des charges

Article 5 — Propriété Intellectuelle
Les livrables réalisés dans le cadre du présent contrat deviennent la propriété du Client après paiement intégral.

Article 6 — Confidentialité
Les Parties s'engagent à maintenir confidentielles toutes les informations échangées.

Article 7 — Résiliation
Le contrat peut être résilié par chaque Partie moyennant un préavis de [PRÉAVIS] jours.

Article 8 — Juridiction compétente
En cas de litige, les Parties s'engagent à rechercher une solution amiable. À défaut, le tribunal compétent sera celui de [JURIDICTION].

Signature des Parties :
[CLIENT] — [Date]
[PRESTATAIRE] — [Date]`,
  },
  {
    id: 'tpl-employment-fr',
    name: 'Contrat de Travail CDI',
    type: 'employment',
    category: 'employment',
    description: 'Modèle de contrat de travail à durée indéterminée conforme au Code du Travail.',
    content: `CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE (CDI)

Date: [DATE]
Entre les soussignés :
L'Employeur: [NOM DE L'ENTREPRISE], [FORME JURIDIQUE], dont le siège est situé [ADRESSE]
Le Salarié: [NOM DU SALARIÉ], né le [DATE DE NAISSANCE], demeurant à [ADRESSE]

Article 1 — Emploi et Classification
Le Salarié est engagé en qualité de [POSTE] classé au niveau [NIVEAU] de la grille de classification.

Article 2 — Date d'effet et Période d'essai
Le présent contrat prend effet à compter du [DATE DE DÉBUT]. Une période d'essai de [DURÉE] est prévue.

Article 3 — Rémunération
Le Salarié percevra un salaire brut mensuel de [MONTANT], payable à la fin de chaque mois.

Article 4 — Horaires de travail
Le Salarié sera soumis à un horaire de [HEURES] heures par semaine, réparties du [JOURS].

Article 5 — Lieu de travail
Le lieu principal de travail est situé à [ADRESSE DU LIEU DE TRAVAIL].

Article 6 — Congés
Le Salarié bénéficie de [NOMBRE] jours ouvrables de congés payés par an.

Article 7 — Obligations du Salarié
a) Exécuter son travail avec diligence et loyauté
b) Respecter les règles internes de l'entreprise
c) Ne pas divulguer les informations confidentielles
d) Suivre les formations nécessaires à l'exécution de ses fonctions

Article 8 — Obligations de l'Employeur
a) Verser la rémunération convenue aux dates prévues
b) Fournir un travail et les moyens nécessaires à son exécution
c) Respecter les dispositions légales et réglementaires
d) Assurer la sécurité et la santé du Salarié

Article 9 — Suspension et Rupture
Le contrat peut être suspendu ou rompu dans les conditions prévues par la législation en vigueur.

Article 10 — Litiges
En cas de litige, les Parties s'engagent à une conciliation préalable devant [INSTANCE].

Signature des Parties :
[L'EMPLOYEUR] — [Date]
[LE SALARIÉ] — [Date]`,
  },
  {
    id: 'tpl-noncompete-fr',
    name: 'Clause de Non-Concurrence',
    type: 'non-compete',
    category: 'protection',
    description: 'Modèle de clause de non-concurrence à intégrer dans un contrat de travail.',
    content: `CLAUSE DE NON-CONCURRENCE

Article [NUMÉRO] — Non-Concurrence

En contrepartie d'une contrepartie financière dont les modalités sont définies ci-après, le Salarié s'engage, pendant une durée de [DURÉE] mois à compter de la cessation du contrat de travail, à ne pas exercer, directement ou indirectement, toute activité concurrente.

Section 1 — Champ d'application territorial
L'interdiction s'applique sur le territoire [ZONE GÉOGRAPHIQUE].

Section 2 — Activités concernées
Sont interdites toutes activités :
a) Exercées pour le compte de toute entreprise en concurrence directe ou indirecte avec [NOM DE L'ENTREPRISE]
b) Consistant à créer ou reprendre une entreprise concurrente
c) Portant sur des produits ou services identiques ou similaires

Section 3 — Contrepartie financière
En contrepartie de cette obligation de non-concurrence, l'Employeur versera au Salarié une indemnité mensuelle égale à [POURCENTAGE]% de la rémunération brute moyenne des [NOMBRE] derniers mois.

Section 4 — Déchéance
La clause de non-concurrence cessera de produire ses effets si l'Employeur ne respecte pas ses obligations financières.

Section 5 — Sanctions
Tout manquement à la présente clause donnera lieu au paiement de dommages et intérêts dont le montant sera fixé par le tribunal compétent.`,
  },
  {
    id: 'tpl-ip-fr',
    name: 'Cession de Propriété Intellectuelle',
    type: 'ip',
    category: 'business',
    description: 'Modèle de contrat de cession de droits de propriété intellectuelle.',
    content: `CONTRAT DE CESSION DE PROPRIÉTÉ INTELLECTUELLE

Date: [DATE]
Entre les soussignés :
Le Cédant: [NOM DU CÉDANT], demeurant à [ADRESSE]
Le Cessionnaire: [NOM DU CESSIONNAIRE], [FORME JURIDIQUE], dont le siège est situé [ADRESSE]

Article 1 — Objet de la cession
Le Cédant cède au Cessionnaire l'ensemble des droits de propriété intellectuelle portant sur [DESCRIPTION DE LA CRÉATION/OEUVRE].

Article 2 — Étendue des droits cédés
La cession porte sur l'ensemble des droits patrimoniaux incluant :
a) Le droit de reproduction
b) Le droit de représentation
c) Le droit d'adaptation et de modification
d) Le droit de distribution
Le Cédant conserve ses droits moraux sur l'oeuvre.

Article 3 — Territoire et durée
La cession est accordée pour le monde entier et pour toute la durée de protection légale des droits cédés.

Article 4 — Rémunération
En contrepartie de la cession, le Cessionnaire verse au Cédant une rémunération de [MONTANT] payable selon les modalités suivantes : [MODALITÉS].

Article 5 — Garanties
Le Cédant garantit :
a) Être l'auteur original ou le titulaire des droits cédés
b) Que l'oeuvre est originale et ne porte pas atteinte aux droits de tiers
c) Qu'aucune cession antérieure n'a été consentie sur les mêmes droits

Article 6 — Responsabilité
En cas de contestation par un tiers, le Cédant s'engage à défendre le Cessionnaire et à l'indemniser de tout préjudice subi.

Article 7 — Droit applicable
Le présent contrat est soumis au droit [JURIDICTION]. Tout litige sera soumis à la compétence exclusive du tribunal de [TRIBUNAL].

Signature des Parties :
[LE CÉDANT] — [Date]
[LE CESSIONNAIRE] — [Date]`,
  },
  {
    id: 'tpl-privacy-fr',
    name: 'Politique de Confidentialité RGPD',
    type: 'privacy',
    category: 'data',
    description: 'Modèle de politique de confidentialité conforme au Règlement Général sur la Protection des Données (RGPD).',
    content: `POLITIQUE DE CONFIDENTIALITÉ — RGPD

Dernière mise à jour : [DATE]

1. Responsable du traitement
[ENTREPRISE] (ci-après "le Responsable de traitement") est responsable du traitement des données personnelles décrit dans la présente politique.

Adresse : [ADRESSE]
Email : [EMAIL]
Téléphone : [TÉLÉPHONE]

2. Données personnelles collectées
Nous collectons les catégories de données suivantes :
a) Données d'identification : nom, prénom, email, téléphone, adresse
b) Données professionnelles : CV, parcours, compétences, formation
c) Données de connexion : adresse IP, logs de navigation
d) Données de recrutement : lettres de motivation, entretiens, évaluations

3. Finalités du traitement
Vos données sont traitées pour :
a) La gestion des candidatures et du processus de recrutement
b) L'amélioration de nos services
c) L'envoi d'informations commerciales (avec consentement)
d) Le respect de nos obligations légales

4. Base juridique
Le traitement repose sur :
a) Le consentement (Article 6.1.a RGPD)
b) L'exécution d'un contrat (Article 6.1.b RGPD)
c) Notre intérêt légitime (Article 6.1.f RGPD)
d) Nos obligations légales (Article 6.1.c RGPD)

5. Destinataires des données
Vos données peuvent être partagées avec :
a) Nos équipes RH et de recrutement
b) Nos prestataires techniques (hébergement, analyse)
c) Les autorités compétentes (si requis par la loi)

6. Durée de conservation
Vos données sont conservées pendant :
a) La durée du processus de recrutement + [DURÉE] mois
b) La durée de la relation contractuelle + [DURÉE] ans
c) La durée requise par les obligations légales

7. Vos droits RGPD
Conformément au RGPD, vous disposez des droits suivants :
a) Droit d'accès (Article 15)
b) Droit de rectification (Article 16)
c) Droit à l'effacement (Article 17)
d) Droit à la limitation (Article 18)
e) Droit à la portabilité (Article 20)
f) Droit d'opposition (Article 21)
g) Droit de retirer votre consentement à tout moment

Pour exercer vos droits, contactez-nous à : [EMAIL DPO]

8. Sécurité des données
Nous mettons en oeuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, modification, divulgation ou destruction.

9. Cookies
Notre site utilise des cookies pour améliorer l'expérience utilisateur. Vous pouvez gérer vos préférences de cookies dans les paramètres de votre navigateur.

10. Modifications
Nous nous réservons le droit de modifier la présente politique. Toute modification sera publiée sur cette page avec la date de mise à jour.

11. Autorité de contrôle
En cas de réclamation, vous pouvez contacter l'autorité de protection des données compétente : [CNIL/autorité locale].

12. Contact
Pour toute question relative à cette politique, contactez notre DPO :
Email : [EMAIL]
Adresse : [ADRESSE]`,
  },
  {
    id: 'tpl-nda-en',
    name: 'Non-Disclosure Agreement (NDA)',
    type: 'nda',
    category: 'protection',
    description: 'Bilateral non-disclosure agreement template for protecting confidential information between two parties.',
    content: `NON-DISCLOSURE AGREEMENT (NDA)

Date: [DATE]
Between:
Party A: [NAME OF PARTY A], located at [ADDRESS]
Party B: [NAME OF PARTY B], located at [ADDRESS]

Article 1 — Purpose
This Agreement sets forth the confidentiality terms applicable to information exchanged between the Parties in connection with [COLLABORATION CONTEXT].

Article 2 — Definition of Confidential Information
"Confidential Information" means all technical, commercial, financial, or strategic information, whether transmitted orally, in writing, or in any other form.

Article 3 — Obligations of the Parties
Each Party agrees to:
a) Maintain the confidentiality of Confidential Information received
b) Not disclose it to third parties without prior written consent
c) Use it solely for the purposes outlined in the main agreement
d) Protect it with means at least equivalent to those used for its own confidential information

Article 4 — Duration
This Agreement becomes effective on the date of signature and remains in force for [DURATION] years.

Article 5 — Remedies
Any breach of this Agreement shall entitle the injured Party to claim damages.

Article 6 — Governing Law
This Agreement is governed by the laws of [JURISDICTION].

Signatures:
[PARTY A] — [Date]
[PARTY B] — [Date]`,
  },
  {
    id: 'tpl-service-en',
    name: 'Service Agreement',
    type: 'service',
    category: 'business',
    description: 'Professional service agreement template between a service provider and a client.',
    content: `SERVICE AGREEMENT

Date: [DATE]
Between:
Client: [CLIENT NAME], [LEGAL FORM], with share capital of [AMOUNT], registered at [ADDRESS]
Service Provider: [PROVIDER NAME], [LEGAL FORM], registered at [ADDRESS]

Article 1 — Purpose
The Service Provider agrees to provide the Client with the services described in Annex 1 under the conditions defined in this Agreement.

Article 2 — Duration
This Agreement is concluded for a period of [DURATION] commencing on [START DATE]. It shall be tacitly renewed.

Article 3 — Compensation
The Service Provider's compensation is fixed at [AMOUNT] excluding tax. Invoices shall be issued [FREQUENCY] and paid within [DAYS] days.

Article 4 — Service Provider Obligations
a) Perform services with diligence and professional competence
b) Meet agreed deadlines
c) Provide regular progress reports
d) Ensure deliverables comply with specifications

Article 5 — Intellectual Property
Deliverables produced under this Agreement shall become the Client's property upon full payment.

Article 6 — Confidentiality
The Parties agree to keep confidential all information exchanged.

Article 7 — Termination
This Agreement may be terminated by either Party with [NOTICE] days' notice.

Article 8 — Dispute Resolution
In case of dispute, the Parties agree to seek an amicable resolution. Failing that, the competent court shall be [JURISDICTION].

Signatures:
[CLIENT] — [Date]
[SERVICE PROVIDER] — [Date]`,
  },
]

export async function GET(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

  return NextResponse.json({ templates })
}
