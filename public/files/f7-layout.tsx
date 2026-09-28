import type { Metadata } from 'next'
import './globals.css'

const SITE_URL = 'https://hirenova.com'
const SITE_NAME = 'HireNova'
const SITE_DESCRIPTION_FR =
  'Générez un CV professionnel optimisé ATS et une lettre de motivation en 60 secondes avec l\'IA. Disponible en français, anglais, arabe et espagnol. Score ATS détaillé, templates premium, téléchargement PDF et Word.'
const SITE_DESCRIPTION_EN =
  'Generate an ATS-optimized professional resume and cover letter in 60 seconds with AI. Available in French, English, Arabic and Spanish. Detailed ATS score, premium templates, PDF and Word download.'
const SITE_DESCRIPTION_AR =
  'أنشئ سيرة ذاتية احترافية محسّنة لـ ATS ورسالة تعريف في 60 ثانية بالذكاء الاصطناعي. متوفر بالفرنسية والإنجليزية والعربية والإسبانية.'
const SITE_DESCRIPTION_ES =
  'Genera un currículum profesional optimizado para ATS y una carta de presentación en 60 segundos con IA. Disponible en francés, inglés, árabe y español.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'HireNova — Générateur de CV IA, Lettre de Motivation & Score ATS | E-Society 2050',
    template: '%s | HireNova',
  },
  description: SITE_DESCRIPTION_FR,
  keywords: [
    // Core
    'HireNova', 'E-Society 2050', 'générateur CV IA',
    // CV
    'créer CV', 'CV professionnel', 'générateur CV', 'CV en ligne', 'créer CV gratuit',
    'CV multilingue', 'CV français', 'CV anglais', 'CV arabe', 'CV espagnol',
    // ATS
    'score ATS', 'optimisation ATS', 'CV compatible ATS', 'ATS friendly resume',
    'analyse ATS', 'ATS score checker',
    // Cover letter
    'lettre de motivation', 'générateur lettre de motivation', 'cover letter generator',
    'lettre de motivation IA', 'créer lettre de motivation',
    // Features
    'CV PDF', 'CV Word', 'template CV', 'modèle CV', 'resume template',
    'IA CV', 'intelligence artificielle CV', 'AI resume builder',
    // International
    'CV Maroc', 'CV France', 'CV international', 'resume Europe', 'CV Africa',
    'générateur CV Maroc', 'créer CV Francophone',
    // Long tail
    'comment faire un CV professionnel', 'CV pour recruteur', 'CV qui passe les ATS',
    'lettre de motivation exemple', 'CV sans expérience', 'CV étudiant',
  ],
  authors: [{ name: 'E-Society 2050', url: 'https://esociety2050.com' }],
  creator: 'E-Society 2050',
  publisher: 'E-Society 2050',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  category: 'business',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      'fr': `${SITE_URL}/?lang=fr`,
      'en': `${SITE_URL}/?lang=en`,
      'ar': `${SITE_URL}/?lang=ar`,
      'es': `${SITE_URL}/?lang=es`,
      'x-default': SITE_URL,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'HireNova — Générateur de CV IA & Lettre de Motivation en 60 secondes',
    description: SITE_DESCRIPTION_FR,
    images: [
      {
        url: '/images/hero-career.jpg',
        width: 1200,
        height: 630,
        alt: 'HireNova — Créez votre CV professionnel avec l\'IA en 60 secondes',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HireNova — Générateur de CV IA & Score ATS',
    description: SITE_DESCRIPTION_FR,
    images: ['/images/hero-career.jpg'],
    creator: '@hirenova_ai',
  },
  icons: {
    icon: [
      { url: '/hirenova-logo.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/hirenova-logo.png' }],
  },
  verification: {
    google: 'google-site-verification-code',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Preconnect to critical origins */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* JSON-LD Structured Data — Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'HireNova',
              alternateName: 'HireNova by E-Society 2050',
              url: SITE_URL,
              logo: `${SITE_URL}/hirenova-logo.png`,
              description: SITE_DESCRIPTION_FR,
              sameAs: [
                'https://twitter.com/hirenova_ai',
                'https://linkedin.com/company/hirenova',
                'https://instagram.com/hirenova_ai',
              ],
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'customer support',
                availableLanguage: ['French', 'English', 'Arabic', 'Spanish'],
              },
              founder: {
                '@type': 'Organization',
                name: 'E-Society 2050',
              },
            }),
          }}
        />
        {/* JSON-LD — WebApplication / SoftwareProduct */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'HireNova',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              offers: [
                {
                  '@type': 'Offer',
                  price: '0',
                  priceCurrency: 'EUR',
                  description: 'Plan Gratuit — Découverte',
                },
                {
                  '@type': 'Offer',
                  price: '6.99',
                  priceCurrency: 'EUR',
                  description: 'Plan Pro — Chercheurs d\'emploi actifs',
                },
                {
                  '@type': 'Offer',
                  price: '70',
                  priceCurrency: 'EUR',
                  description: 'Plan Annuel — Recherche d\'emploi complète',
                },
              ],
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '1247',
                bestRating: '5',
                worstRating: '1',
              },
              description: SITE_DESCRIPTION_FR,
              featureList: [
                'Génération de CV par IA',
                'Génération de lettre de motivation par IA',
                'Score ATS détaillé',
                '4 langues (FR, EN, AR, ES)',
                '3 templates professionnels',
                'Export PDF et Word',
                'Optimisation pour systèmes ATS',
              ],
              screenshot: `${SITE_URL}/images/hero-career.jpg`,
            }),
          }}
        />
        {/* JSON-LD — WebSite with SearchAction */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'HireNova',
              url: SITE_URL,
              potentialAction: {
                '@type': 'SearchAction',
                target: `${SITE_URL}/?q={search_term_string}`,
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
      </head>
      <body className="antialiased bg-background text-foreground">
        {/* Global ChunkLoadError retry — auto-reload when server restarts (persistent loop) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var reloading = false;
                function handleChunkError(e) {
                  try {
                    var msg = (e && e.message) || (e && e.error && e.error.message) || String(e);
                    if (msg.indexOf('Failed to load chunk') !== -1 || msg.indexOf('ChunkLoadError') !== -1) {
                      if (reloading) return;
                      reloading = true;
                      console.warn('[ChunkLoadRetry] Server may be restarting. Auto-reload in 1.5s...');
                      setTimeout(function() { window.location.reload(); }, 1500);
                    }
                  } catch (_) {}
                }
                window.addEventListener('error', handleChunkError);
                window.addEventListener('unhandledrejection', function(e) {
                  var msg = (e && e.reason && e.reason.message) || String(e && e.reason);
                  if (msg.indexOf('Failed to load chunk') !== -1 || msg.indexOf('ChunkLoadError') !== -1) {
                    handleChunkError({ message: msg });
                  }
                });
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  )
}
