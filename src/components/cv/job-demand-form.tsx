'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'
import type { TranslationKey, CVLanguage, PersonaType } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Send,
  GraduationCap,
  Star,
  X,
  Eye,
  Briefcase,
  BookOpen,
} from 'lucide-react'

function safeT(lang: CVLanguage, key: string): string {
  try { return t(lang, key as TranslationKey) } catch { return key }
}

const PERSONAS: { id: PersonaType; emoji: string }[] = [
  { id: 'student', emoji: '🎓' },
  { id: 'graduate', emoji: '🌟' },
]

export default function JobDemandForm() {
  const { language, selectedPersona, setSelectedPersona, formData, setStep } = useCVStore()
  const dir = language === 'ar' ? 'rtl' : 'ltr'

  const [activeTab, setActiveTab] = useState<'emploi' | 'stage'>('emploi')
  const [nom, setNom] = useState(formData.fullName || '')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState(formData.email || '')
  const [telephone, setTelephone] = useState(formData.phone || '')
  const [ville, setVille] = useState(formData.location || '')
  const [diplome, setDiplome] = useState('')
  const [etablissement, setEtablissement] = useState('')
  const [anneeObtention, setAnneeObtention] = useState('')
  const [posteRecherche, setPosteRecherche] = useState(formData.targetJob || '')
  const [typeEmploi, setTypeEmploi] = useState('')
  const [salaireSouhaite, setSalaireSouhaite] = useState('')
  const [dureeStage, setDureeStage] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [domaine, setDomaine] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [lettre, setLettre] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const addSkill = useCallback(() => {
    const trimmed = skillInput.trim()
    if (trimmed && !skills.includes(trimmed)) {
      setSkills(prev => [...prev, trimmed])
      setSkillInput('')
    }
  }, [skillInput, skills])

  const removeSkill = useCallback((skill: string) => {
    setSkills(prev => prev.filter(s => s !== skill))
  }, [])

  const handleGenerateLettre = async () => {
    if (!selectedPersona) {
      toast.error(safeT(language, 'jobDemand.selectPersona'))
      return
    }
    setIsGenerating(true)
    try {
      const response = await fetch('/api/job-application/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: selectedPersona,
          formData: {
            fullName: `${prenom} ${nom}`.trim(),
            email,
            phone: telephone,
            address: '',
            location: ville,
            targetJob: activeTab === 'emploi' ? posteRecherche : domaine,
            industry: domaine,
            skills: skills.join(', '),
            languages: '',
          },
          appFormData: {
            company: etablissement,
            position: activeTab === 'emploi' ? posteRecherche : `${safeT(language, 'jobDemand.stageTab')} - ${domaine}`,
            hiringManager: '',
            appType: activeTab,
            availability: activeTab === 'stage' ? `${safeT(language, 'jobDemand.startDate')}: ${dateDebut}, ${safeT(language, 'jobDemand.duration')}: ${dureeStage}` : '',
            salary: salaireSouhaite,
            additionalInfo: '',
            personaFields: {
              diplome,
              etablissement,
              anneeObtention,
              ...(activeTab === 'stage' ? { dureeStage, dateDebut, domaine } : { typeEmploi, salaireSouhaite }),
            },
          },
          language,
          generatedCVContent: '',
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || safeT(language, 'jobDemand.generateError'))
        return
      }
      const generated = [data.application?.header, data.application?.body, data.application?.closing, data.application?.signOff]
        .filter(Boolean).join('\n\n')
      setLettre(generated)
      toast.success(safeT(language, 'jobDemand.generateSuccess'))
    } catch {
      toast.error(safeT(language, 'jobDemand.generateError'))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmit = () => {
    if (!selectedPersona) { toast.error(safeT(language, 'jobDemand.selectPersona')); return }
    if (!nom.trim() || !email.trim()) { toast.error(safeT(language, 'jobDemand.fillRequired')); return }
    setShowPreview(true)
  }

  const animUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }

  // ── Preview Mode ──
  if (showPreview) {
    return (
      <div className="min-h-screen flex flex-col bg-white" dir={dir}>
        <header className="w-full px-4 sm:px-6 py-4 bg-white/90 backdrop-blur-sm border-b sticky top-0 z-50">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)} className="gap-1.5 cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
              {safeT(language, 'jobDemand.back')}
            </Button>
          </div>
        </header>
        <main className="flex-1 py-6 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{safeT(language, 'jobDemand.previewTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-1">
                  <p className="font-semibold">{`${prenom} ${nom}`.trim()}</p>
                  <p className="text-muted-foreground">{email} {telephone && `· ${telephone}`}</p>
                  <p className="text-muted-foreground">{ville}</p>
                </div>
                <div className="border-t pt-3 space-y-1">
                  <p className="font-medium">{safeT(language, 'jobDemand.education')}</p>
                  <p>{diplome} — {etablissement} ({anneeObtention})</p>
                </div>
                <div className="border-t pt-3 space-y-1">
                  <p className="font-medium">{activeTab === 'emploi' ? safeT(language, 'jobDemand.emploiTab') : safeT(language, 'jobDemand.stageTab')}</p>
                  {activeTab === 'emploi' ? (
                    <p>{posteRecherche} · {typeEmploi} {salaireSouhaite && `· ${salaireSouhaite}`}</p>
                  ) : (
                    <p>{domaine} · {dureeStage} · {dateDebut}</p>
                  )}
                </div>
                {skills.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="font-medium mb-2">{safeT(language, 'jobDemand.skills')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map(s => <Badge key={s} variant="secondary">{s}</Badge>)}
                    </div>
                  </div>
                )}
                {lettre && (
                  <div className="border-t pt-3">
                    <p className="font-medium mb-2">{safeT(language, 'jobDemand.coverLetter')}</p>
                    <div className="whitespace-pre-wrap bg-muted/50 rounded-lg p-4 text-sm leading-relaxed">{lettre}</div>
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" onClick={() => setShowPreview(false)} className="flex-1 cursor-pointer">
                {safeT(language, 'jobDemand.back')}
              </Button>
              <Button onClick={() => setStep('landing')} className="flex-1 bg-emerald-600 hover:bg-emerald-700 cursor-pointer">
                {safeT(language, 'jobDemand.submit')}
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── Form Mode ──
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40" dir={dir}>
      <header className="w-full px-4 sm:px-6 py-4 bg-white/90 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setStep('landing')} className="gap-1.5 cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{safeT(language, 'jobDemand.back')}</span>
            </Button>
            <span className="font-semibold text-foreground text-sm">{safeT(language, 'jobDemand.title')}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 py-6 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Title */}
          <motion.div {...animUp} transition={{ duration: 0.4 }} className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{safeT(language, 'jobDemand.title')}</h1>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">{safeT(language, 'jobDemand.subtitle')}</p>
          </motion.div>

          {/* Persona Selector */}
          <motion.div {...animUp} transition={{ duration: 0.4, delay: 0.05 }}>
            <Label className="text-sm font-semibold text-foreground mb-2 block">{safeT(language, 'jobDemand.personaLabel')}</Label>
            <div className="flex gap-3">
              {PERSONAS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPersona(p.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer border-2 ${
                    selectedPersona === p.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20'
                      : 'bg-white text-foreground border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50'
                  }`}
                >
                  {p.id === 'student' ? <GraduationCap className="w-5 h-5" /> : <Star className="w-5 h-5" />}
                  {safeT(language, `jobDemand.persona${p.id === 'student' ? 'Student' : 'Graduate'}`)}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Tabs: Emploi / Stage */}
          <motion.div {...animUp} transition={{ duration: 0.4, delay: 0.1 }}>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'emploi' | 'stage')}>
              <TabsList className="w-full">
                <TabsTrigger value="emploi" className="flex-1 gap-1.5">
                  <Briefcase className="w-4 h-4" />
                  {safeT(language, 'jobDemand.emploiTab')}
                </TabsTrigger>
                <TabsTrigger value="stage" className="flex-1 gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  {safeT(language, 'jobDemand.stageTab')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="emploi" className="space-y-4 mt-4">
                {/* Personal Info */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">{safeT(language, 'jobDemand.personalInfo')}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">{safeT(language, 'jobDemand.nom')} *</Label><Input value={nom} onChange={e => setNom(e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">{safeT(language, 'jobDemand.prenom')}</Label><Input value={prenom} onChange={e => setPrenom(e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">{safeT(language, 'jobDemand.email')} *</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">{safeT(language, 'jobDemand.telephone')}</Label><Input value={telephone} onChange={e => setTelephone(e.target.value)} /></div>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">{safeT(language, 'jobDemand.ville')}</Label><Input value={ville} onChange={e => setVille(e.target.value)} /></div>
                  </CardContent>
                </Card>

                {/* Education */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">{safeT(language, 'jobDemand.education')}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1"><Label className="text-xs">{safeT(language, 'jobDemand.diplome')}</Label><Input value={diplome} onChange={e => setDiplome(e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">{safeT(language, 'jobDemand.etablissement')}</Label><Input value={etablissement} onChange={e => setEtablissement(e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">{safeT(language, 'jobDemand.anneeObtention')}</Label><Input type="number" min="2000" max="2030" value={anneeObtention} onChange={e => setAnneeObtention(e.target.value)} /></div>
                  </CardContent>
                </Card>

                {/* Emploi-specific */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">{safeT(language, 'jobDemand.emploiDetails')}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1"><Label className="text-xs">{safeT(language, 'jobDemand.posteRecherche')} *</Label><Input value={posteRecherche} onChange={e => setPosteRecherche(e.target.value)} /></div>
                    <div className="space-y-1">
                      <Label className="text-xs">{safeT(language, 'jobDemand.typeEmploi')}</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {['CDI', 'CDD', 'Freelance'].map(type => (
                          <button key={type} onClick={() => setTypeEmploi(type)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                              typeEmploi === type ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-muted-foreground border-muted-foreground/30 hover:border-emerald-400'
                            }`}>{type}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">{safeT(language, 'jobDemand.salaireSouhaite')}</Label><Input value={salaireSouhaite} onChange={e => setSalaireSouhaite(e.target.value)} /></div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stage" className="space-y-4 mt-4">
                {/* Personal Info (same) */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">{safeT(language, 'jobDemand.personalInfo')}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">{safeT(language, 'jobDemand.nom')} *</Label><Input value={nom} onChange={e => setNom(e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">{safeT(language, 'jobDemand.prenom')}</Label><Input value={prenom} onChange={e => setPrenom(e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">{safeT(language, 'jobDemand.email')} *</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">{safeT(language, 'jobDemand.telephone')}</Label><Input value={telephone} onChange={e => setTelephone(e.target.value)} /></div>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">{safeT(language, 'jobDemand.ville')}</Label><Input value={ville} onChange={e => setVille(e.target.value)} /></div>
                  </CardContent>
                </Card>

                {/* Education */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">{safeT(language, 'jobDemand.education')}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1"><Label className="text-xs">{safeT(language, 'jobDemand.diplome')}</Label><Input value={diplome} onChange={e => setDiplome(e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">{safeT(language, 'jobDemand.etablissement')}</Label><Input value={etablissement} onChange={e => setEtablissement(e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">{safeT(language, 'jobDemand.anneeObtention')}</Label><Input type="number" min="2000" max="2030" value={anneeObtention} onChange={e => setAnneeObtention(e.target.value)} /></div>
                  </CardContent>
                </Card>

                {/* Stage-specific */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">{safeT(language, 'jobDemand.stageDetails')}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1"><Label className="text-xs">{safeT(language, 'jobDemand.domaine')} *</Label><Input value={domaine} onChange={e => setDomaine(e.target.value)} /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">{safeT(language, 'jobDemand.duration')}</Label><Input value={dureeStage} onChange={e => setDureeStage(e.target.value)} placeholder="6 mois" /></div>
                      <div className="space-y-1"><Label className="text-xs">{safeT(language, 'jobDemand.startDate')}</Label><Input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} /></div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Skills */}
          <motion.div {...animUp} transition={{ duration: 0.4, delay: 0.15 }}>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">{safeT(language, 'jobDemand.skills')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder={safeT(language, 'jobDemand.skillsPh')} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())} />
                  <Button type="button" variant="outline" size="sm" onClick={addSkill} className="shrink-0 cursor-pointer">{safeT(language, 'jobDemand.add')}</Button>
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map(s => (
                      <Badge key={s} variant="secondary" className="gap-1 pr-1">
                        {s}
                        <button onClick={() => removeSkill(s)} className="ml-0.5 hover:text-destructive cursor-pointer"><X className="w-3 h-3" /></button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Cover Letter */}
          <motion.div {...animUp} transition={{ duration: 0.4, delay: 0.2 }}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{safeT(language, 'jobDemand.coverLetter')}</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleGenerateLettre} disabled={isGenerating} className="gap-1.5 cursor-pointer">
                    {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {safeT(language, 'jobDemand.aiGenerate')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea value={lettre} onChange={e => setLettre(e.target.value)} placeholder={safeT(language, 'jobDemand.coverLetterPh')} className="min-h-[120px] resize-y" />
              </CardContent>
            </Card>
          </motion.div>

          {/* Submit */}
          <motion.div {...animUp} transition={{ duration: 0.4, delay: 0.25 }}>
            <Button onClick={handleSubmit} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 py-6 text-base rounded-xl shadow-lg shadow-emerald-600/25 cursor-pointer font-semibold">
              <Eye className="w-5 h-5" />
              {safeT(language, 'jobDemand.preview')}
            </Button>
          </motion.div>
        </div>
      </main>

      <footer className="border-t py-4 px-4 sm:px-6 bg-gradient-to-r from-emerald-50/50 via-white to-amber-50/30 mt-auto">
        <div className="max-w-2xl mx-auto text-center text-xs text-muted-foreground">
          <p>© 2026 BazNova — <span className="font-medium text-foreground">E-Society 2050</span></p>
        </div>
      </footer>
    </div>
  )
}
