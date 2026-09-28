import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { forwardToSIEM, createSIEMEvent } from '@/lib/hnsa'
import { encryptBeforeWrite } from '@/lib/hnsa/encryption-middleware'

/**
 * POST /api/enterprise-contact
 * Public endpoint — Enterprise custom-quote request from the pricing page.
 * Saves to EnterpriseInquiry and notifies admin + auto-replies to the contact.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      contactName,
      workEmail,
      phone,
      companyName,
      jobTitle,
      industry,
      companySize,
      country,
      website,
      usersCount,
      useCase,
      message,
      budget,
    } = body

    // Validation
    if (!contactName || !workEmail || !companyName || !message) {
      return NextResponse.json(
        { success: false, error: { code: 400, message: 'Champs requis manquants' } },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(workEmail)) {
      return NextResponse.json(
        { success: false, error: { code: 400, message: 'Email professionnel invalide' } },
        { status: 400 }
      )
    }

    // Reject free email providers for Enterprise tier (soft check)
    const freeDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com']
    const domain = workEmail.split('@')[1]?.toLowerCase() || ''
    const isFreeEmail = freeDomains.includes(domain)

    if (message.length < 20) {
      return NextResponse.json(
        { success: false, error: { code: 400, message: 'Le message doit contenir au moins 20 caractères' } },
        { status: 400 }
      )
    }

    // Encrypt sensitive fields before writing (phone, companyName, industry)
    const rawData = {
      contactName: String(contactName).trim().slice(0, 100),
      workEmail: String(workEmail).toLowerCase().trim().slice(0, 150),
      phone: phone ? String(phone).trim().slice(0, 30) : null,
      companyName: String(companyName).trim().slice(0, 150),
      jobTitle: jobTitle ? String(jobTitle).trim().slice(0, 100) : null,
      industry: industry ? String(industry).trim().slice(0, 80) : null,
      companySize: companySize ? String(companySize).trim().slice(0, 30) : null,
      country: country ? String(country).trim().slice(0, 80) : null,
      website: website ? String(website).trim().slice(0, 200) : null,
      usersCount: usersCount ? String(usersCount).trim().slice(0, 30) : null,
      useCase: useCase ? String(useCase).trim().slice(0, 100) : null,
      message: String(message).trim().slice(0, 3000),
      budget: budget ? String(budget).trim().slice(0, 30) : null,
      status: 'new',
      source: 'pricing_page',
    }
    let inquiryData = rawData
    try {
      inquiryData = encryptBeforeWrite(rawData)
    } catch (encErr) {
      forwardToSIEM(createSIEMEvent({
        type: 'FIELD_ENCRYPTION_ERROR',
        severity: 'critical',
        path: '/api/enterprise-contact',
        metadata: { error: encErr instanceof Error ? encErr.message : String(encErr) },
      })).catch(() => {})
      // Fallback: use unencrypted data so the inquiry is still saved
    }

    // Save inquiry
    const inquiry = await db.enterpriseInquiry.create({
      data: inquiryData,
    }).catch((err) => {
      console.error('[enterprise-contact] DB error:', err)
      return null
    })

    // Notify admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@hirenova.com'
    await sendEmail({
      to: adminEmail,
      subject: `[Enterprise] Nouvelle demande — ${companyName}`,
      html: `<h2>🚀 Nouvelle demande Enterprise</h2>
        <p><strong>Entreprise:</strong> ${companyName}${isFreeEmail ? ' <em>(⚠️ email perso)</em>' : ''}</p>
        <p><strong>Contact:</strong> ${contactName} ${jobTitle ? `(${jobTitle})` : ''}</p>
        <p><strong>Email:</strong> ${workEmail}</p>
        <p><strong>Téléphone:</strong> ${phone || 'N/A'}</p>
        <p><strong>Industrie:</strong> ${industry || 'N/A'}</p>
        <p><strong>Taille:</strong> ${companySize || 'N/A'}</p>
        <p><strong>Pays:</strong> ${country || 'N/A'}</p>
        <p><strong>Site web:</strong> ${website || 'N/A'}</p>
        <p><strong>Utilisateurs attendus:</strong> ${usersCount || 'N/A'}</p>
        <p><strong>Cas d'usage:</strong> ${useCase || 'N/A'}</p>
        <p><strong>Budget:</strong> ${budget || 'N/A'}</p>
        <p><strong>Message:</strong></p>
        <p>${String(message).replace(/\n/g, '<br>')}</p>
        <hr>
        <p><small>Inquiry ID: ${inquiry?.id || 'N/A'} • Source: pricing_page</small></p>`,
    }).catch(() => null)

    // Auto-reply to enterprise contact
    await sendEmail({
      to: workEmail,
      subject: 'HireNova Enterprise — Votre demande a bien été reçue',
      html: `<h2>Bonjour ${contactName},</h2>
        <p>Merci pour votre intérêt pour <strong>HireNova Enterprise</strong> pour <strong>${companyName}</strong>.</p>
        <p>Nous avons bien reçu votre demande et notre équipe commerciale vous recontactera sous <strong>24 à 48 heures ouvrées</strong> pour organiser un échange et préparer un devis personnalisé.</p>
        <p>Pour préparer cet échange, nous aborderons :</p>
        <ul>
          <li>Le nombre d'utilisateurs et les rôles</li>
          <li>Les intégrations nécessaires (SSO, API, ATS)</li>
          <li>Le niveau de SLA et le support dédié</li>
          <li>La formation de vos équipes</li>
        </ul>
        <p>En attendant, n'hésitez pas à consulter notre <a href="https://hirenova.com">site</a> ou notre <a href="https://hirenova.com/api">documentation API</a>.</p>
        <p>Cordialement,<br><strong>L'équipe Enterprise — HireNova</strong><br>hello@hirenova.com</p>`,
    }).catch(() => null)

    return NextResponse.json({
      success: true,
      data: { inquiryId: inquiry?.id, received: true },
    })
  } catch (error) {
    console.error('[enterprise-contact] error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur lors de l\'envoi' } },
      { status: 500 }
    )
  }
}
