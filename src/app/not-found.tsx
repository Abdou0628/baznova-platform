'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-4">
        <FileQuestion className="w-20 h-20 mx-auto text-emerald-500 mb-6" />
        <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Cette page n&apos;existe pas ou a été déplacée.
        </p>
        <Button
          onClick={() => window.location.href = '/'}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          Retour à l&apos;accueil
        </Button>
      </div>
    </div>
  )
}
