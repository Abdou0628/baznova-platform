'use client'

import { useState, useEffect } from 'react'
import SupportButton from './support-button'
import LegalDialog from './legal-dialog'

export default function GlobalProviders() {
  const [legalOpen, setLegalOpen] = useState(false)

  useEffect(() => {
    const handler = () => setLegalOpen(true)
    document.addEventListener('open-legal', handler)
    return () => document.removeEventListener('open-legal', handler)
  }, [])

  return (
    <>
      <SupportButton />
      <LegalDialog open={legalOpen} onClose={() => setLegalOpen(false)} />
    </>
  )
}
