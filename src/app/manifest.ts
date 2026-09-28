import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HireNova — Plateforme IA de Gestion de Carrière & Recrutement',
    short_name: 'HireNova',
    description:
      'Plateforme IA complète de gestion de carrière et recrutement. CV, lettres de motivation, score ATS, coaching, marketplace d\'emplois et recrutement international.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#059669',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/hirenova-logo.png',
        sizes: 'any',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    categories: ['business', 'productivity', 'utilities'],
    lang: 'fr',
  }
}
