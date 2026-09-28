import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/hnsa'

// GET /api/recruiter/pipeline — fetch all recruiter jobs with candidates
export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const userId = auth.userId

    let jobs = await db.recruiterJob.findMany({
      where: { userId },
      include: { candidates: { orderBy: { score: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    })

    // If no jobs exist for demo user, seed sample data
    if (jobs.length === 0) {
      // Create demo user if not exists
      const user = await db.user.findFirst({ where: { email: 'recruiter@hirenova.com' } })
      if (user) {
        // Create sample jobs
        const job1 = await db.recruiterJob.create({
          data: {
            userId: user.id,
            title: 'Développeur Full-Stack Senior',
            description: 'Recherche un développeur full-stack avec 5+ ans d\'expérience en React, Node.js et bases de données.',
            department: 'Ingénierie',
            location: 'Casablanca, Maroc',
            type: 'full-time',
            status: 'open',
          },
        })

        const job2 = await db.recruiterJob.create({
          data: {
            userId: user.id,
            title: 'Product Designer UX/UI',
            description: 'Designer UI/UX avec expérience en Figma, design systems et user research.',
            department: 'Design',
            location: 'Paris, France',
            type: 'full-time',
            status: 'open',
          },
        })

        const job3 = await db.recruiterJob.create({
          data: {
            userId: user.id,
            title: 'Data Analyst',
            description: 'Analyste de données avec compétences en SQL, Python, Tableau et machine learning basics.',
            department: 'Data',
            location: 'Remote',
            type: 'contract',
            status: 'open',
          },
        })

        // Seed candidates for job 1
        const candidateData1 = [
          { name: 'Sarah Martin', email: 'sarah.martin@email.com', score: 92, stage: 'interview', notes: 'Strong React & Node.js skills, 6 years exp.' },
          { name: 'Ahmed Benali', email: 'ahmed.benali@email.com', score: 85, stage: 'screening', notes: 'Full-stack dev, good culture fit.' },
          { name: 'Claire Dubois', email: 'claire.dubois@email.com', score: 78, stage: 'new', notes: '3 years frontend, learning backend.' },
          { name: 'Youssef Amrani', email: 'youssef.amrani@email.com', score: 95, stage: 'offer', notes: 'Excellent technical interview, team lead potential.' },
          { name: 'Marie Leclerc', email: 'marie.leclerc@email.com', score: 62, stage: 'new', notes: 'Junior developer, needs mentoring.' },
          { name: 'Omar Tazi', email: 'omar.tazi@email.com', score: 88, stage: 'interview', notes: 'Strong system design skills.' },
        ]

        for (const c of candidateData1) {
          await db.recruiterCandidate.create({ jobId: job1.id, ...c })
        }

        const candidateData2 = [
          { name: 'Léa Fontaine', email: 'lea.fontaine@email.com', score: 90, stage: 'screening', notes: 'Impressive Figma portfolio, 4 years UX.' },
          { name: 'Karim El Idrissi', email: 'karim.elidrissi@email.com', score: 82, stage: 'new', notes: 'Good UI skills, new to user research.' },
          { name: 'Nadia Berrada', email: 'nadia.berrada@email.com', score: 73, stage: 'new', notes: 'Graphic designer transitioning to UX.' },
        ]

        for (const c of candidateData2) {
          await db.recruiterCandidate.create({ jobId: job2.id, ...c })
        }

        const candidateData3 = [
          { name: 'Thomas Moreau', email: 'thomas.moreau@email.com', score: 87, stage: 'interview', notes: 'SQL expert, strong Python skills.' },
          { name: 'Fatima Zahra Ouali', email: 'fatima.ouali@email.com', score: 79, stage: 'new', notes: 'Tableau certified, basic ML.' },
        ]

        for (const c of candidateData3) {
          await db.recruiterCandidate.create({ jobId: job3.id, ...c })
        }

        jobs = await db.recruiterJob.findMany({
          where: { userId: user.id },
          include: { candidates: { orderBy: { score: 'desc' } } },
          orderBy: { createdAt: 'desc' },
        })
      }
    }

    // Format jobs with candidatesCount
    const formattedJobs = jobs.map(j => ({
      id: j.id,
      title: j.title,
      department: j.department,
      location: j.location,
      type: j.type,
      status: j.status,
      candidatesCount: j.candidates.length,
      candidates: j.candidates.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        score: c.score,
        stage: c.stage,
        notes: c.notes,
        appliedAt: c.appliedAt.toISOString(),
      })),
      createdAt: j.createdAt.toISOString(),
    }))

    return NextResponse.json({ jobs: formattedJobs })
  } catch (error) {
    console.error('Pipeline GET error:', error)
    return NextResponse.json({ jobs: [] }, { status: 500 })
  }
}

// POST /api/recruiter/pipeline — move candidate stage or create job
export async function POST(req: NextRequest) {
  try {
    const auth = await withAuth(req)
    if (!auth.authorized) return NextResponse.json({ error: auth.reason }, { status: auth.statusCode })

    const body = await req.json()

    // Create new job
    if (body.action === 'createJob') {
      const user = await db.user.findFirst({ where: { email: 'recruiter@hirenova.com' } })
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

      const job = await db.recruiterJob.create({
        data: {
          userId: user.id,
          title: body.title || 'Untitled',
          description: body.description || '',
          department: body.department || '',
          location: body.location || '',
          type: body.type || 'full-time',
          status: 'open',
        },
      })

      return NextResponse.json({ job: { id: job.id, title: job.title } })
    }

    // Move candidate stage
    const { candidateId, toStage } = body
    if (!candidateId || !toStage) {
      return NextResponse.json({ error: 'Missing candidateId or toStage' }, { status: 400 })
    }

    const validStages = ['new', 'screening', 'interview', 'offer', 'hired', 'rejected']
    if (!validStages.includes(toStage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }

    const updated = await db.recruiterCandidate.update({
      where: { id: candidateId },
      data: { stage: toStage },
    })

    return NextResponse.json({ success: true, candidateId: updated.id, stage: updated.stage })
  } catch (error) {
    console.error('Pipeline POST error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
