'use client'

import React, { Component, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  stepName?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', this.props.stepName ?? 'unknown', error, errorInfo)
    // Auto-retry on ChunkLoadError (server may be restarting via persistent loop)
    const isChunkError = error?.name === 'ChunkLoadError' ||
      (error?.message && error.message.includes('Failed to load chunk'))
    if (isChunkError && typeof window !== 'undefined') {
      setTimeout(() => {
        // Clear persisted step to avoid infinite loop on reload
        try { localStorage.removeItem('baznova-step') } catch {}
        this.setState({ hasError: false, error: null })
        window.location.reload()
      }, 1500)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  handleHome = () => {
    this.setState({ hasError: false, error: null })
    if (typeof window !== 'undefined') {
      // Reset persisted step to 'landing' so we don't get stuck on the failing module
      try {
        localStorage.removeItem('baznova-step')
      } catch {}
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-emerald-50/30 p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Module temporairement indisponible</h2>
              <p className="text-sm text-muted-foreground">
                Une erreur est survenue lors du chargement du module
                {this.props.stepName ? ` &laquo;&nbsp;${this.props.stepName}&nbsp;&raquo;` : ''}.
                Le serveur est peut-&ecirc;tre en cours de red&eacute;marrage.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleRetry} className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer">
                <RotateCcw className="w-4 h-4 mr-2" /> R&eacute;essayer
              </Button>
              <Button variant="outline" onClick={this.handleHome} className="cursor-pointer">
                <Home className="w-4 h-4 mr-2" /> Accueil
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
