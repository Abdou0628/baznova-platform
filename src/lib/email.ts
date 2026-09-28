import nodemailer from 'nodemailer'
import { t, type CVLanguage } from './i18n'

/**
 * HireNova Email Service
 * 
 * Sends transactional emails via SMTP (nodemailer).
 * Configure via env vars:
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 * - EMAIL_FROM (sender address)
 * 
 * In development without SMTP config, logs to console.
 */

const SMTP_HOST = process.env.SMTP_HOST || ''
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10)
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const EMAIL_FROM = process.env.EMAIL_FROM || 'HireNova <noreply@hirenova.com>'
const APP_URL = process.env.NEXTAUTH_URL || 'https://hirenova.com'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) return transporter
  if (!SMTP_HOST) return null

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  })
  return transporter
}

interface EmailParams {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: EmailParams): Promise<boolean> {
  // Dev mode: log to console if no SMTP configured
  if (!SMTP_HOST) {
    console.log('\n========== EMAIL (DEV MODE) ==========')
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log('---')
    console.log(text || html.replace(/<[^>]*>/g, ' ').slice(0, 500))
    console.log('======================================\n')
    return true
  }

  try {
    const transport = getTransporter()
    if (!transport) {
      console.warn('[email] No transporter available')
      return false
    }

    await transport.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ' '),
    })
    return true
  } catch (err) {
    console.error('[email] send failed:', err instanceof Error ? err.message : String(err))
    return false
  }
}

// ============= Email Templates =============

function emailWrapper(content: string, previewText: string, lang: string = 'fr'): string {
  const isRTL = lang === 'ar'
  const dir = isRTL ? 'rtl' : 'ltr'
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="preview" content="${previewText}">
  <title>HireNova</title>
</head>
<body style="margin:0;padding:0;background:#f8fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafb;min-height:100vh;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;font-size:28px;font-weight:800;margin:0;letter-spacing:-0.5px;">HireNova</h1>
              <p style="color:#d1fae5;font-size:13px;margin:4px 0 0 0;font-weight:500;">by E-Society 2050</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background:#f8fafb;border-top:1px solid #e2e8f0;">
              <p style="font-size:12px;color:#64748b;margin:0 0 8px 0;line-height:1.6;">
                ${lang === 'en' ? 'You are receiving this email because you have a HireNova account.' :
                  lang === 'ar' ? 'تتلقى هذا البريد الإلكتروني لأن لديك حسابًا على HireNova.' :
                  lang === 'es' ? 'Recibes este email porque tienes una cuenta HireNova.' :
                  'Vous recevez cet email car vous avez un compte HireNova.'}<br>
                <a href="${APP_URL}" style="color:#059669;">${lang === 'en' ? 'Visit HireNova' : lang === 'ar' ? 'زيارة HireNova' : lang === 'es' ? 'Visitar HireNova' : 'Visiter HireNova'}</a> · 
                <a href="${APP_URL}/?support=1" style="color:#059669;">${lang === 'en' ? 'Support' : lang === 'ar' ? 'الدعم' : lang === 'es' ? 'Soporte' : 'Support'}</a> · 
                <a href="${APP_URL}/?unsubscribe=1" style="color:#94a3b8;">${lang === 'en' ? 'Unsubscribe' : lang === 'ar' ? 'إلغاء الاشتراك' : lang === 'es' ? 'Darse de baja' : 'Se désabonner'}</a>
              </p>
              <p style="font-size:11px;color:#94a3b8;margin:0;">
                ${lang === 'en' ? '© 2026 E-Society 2050 — HireNova. All rights reserved.' :
                  lang === 'ar' ? '© 2026 E-Society 2050 — HireNova. جميع الحقوق محفوظة.' :
                  lang === 'es' ? '© 2026 E-Society 2050 — HireNova. Todos los derechos reservados.' :
                  '© 2026 E-Society 2050 — HireNova. Tous droits réservés.'}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(label: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="background:#10b981;border-radius:8px;">
        <a href="${url}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-weight:600;text-decoration:none;font-size:15px;">${label}</a>
      </td>
    </tr>
  </table>`
}

// ============= Onboarding Sequence =============

export const emailTemplates = {
  // Day 0 — Welcome
  welcome: (name: string) => ({
    subject: '🎉 Bienvenue sur HireNova — Votre carrière démarre ici !',
    html: emailWrapper(`
      <h2 style="font-size:22px;font-weight:700;margin:0 0 12px 0;color:#0f172a;">Bonjour ${name} 👋</h2>
      <p style="font-size:15px;line-height:1.7;color:#475569;margin:0 0 16px 0;">
        Bienvenue dans la plateforme tout-en-un de gestion de carrière internationale.
        Vous faites désormais partie d'une communauté de professionnels qui veulent
        <strong>accélérer leur carrière</strong> avec l'IA.
      </p>
      <p style="font-size:15px;line-height:1.7;color:#475569;margin:0 0 16px 0;">
        Voici ce que vous pouvez faire dès maintenant :
      </p>
      <ul style="font-size:15px;line-height:1.9;color:#475569;margin:0 0 16px 0;padding-left:20px;">
        <li>📄 <strong>Créer votre CV professionnel</strong> en 60 secondes avec l'IA</li>
        <li>🎯 <strong>Analyser votre score ATS</strong> pour passer les filtres de recrutement</li>
        <li>💼 <strong>Explorer les offres d'emploi</strong> locales et internationales</li>
        <li>🌍 <strong>Découvrir HireNova IA Global</strong> — 40+ pays avec visa & relocation</li>
      </ul>
      ${ctaButton('Créer mon CV maintenant', `${APP_URL}`)}
      <p style="font-size:13px;color:#94a3b8;margin:16px 0 0 0;">
        Astuce : choisissez votre persona (Étudiant, Professionnel, Expatrié...) pour un CV personnalisé.
      </p>
    `, 'Bienvenue sur HireNova — créez votre CV IA en 60 secondes'),
  }),

  // Day 1 — First CV guidance
  firstCV: (name: string) => ({
    subject: '📄 Créez votre premier CV IA en 60 secondes',
    html: emailWrapper(`
      <h2 style="font-size:22px;font-weight:700;margin:0 0 12px 0;color:#0f172a;">${name}, votre CV vous attend 🚀</h2>
      <p style="font-size:15px;line-height:1.7;color:#475569;margin:0 0 16px 0;">
        Vous ne savez pas par où commencer ? Voici un guide express pour créer un CV
        <strong>professionnel et optimisé ATS</strong> en moins de 2 minutes :
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
        <tr><td style="padding:12px 16px;background:#f0fdf4;border-radius:8px 8px 0 0;border:1px solid #bbf7d0;">
          <strong style="color:#15803d;">1. Choisissez votre persona</strong>
          <p style="font-size:13px;color:#475569;margin:4px 0 0 0;">Étudiant, Professionnel, Cadre, Freelance ou Expatrié — chaque profil a son template optimisé.</p>
        </td></tr>
        <tr><td style="padding:12px 16px;background:#f0fdf4;border-left:1px solid #bbf7d0;border-right:1px solid #bbf7d0;">
          <strong style="color:#15803d;">2. Remplissez le formulaire (4 étapes)</strong>
          <p style="font-size:13px;color:#475569;margin:4px 0 0 0;">Infos personnelles, expérience, formation, compétences. L'IA s'occupe du reste.</p>
        </td></tr>
        <tr><td style="padding:12px 16px;background:#f0fdf4;border-radius:0 0 8px 8px;border:1px solid #bbf7d0;">
          <strong style="color:#15803d;">3. Téléchargez en PDF ou Word</strong>
          <p style="font-size:13px;color:#475569;margin:4px 0 0 0;">Sans watermark avec le plan Pro. 4 langues disponibles (FR/EN/AR/ES).</p>
        </td></tr>
      </table>
      ${ctaButton('Créer mon CV', `${APP_URL}`)}
      <p style="font-size:13px;color:#94a3b8;margin:12px 0 0 0;">
        💡 90% des recruteurs utilisent des ATS. Un CV optimisé augmente vos chances de 3×.
      </p>
    `, 'Guide express : créez votre premier CV IA en 60 secondes'),
  }),

  // Day 3 — ATS optimization
  atsTips: (name: string) => ({
    subject: '🎯 5 astuces pour un CV qui passe les filtres ATS',
    html: emailWrapper(`
      <h2 style="font-size:22px;font-weight:700;margin:0 0 12px 0;color:#0f172a;">${name}, boostez votre score ATS 📈</h2>
      <p style="font-size:15px;line-height:1.7;color:#475569;margin:0 0 16px 0;">
        <strong>75% des CV sont rejetés par les ATS</strong> avant même d'être vus par un humain.
        Voici 5 astuces pour passer ces filtres automatiques :
      </p>
      <ol style="font-size:15px;line-height:1.9;color:#475569;margin:0 0 16px 0;padding-left:20px;">
        <li><strong>Mots-clés pertinents</strong> — Reprenez les mots-clés de l'offre d'emploi dans votre CV</li>
        <li><strong>Format simple</strong> — Évitez tableaux complexes, colonnes, et graphiques</li>
        <li><strong>Titres standards</strong> — "Expérience professionnelle", "Formation", "Compétences"</li>
        <li><strong>Police lisible</strong> — Arial, Calibri ou Inter (12pt minimum)</li>
        <li><strong>Acronymes dévelopés</strong> — "CRM (Customer Relationship Management)"</li>
      </ol>
      <p style="font-size:15px;line-height:1.7;color:#475569;margin:0 0 16px 0;">
        Avec HireNova IA ATS, obtenez un <strong>score sur 100</strong> et des suggestions personnalisées
        pour améliorer votre CV.
      </p>
      ${ctaButton('Analyser mon score ATS', `${APP_URL}`)}
      <p style="font-size:13px;color:#94a3b8;margin:12px 0 0 0;">
        🎁 Plan Pro : analyses ATS illimitées + 4 langues + templates premium.
      </p>
    `, '5 astuces pour passer les filtres ATS et booster votre CV'),
  }),

  // Day 7 — Discover ecosystem
  ecosystem: (name: string) => ({
    subject: '🌍 Découvrez tout l\u2019écosystème HireNova',
    html: emailWrapper(`
      <h2 style="font-size:22px;font-weight:700;margin:0 0 12px 0;color:#0f172a;">${name}, explorez nos 6 modules 🚀</h2>
      <p style="font-size:15px;line-height:1.7;color:#475569;margin:0 0 16px 0;">
        HireNova n'est pas qu'un générateur de CV. C'est un <strong>écosystème complet</strong>
        pour gérer votre carrière à l'international :
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
        <tr>
          <td width="50%" style="padding:8px;vertical-align:top;">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;">
              <strong style="color:#15803d;font-size:14px;">📄 HireNova IA CV</strong>
              <p style="font-size:12px;color:#475569;margin:4px 0 0 0;">CV IA en 60 secondes, 4 langues</p>
            </div>
          </td>
          <td width="50%" style="padding:8px;vertical-align:top;">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;">
              <strong style="color:#15803d;font-size:14px;">🎯 HireNova IA ATS</strong>
              <p style="font-size:12px;color:#475569;margin:4px 0 0 0;">Score ATS sur 100 + conseils</p>
            </div>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding:8px;vertical-align:top;">
            <div style="background:#ecfeff;border:1px solid #a5f3fc;border-radius:8px;padding:16px;">
              <strong style="color:#0e7490;font-size:14px;">💼 HireNova IA Jobs</strong>
              <p style="font-size:12px;color:#475569;margin:4px 0 0 0;">Marketplace d'emplois</p>
            </div>
          </td>
          <td width="50%" style="padding:8px;vertical-align:top;">
            <div style="background:#ecfeff;border:1px solid #a5f3fc;border-radius:8px;padding:16px;">
              <strong style="color:#0e7490;font-size:14px;">🌍 HireNova IA Global</strong>
              <p style="font-size:12px;color:#475569;margin:4px 0 0 0;">40+ pays, visa & relocation</p>
            </div>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding:8px;vertical-align:top;">
            <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:16px;">
              <strong style="color:#7e22ce;font-size:14px;">✈️ HireNova IA MOBILITY</strong>
              <p style="font-size:12px;color:#475569;margin:4px 0 0 0;">OCR + adaptation CV par pays</p>
            </div>
          </td>
          <td width="50%" style="padding:8px;vertical-align:top;">
            <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:16px;">
              <strong style="color:#7e22ce;font-size:14px;">🔌 HireNova IA API</strong>
              <p style="font-size:12px;color:#475569;margin:4px 0 0 0;">Intégration développeur REST</p>
            </div>
          </td>
        </tr>
      </table>
      ${ctaButton('Explorer l\'écosystème', `${APP_URL}`)}
      <p style="font-size:13px;color:#94a3b8;margin:12px 0 0 0;">
        💡 Astuce : pour la mobilité internationale, HireNova IA MOBILITY adapte votre CV aux standards de 12 pays.
      </p>
    `, 'Découvrez les 6 modules de l\'écosystème HireNova'),
  }),

  // Day 14 — Pro upgrade offer
  proOffer: (name: string) => ({
    subject: '⭐ Passez Pro : -30% sur votre abonnement (offre de bienvenue)',
    html: emailWrapper(`
      <h2 style="font-size:22px;font-weight:700;margin:0 0 12px 0;color:#0f172a;">${name}, débloquez HireNova Pro ⚡</h2>
      <p style="font-size:15px;line-height:1.7;color:#475569;margin:0 0 16px 0;">
        Vous avez testé HireNova ? Passez au niveau supérieur avec <strong>HireNova Pro</strong>
        et profitez de <strong style="color:#dc2626;">-30% sur votre premier mois</strong> (offre de bienvenue).
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);border-radius:12px;">
        <tr><td style="padding:24px;text-align:center;">
          <p style="font-size:13px;color:#92400e;margin:0 0 4px 0;font-weight:600;">OFFRE DE BIENVENUE</p>
          <p style="font-size:36px;font-weight:800;color:#0f172a;margin:0;">19€ <span style="font-size:18px;color:#64748b;text-decoration:line-through;">27€</span></p>
          <p style="font-size:13px;color:#92400e;margin:4px 0 0 0;">/mois — annulez à tout moment</p>
        </td></tr>
      </table>
      <p style="font-size:15px;line-height:1.7;color:#475569;margin:0 0 16px 0;">
        <strong>Ce que vous débloquez :</strong>
      </p>
      <ul style="font-size:15px;line-height:1.9;color:#475569;margin:0 0 16px 0;padding-left:20px;">
        <li>✅ CV illimités (sans watermark)</li>
        <li>✅ 4 langues : FR, EN, AR, ES</li>
        <li>✅ 3 templates premium</li>
        <li>✅ Analyses ATS illimitées</li>
        <li>✅ HireNova IA Global complet (40+ pays)</li>
        <li>✅ Lettre de motivation IA illimitée</li>
        <li>✅ Export PDF + Word</li>
      </ul>
      ${ctaButton('Profiter de -30%', `${APP_URL}`)}
      <p style="font-size:13px;color:#94a3b8;margin:12px 0 0 0;">
        ⏰ Offre limitée — valable 7 jours seulement. Satisfaction garantie ou remboursé.
      </p>
    `, 'Offre de bienvenue : -30% sur HireNova Pro'),
  }),
}

// ============= Onboarding Scheduler =============

export async function scheduleOnboardingEmails(userId: string, email: string, name: string) {
  const sequence = [
    { delay: 0, template: 'welcome' as const },
    { delay: 1, template: 'firstCV' as const },
    { delay: 3, template: 'atsTips' as const },
    { delay: 7, template: 'ecosystem' as const },
    { delay: 14, template: 'proOffer' as const },
  ]

  // In production, this would schedule via a job queue (BullMQ, etc.)
  // For now, we send immediately in dev and log the schedule
  for (const item of sequence) {
    const template = emailTemplates[item.template](name)
    console.log(`[onboarding] Scheduled ${item.template} for ${email} (day +${item.delay})`)

    if (process.env.NODE_ENV !== 'production' && item.delay === 0) {
      // Send welcome immediately in dev
      await sendEmail({ to: email, ...template })
    }
  }

  return { scheduled: sequence.length, userId }
}

// ============= Email Verification Template =============

export async function sendVerificationEmail(
  email: string,
  name: string,
  language: CVLanguage,
  token: string,
  siteUrl: string
): Promise<boolean> {
  const verificationUrl = `${siteUrl}/api/auth/verify-email?token=${token}`
  const displayName = name || email.split('@')[0]
  const subject = t(language, 'verifyEmailSubject')
  const title = t(language, 'verifyEmailTitle')
  const body = t(language, 'verifyEmailBody')
  const buttonText = t(language, 'verifyEmailButton')
  const altText = t(language, 'verifyEmailAltText')
  const expiresText = t(language, 'verifyEmailExpires')

  const htmlContent = `
    <h2 style="font-size:22px;font-weight:700;margin:0 0 12px 0;color:#0f172a;">${title} 👋</h2>
    <p style="font-size:15px;line-height:1.7;color:#475569;margin:0 0 16px 0;">${body}</p>
    ${ctaButton(buttonText, verificationUrl)}
    <p style="font-size:14px;color:#64748b;margin:16px 0 8px 0;font-weight:500;">${altText}</p>
    <p style="font-size:13px;color:#64748b;margin:0 0 0 0;word-break:break-all;background:#f1f5f9;padding:10px 14px;border-radius:6px;font-family:monospace;">${verificationUrl}</p>
    <p style="font-size:12px;color:#94a3b8;margin:16px 0 0 0;">⏰ ${expiresText}</p>
  `

  const previewText = t(language, 'verifyEmailSubject')
  const html = emailWrapper(htmlContent, previewText, language)

  return sendEmail({ to: email, subject, html })
}

// ============= Password Reset Code Template =============

export async function sendResetCodeEmail(
  email: string,
  name: string,
  code: string,
  language: CVLanguage
): Promise<boolean> {
  const displayName = name || email.split('@')[0]
  const subject = t(language, 'resetCodeSubject')
  const title = t(language, 'resetCodeTitle')
  const body = t(language, 'resetCodeBody')
  const expiresText = t(language, 'resetCodeExpires')

  const htmlContent = `
    <h2 style="font-size:22px;font-weight:700;margin:0 0 12px 0;color:#0f172a;">${title} 🔐</h2>
    <p style="font-size:15px;line-height:1.7;color:#475569;margin:0 0 24px 0;">${body}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;background:linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 100%);border-radius:12px;border:2px dashed #bbf7d0;">
      <tr><td style="padding:32px;text-align:center;">
        <p style="font-size:13px;color:#15803d;margin:0 0 8px 0;font-weight:600;letter-spacing:1px;text-transform:uppercase;">${language === 'en' ? 'YOUR RESET CODE' : language === 'ar' ? 'رمز إعادة التعيين' : language === 'es' ? 'TU CÓDIGO DE RESTABLECIMIENTO' : 'VOTRE CODE DE RÉINITIALISATION'}</p>
        <p style="font-size:40px;font-weight:800;color:#0f172a;margin:0;letter-spacing:8px;font-family:monospace;">${code}</p>
      </td></tr>
    </table>
    <p style="font-size:12px;color:#94a3b8;margin:0;">⏰ ${expiresText}</p>
  `

  const previewText = t(language, 'resetCodeSubject')
  const html = emailWrapper(htmlContent, previewText, language)

  return sendEmail({ to: email, subject, html })
}
