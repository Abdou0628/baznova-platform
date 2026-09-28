import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'
import {
  generateQuoteForInquiry,
  generateInvoiceForPayment,
  generateReceiptForPayment,
  generateAgreementForInquiry,
  nextDocumentNumber,
  type DocumentItem,
} from '@/lib/documents'

/**
 * POST /api/documents/generate
 * Admin-only: generate a document (quote, invoice, receipt, agreement) on demand.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await withAuth(request, { requiredRole: 'admin' })
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason, code: 'FORBIDDEN' }, { status: auth.statusCode })
    }

    const body = await request.json().catch(() => ({}))
    const { type, inquiryId, ...rest } = body

    if (!['quote', 'invoice', 'receipt', 'agreement', 'credit_note'].includes(type)) {
      return NextResponse.json({ error: 'Type de document invalide' }, { status: 400 })
    }

    let doc

    if (type === 'quote' && inquiryId) {
      const inquiry = await db.enterpriseInquiry.findUnique({ where: { id: inquiryId } })
      if (!inquiry) {
        return NextResponse.json({ error: 'Demande Enterprise introuvable' }, { status: 404 })
      }

      const items: DocumentItem[] = body.items || [
        { description: `Licence Enterprise HireNova — ${inquiry.usersCount || '50-200'} utilisateurs / an`, quantity: 1, unitPrice: 12000, total: 12000 },
        { description: 'Pack onboarding & formation équipe (1 journée)', quantity: 1, unitPrice: 1500, total: 1500 },
        { description: 'Support dédié 24/7 + SLA 99.9%', quantity: 1, unitPrice: 3000, total: 3000 },
      ]

      doc = await generateQuoteForInquiry({
        inquiryId: inquiry.id,
        contactName: inquiry.contactName,
        workEmail: inquiry.workEmail,
        companyName: inquiry.companyName,
        country: inquiry.country || undefined,
        usersCount: inquiry.usersCount || undefined,
        useCase: inquiry.useCase || undefined,
        items,
        currency: body.currency || 'EUR',
        notes: body.notes,
      })

      await db.enterpriseInquiry.update({
        where: { id: inquiry.id },
        data: { status: 'contacted' },
      })
    } else if (type === 'agreement' && inquiryId) {
      const inquiry = await db.enterpriseInquiry.findUnique({ where: { id: inquiryId } })
      if (!inquiry) {
        return NextResponse.json({ error: 'Demande Enterprise introuvable' }, { status: 404 })
      }

      doc = await generateAgreementForInquiry({
        inquiryId: inquiry.id,
        contactName: inquiry.contactName,
        workEmail: inquiry.workEmail,
        companyName: inquiry.companyName,
        country: inquiry.country || undefined,
        totalAmount: body.totalAmount || 16500,
        currency: body.currency || 'EUR',
        terms: body.terms,
      })
    } else if (type === 'invoice') {
      doc = await generateInvoiceForPayment({
        userEmail: body.recipientEmail,
        userName: body.recipientName,
        plan: body.plan || 'pro',
        amount: body.amount || 19,
        currency: body.currency || 'EUR',
        userId: body.userId,
        paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
      })
    } else if (type === 'receipt') {
      doc = await generateReceiptForPayment({
        userEmail: body.recipientEmail,
        userName: body.recipientName,
        amount: body.amount || 19,
        currency: body.currency || 'EUR',
        description: body.description || 'Abonnement HireNova Pro',
        userId: body.userId,
        paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
      })
    } else {
      const { generateDocument } = await import('@/lib/documents')
      const number = await nextDocumentNumber(type)
      doc = await generateDocument({
        type,
        number,
        recipientName: body.recipientName,
        recipientEmail: body.recipientEmail,
        recipientCompany: body.recipientCompany,
        recipientAddress: body.recipientAddress,
        recipientCountry: body.recipientCountry,
        subject: body.subject || 'Document',
        items: body.items || [],
        currency: body.currency || 'EUR',
        taxRate: body.taxRate || 0,
        notes: body.notes,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: doc.id,
        number: doc.number,
        type: doc.type,
        total: doc.total,
      },
    })
  } catch (error) {
    console.error('[documents/generate] error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Erreur lors de la génération du document' },
      { status: 500 }
    )
  }
}
