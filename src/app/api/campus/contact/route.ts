import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email'

/**
 * POST /api/campus/contact
 * Public endpoint — university partnership request.
 * Saves to SupportTicket and notifies admin.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { university, contactName, email, phone, studentsCount, message } = body

    // Validation
    if (!university || !contactName || !email) {
      return NextResponse.json(
        { success: false, error: { code: 400, message: 'Champs requis manquants' } },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: { code: 400, message: 'Email invalide' } },
        { status: 400 }
      )
    }

    // Save as support ticket
    const fullMessage = `Demande de partenariat universitaire:

Université: ${university}
Contact: ${contactName}
Email: ${email}
Téléphone: ${phone || 'N/A'}
Étudiants: ${studentsCount || 'N/A'}

Message: ${message || 'N/A'}`

    const ticket = await db.supportTicket.create({
      data: {
        name: contactName,
        email,
        subject: `Partenariat Campus — ${university}`,
        message: fullMessage,
        status: 'open',
      },
    }).catch(() => null)

    // Notify admin via email
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@hirenova.com'
    await sendEmail({
      to: adminEmail,
      subject: `Nouvelle demande Campus — ${university}`,
      html: `<h2>Nouvelle demande de partenariat Campus</h2>
        <p><strong>Université:</strong> ${university}</p>
        <p><strong>Contact:</strong> ${contactName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Téléphone:</strong> ${phone || 'N/A'}</p>
        <p><strong>Étudiants:</strong> ${studentsCount || 'N/A'}</p>
        <p><strong>Message:</strong></p>
        <p>${message || 'N/A'}</p>
        <p>Ticket ID: ${ticket?.id || 'N/A'}</p>`,
    }).catch(() => null)

    // Auto-reply to university contact
    await sendEmail({
      to: email,
      subject: 'HireNova IA CAMPUS SaaS — Votre demande a bien été reçue',
      html: `<h2>Bonjour ${contactName},</h2>
        <p>Nous avons bien reçu votre demande de partenariat pour <strong>${university}</strong>.</p>
        <p>Notre équipe Campus vous recontactera sous <strong>48 heures ouvrées</strong> pour planifier un échange.</p>
        <p>En attendant, n'hésitez pas à découvrir HireNova sur <a href="https://hirenova.com">hirenova.com</a>.</p>
        <p>Cordialement,<br>L'équipe HireNova IA CAMPUS SaaS</p>`,
    }).catch(() => null)

    return NextResponse.json({
      success: true,
      data: { ticketId: ticket?.id, received: true },
    })
  } catch (error) {
    console.error('[campus/contact] error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { success: false, error: { code: 500, message: 'Erreur lors de l\'envoi' } },
      { status: 500 }
    )
  }
}
