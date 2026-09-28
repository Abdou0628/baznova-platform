import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 20))

    const where: Record<string, unknown> = {}
    if (userId) where.userId = userId
    if (status) where.status = status

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.invoice.count({ where }),
    ])

    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[payments/invoices] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}

interface CreateInvoiceBody {
  userId: string
  amount: number
  currency?: string
  taxRate?: number
  description?: string
  dueDate?: string
}

function isValidCreateBody(body: unknown): body is CreateInvoiceBody {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return (
    typeof b.userId === 'string' &&
    typeof b.amount === 'number' &&
    b.amount > 0
  )
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json()

    if (!isValidCreateBody(body)) {
      return NextResponse.json(
        { error: 'Invalid request. Required: userId, amount (number > 0)' },
        { status: 400 }
      )
    }

    const { userId, amount, currency = 'MAD', taxRate = 20, description = '', dueDate } = body

    // Generate invoice number
    const year = new Date().getFullYear()
    const count = await db.invoice.count()
    const invoiceNumber = `FAC-${year}-${String(count + 1).padStart(4, '0')}`

    const taxAmount = amount * (taxRate / 100)
    const totalAmount = amount + taxAmount

    const invoice = await db.invoice.create({
      data: {
        userId,
        invoiceNumber,
        amount: Math.round(amount * 100), // store in cents
        currency,
        status: 'pending',
        description,
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lineItems: JSON.stringify([
          { description: description || 'HireNova Subscription', amount, quantity: 1 },
        ]),
      },
    })

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (error) {
    console.error('[payments/invoices] POST error:', error)
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
  }
}
