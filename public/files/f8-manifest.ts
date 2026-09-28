import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HireNova — Générateur de CV IA & Score ATS',
    short_name: 'HireNova',
    description:
      'Créez un CV professionnel optimisé ATS et une lettre de motivation en 60 secondes avec l\'IA.',
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
