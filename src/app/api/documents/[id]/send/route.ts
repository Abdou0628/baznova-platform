import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'
import { sendEmail } from '@/lib/email'

/**
 * POST /api/documents/[id]/send
 * Admin: send the PDF document by email to the recipient.
 * Body: { customMessage?: string, customEmail?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await withAuth(request, { requiredRole: 'admin' })
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const doc = await db.document.findUnique({ where: { id } })
    if (!doc) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const recipientEmail = body.customEmail || doc.recipientEmail

    if (!recipientEmail) {
      return NextResponse.json({ error: 'Email du destinataire manquant' }, { status: 400 })
    }

    if (!doc.pdfBase64) {
      return NextResponse.json({ error: 'PDF non généré' }, { status: 404 })
    }

    const typeLabels: Record<string, { label: string; subject: string }> = {
      invoice: { label: 'facture', subject: `Facture ${doc.number} — HireNova` },
      quote: { label: 'devis', subject: `Devis ${doc.number} — HireNova` },
      agreement: { label: 'contrat', subject: `Contrat ${doc.number} — HireNova` },
      receipt: { label: 'reçu', subject: `Reçu de paiement ${doc.number} — HireNova` },
      credit_note: { label: 'avoir', subject: `Avoir ${doc.number} — HireNova` },
    }

    const meta = typeLabels[doc.type] || { label: 'document', subject: `Document ${doc.number}` }
    const customMessage = body.customMessage || ''

    const html = `
      <h2 style="font-size:22px;font-weight:700;margin:0 0 12px 0;color:#0f172a;">
        Bonjour ${doc.recipientName},
      </h2>
      <p style="font-size:15px;line-height:1.7;color:#475569;margin:0 0 16px 0;">
        Veuillez trouver ci-joint votre <strong>${meta.label} ${doc.number}</strong> émis par HireNova.
      </p>
      ${customMessage ? `<p style="font-size:15px;line-height:1.7;color:#475569;margin:0 0 16px 0;">${customMessage}</p>` : ''}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#f0fdf4;border-radius:8px;">
        <tr><td style="padding:16px;">
          <strong style="color:#15803d;font-size:14px;">Récapitulatif</strong>
          <p style="font-size:13px;color:#475569;margin:8px 0 0 0;">
            <strong>Objet :</strong> ${doc.subject}<br>
            <strong>Numéro :</strong> ${doc.number}<br>
            <strong>Date d'émission :</strong> ${new Date(doc.issueDate).toLocaleDateString('fr-FR')}<br>
            <strong>Montant total :</strong> ${doc.total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${doc.currency}
          </p>
        </td></tr>
      </table>
      <p style="font-size:15px;line-height:1.7;color:#475569;margin:0 0 16px 0;">
        Pour toute question, n'hésitez pas à nous contacter à <a href="mailto:hello@hirenova.com" style="color:#059669;">hello@hirenova.com</a>.
      </p>
      <p style="font-size:13px;color:#94a3b8;margin:0;">
        Cordialement,<br>
        <strong>L'équipe HireNova — E-Society 2050</strong>
      </p>
    `

    // Send email with PDF attachment (base64)
    const emailSent = await sendEmailWithAttachment({
      to: recipientEmail,
      subject: meta.subject,
      html,
      attachment: {
        filename: `${meta.label}-${doc.number}.pdf`,
        content: doc.pdfBase64,
        contentType: 'application/pdf',
      },
    })

    if (!emailSent) {
      // Fallback: send email with download link
      await sendEmail({
        to: recipientEmail,
        subject: meta.subject,
        html: html + `<p style="font-size:13px;color:#94a3b8;margin-top:16px;padding:12px;background:#fef3c7;border-radius:6px;">📎 Le document est disponible dans votre espace HireNova. Connectez-vous pour le télécharger.</p>`,
      })
    }

    // Update document status
    const newStatus = doc.type === 'invoice' ? 'sent' : doc.type === 'quote' ? 'sent' : 'sent'
    await db.document.update({
      where: { id },
      data: { status: newStatus },
    })

    return NextResponse.json({
      success: true,
      data: { sent: true, recipientEmail },
    })
  } catch (error) {
    console.error('[documents/[id]/send] error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Erreur lors de l\'envoi' }, { status: 500 })
  }
}

/**
 * Helper to send email with PDF attachment.
 * Uses nodemailer's attachment feature when SMTP is configured.
 * In dev mode (no SMTP), logs and returns true so the API caller can fallback to download link.
 */
async function sendEmailWithAttachment(params: {
  to: string
  subject: string
  html: string
  attachment: { filename: string; content: string; contentType: string }
}): Promise<boolean> {
  if (!process.env.SMTP_HOST) {
    console.log('\n========== EMAIL WITH ATTACHMENT (DEV MODE) ==========')
    console.log(`To: ${params.to}`)
    console.log(`Subject: ${params.subject}`)
    console.log(`Attachment: ${params.attachment.filename} (${Math.round(params.attachment.content.length * 0.75 / 1024)} KB)`)
    console.log('======================================================\n')
    return true
  }

  try {
    const nodemailer = (await import('nodemailer')).default
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'HireNova <noreply@hirenova.com>',
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: [{
        filename: params.attachment.filename,
        content: Buffer.from(params.attachment.content, 'base64'),
        contentType: params.attachment.contentType,
      }],
    })
    return true
  } catch (err) {
    console.error('[sendEmailWithAttachment] failed:', err instanceof Error ? err.message : String(err))
    return false
  }
}
