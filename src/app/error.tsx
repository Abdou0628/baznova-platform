'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-4">
        <AlertTriangle className="w-20 h-20 mx-auto text-red-500 mb-6" />
        <h1 className="text-4xl font-bold text-foreground mb-2">Erreur</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Une erreur inattendue s&apos;est produite. Veuillez réessayer.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="outline">
            Réessayer
          </Button>
          <Button
            onClick={() => window.location.href = '/'}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Retour à l&apos;accueil
          </Button>
        </div>
      </div>
    </div>
  )
}
