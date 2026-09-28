'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Code2, Terminal, FileText, Shield, CheckCircle, XCircle, Zap, CreditCard, BarChart3, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

const curlExample = `curl -X POST https://api.hirenova.com/api/v1/cv/generate \
  -H "X-API-Key: hnv_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Ahmed Benali",
    "email": "ahmed@email.com",
    "targetJob": "Développeur Full Stack",
    "skills": "JavaScript, React, Node.js",
    "experience": "3 ans en développement web",
    "education": "Master Informatique",
    "language": "fr"
  }'`

const jsExample = `const response = await fetch('https://api.hirenova.com/api/v1/cv/generate', {
  method: 'POST',
  headers: {
    'X-API-Key': 'hnv_live_abc123...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fullName: "Ahmed Benali",
    email: "ahmed@email.com",
    targetJob: "Développeur Full Stack",
    skills: "JavaScript, React, Node.js",
    experience: "3 ans en développement web",
    education: "Master Informatique",
    language: "fr"
  })
})
const data = await response.json()`

export default function ApiDocsView() {
  const { setStep, language } = useCVStore()
  const isRTL = language === 'ar'
  const [copied, setCopied] = useState('')

  const endpoints = [
    { method: 'POST', path: '/api/v1/cv/generate', desc: t(language, 'apiDocEpCvGenerate'), credits: 1 },
    { method: 'POST', path: '/api/v1/cl/generate', desc: t(language, 'apiDocEpClGenerate'), credits: 1 },
    { method: 'POST', path: '/api/v1/ats/analyze', desc: t(language, 'apiDocEpAtsAnalyze'), credits: 1 },
    { method: 'GET', path: '/api/v1/usage', desc: t(language, 'apiDocEpUsage'), credits: 0 },
  ]

  const errorCodes = [
    { code: 401, message: t(language, 'apiDocErr401') },
    { code: 402, message: t(language, 'apiDocErr402') },
    { code: 403, message: t(language, 'apiDocErr403') },
    { code: 429, message: t(language, 'apiDocErr429') },
    { code: 500, message: t(language, 'apiDocErr500') },
  ]

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(''), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-emerald-50/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => setStep('landing')} className="cursor-pointer">
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180 ml-1' : 'mr-1'}`} /> {t(language, 'orchBack')}
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Code2 className="text-emerald-600" /> {t(language, 'apiDocTitle')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t(language, 'apiDocSubtitle')}</p>
          </div>
        </div>

        {/* Auth */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-3"><Shield className="w-5 h-5 text-emerald-600" /> {t(language, 'apiDocAuthTitle')}</h2>
            <p className="text-sm text-muted-foreground mb-3">{t(language, 'apiDocAuthDesc')} <code className="bg-muted px-2 py-0.5 rounded text-xs">X-API-Key</code></p>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono">
              X-API-Key: hnv_live_abc123...
            </div>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <h2 className="text-lg font-semibold mb-4">{t(language, 'apiDocEndpointsTitle')}</h2>
        <div className="space-y-3 mb-8">
          {endpoints.map((ep, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-3">
                  <Badge className={ep.method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}>{ep.method}</Badge>
                  <code className="text-sm font-mono flex-1">{ep.path}</code>
                  <span className="text-xs text-muted-foreground hidden sm:block">{ep.desc}</span>
                  {ep.credits > 0 && <Badge variant="outline" className="text-xs">{ep.credits} {t(language, 'apiDocCredit')}</Badge>}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Code Examples */}
        <h2 className="text-lg font-semibold mb-4">{t(language, 'apiDocCodeTitle')}</h2>
        <div className="space-y-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium flex items-center gap-1"><Terminal className="w-4 h-4" /> cURL</span>
                <Button size="sm" variant="ghost" onClick={() => copy(curlExample, 'curl')} className="cursor-pointer">
                  {copied === 'curl' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono overflow-x-auto">{curlExample}</pre>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">JavaScript (fetch)</span>
                <Button size="sm" variant="ghost" onClick={() => copy(jsExample, 'js')} className="cursor-pointer">
                  {copied === 'js' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono overflow-x-auto">{jsExample}</pre>
            </CardContent>
          </Card>
        </div>

        {/* Error Codes */}
        <h2 className="text-lg font-semibold mb-4">{t(language, 'apiDocErrorsTitle')}</h2>
        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="space-y-2">
              {errorCodes.map((e, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <Badge variant={e.code >= 400 && e.code < 500 ? 'destructive' : 'secondary'}>{e.code}</Badge>
                  <span className="text-muted-foreground">{e.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer" onClick={() => setStep('apiRegister')}>
            {t(language, 'apiDocGetKey')}
          </Button>
        </div>
      </div>
    </div>
  )
}
