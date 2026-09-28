'use client'

import { useState } from 'react'
import { Linkedin, Copy, Globe, Loader2, CheckCircle2, AlertCircle, Trash2, ArrowRight, ArrowLeft, Sparkles, X, FileText } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { t } from '@/lib/i18n'
import { useCVStore, type CVLanguage } from '@/store/cv-store'

interface LinkedInImportModalProps {
  isOpen: boolean
  onClose: () => void
  language?: CVLanguage
}

interface ParsedProfile {
  fullName?: string
  headline?: string
  summary?: string
  location?: string
  email?: string | null
  phone?: string | null
  website?: string | null
  experience?: Array<{ title: string; company: string; period: string; description: string }>
  education?: Array<{ degree: string; school: string; period: string; description: string | null }>
  skills?: string[]
  languages?: Array<{ name: string; level: string }>
  certifications?: string[]
  industry?: string | null
}

interface SavedProfile {
  id: string
  linkedinUrl: string | null
  profileData: ParsedProfile
  importMethod: string
  status: string
  createdAt: string
}

export default function LinkedInImportModal({ isOpen, onClose, language = 'fr' }: LinkedInImportModalProps) {
  const lang = language
  const [tab, setTab] = useState<'import' | 'history'>('import')
  const [inputMode, setInputMode] = useState<'url' | 'paste'>('url')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [profileText, setProfileText] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [parsedProfile, setParsedProfile] = useState<ParsedProfile | null>(null)
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const { updateFormData } = useCVStore()

  // Fetch saved profiles when switching to history tab
  const handleTabChange = async (newTab: string) => {
    setTab(newTab as 'import' | 'history')
    if (newTab === 'history') {
      setIsLoadingHistory(true)
      try {
        const res = await fetch('/api/linkedin/profiles')
        const data = await res.json()
        if (data.success) setSavedProfiles(data.profiles)
      } catch {
        toast.error('Failed to load import history')
      }
      setIsLoadingHistory(false)
    }
  }

  // Import LinkedIn profile
  const handleImport = async () => {
    if (inputMode === 'url' && !linkedinUrl.trim()) {
      toast.error(t(lang, 'linkedinUrlRequired'))
      return
    }
    if (inputMode === 'paste' && profileText.trim().length < 50) {
      toast.error(t(lang, 'linkedinTextRequired'))
      return
    }

    setIsImporting(true)
    setParsedProfile(null)

    try {
      const res = await fetch('/api/linkedin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkedinUrl: inputMode === 'url' ? linkedinUrl.trim() : undefined,
          profileText: inputMode === 'paste' ? profileText.trim() : undefined,
          method: inputMode,
        }),
      })

      const data = await res.json()

      if (data.success && data.profile?.data) {
        setParsedProfile(data.profile.data)
        toast.success(t(lang, 'linkedinImportSuccess'))
      } else {
        toast.error(data.message || data.error || t(lang, 'linkedinImportError'))
      }
    } catch {
      toast.error(t(lang, 'linkedinImportError'))
    }
    setIsImporting(false)
  }

  // Apply parsed profile to CV form
  const handleApplyToForm = () => {
    if (!parsedProfile) return

    const updates: Record<string, string> = {}

    if (parsedProfile.fullName) updates.fullName = parsedProfile.fullName
    if (parsedProfile.email) updates.email = parsedProfile.email
    if (parsedProfile.phone) updates.phone = parsedProfile.phone
    if (parsedProfile.location) updates.location = parsedProfile.location
    if (parsedProfile.headline) updates.targetJob = parsedProfile.headline
    if (parsedProfile.industry) updates.industry = parsedProfile.industry
    if (linkedinUrl.trim()) updates.linkedin = linkedinUrl.trim()
    if (parsedProfile.website) updates.website = parsedProfile.website
    if (parsedProfile.summary) updates.summary = parsedProfile.summary

    // Format experience
    if (parsedProfile.experience?.length) {
      updates.experience = parsedProfile.experience
        .map((e) => `${e.title} — ${e.company}\n${e.period}\n${e.description}`)
        .join('\n\n')
    }

    // Format education
    if (parsedProfile.education?.length) {
      updates.education = parsedProfile.education
        .map((e) => `${e.degree} — ${e.school}\n${e.period}${e.description ? '\n' + e.description : ''}`)
        .join('\n\n')
    }

    // Format skills
    if (parsedProfile.skills?.length) {
      updates.skills = parsedProfile.skills.join(', ')
    }

    // Format languages
    if (parsedProfile.languages?.length) {
      updates.languages = parsedProfile.languages
        .map((l) => `${l.name} (${l.level})`)
        .join(', ')
    }

    updateFormData(updates)
    toast.success(t(lang, 'linkedinAppliedToForm'))
    onClose()
  }

  // Apply saved profile to CV form
  const handleApplySaved = (profile: SavedProfile) => {
    if (!profile.profileData) return
    setParsedProfile(profile.profileData)
    setTab('import')
    if (profile.linkedinUrl) setLinkedinUrl(profile.linkedinUrl)
  }

  // Delete saved profile
  const handleDeleteSaved = async (id: string) => {
    try {
      await fetch(`/api/linkedin/profiles?id=${id}`, { method: 'DELETE' })
      setSavedProfiles((prev) => prev.filter((p) => p.id !== id))
      toast.success('Profile deleted')
    } catch {
      toast.error('Failed to delete profile')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 gap-0" showCloseButton={false}>
        {/* PROMINENT back arrow bar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <button
            onClick={onClose}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-md hover:shadow-lg transition-all cursor-pointer group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            <span>{lang === 'fr' ? '← Retour à la page' : lang === 'ar' ? 'رجوع للصفحة' : lang === 'es' ? '← Volver a la página' : '← Back to page'}</span>
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <DialogHeader className="px-6 pt-1 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-lg bg-[#0A66C2] flex items-center justify-center">
              <Linkedin className="w-5 h-5 text-white" />
            </div>
            {t(lang, 'linkedinImportTitle')}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t(lang, 'linkedinImportDesc')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={handleTabChange} className="px-6">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="import" className="gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Import
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              {t(lang, 'linkedinHistory')}
              {savedProfiles.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {savedProfiles.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* IMPORT TAB */}
          <TabsContent value="import" className="mt-4">
            {!parsedProfile ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={inputMode === 'url' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setInputMode('url')}
                    className="gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    URL LinkedIn
                  </Button>
                  <Button
                    variant={inputMode === 'paste' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setInputMode('paste')}
                    className="gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {t(lang, 'linkedinPaste')}
                  </Button>
                </div>

                {inputMode === 'url' ? (
                  <div className="space-y-2">
                    <Label htmlFor="linkedin-url" className="text-sm font-medium">
                      {t(lang, 'linkedinUrlLabel')}
                    </Label>
                    <Input
                      id="linkedin-url"
                      type="url"
                      placeholder="https://www.linkedin.com/in/your-profile"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      💡 {t(lang, 'linkedinUrlHint')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="linkedin-text" className="text-sm font-medium">
                      {t(lang, 'linkedinTextLabel')}
                    </Label>
                    <Textarea
                      id="linkedin-text"
                      placeholder={t(lang, 'linkedinTextPlaceholder')}
                      value={profileText}
                      onChange={(e) => setProfileText(e.target.value)}
                      className="min-h-[200px] resize-y"
                    />
                    <p className="text-xs text-muted-foreground">
                      💡 {t(lang, 'linkedinTextHint')}
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleImport}
                  disabled={isImporting || (inputMode === 'url' ? !linkedinUrl.trim() : profileText.trim().length < 50)}
                  className="w-full h-11 gap-2 bg-[#0A66C2] hover:bg-[#0A66C2]/90 text-white font-medium"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t(lang, 'linkedinImporting')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {t(lang, 'linkedinImportBtn')}
                    </>
                  )}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-600">
                    {t(lang, 'linkedinParsedSuccess')}
                  </span>
                </div>

                <ScrollArea className="h-[300px] pr-2">
                  <div className="space-y-3">
                    {/* Header info */}
                    <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                      <h3 className="font-semibold text-base">{parsedProfile.fullName || 'Unknown'}</h3>
                      <p className="text-sm text-muted-foreground">{parsedProfile.headline}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {parsedProfile.location && (
                          <Badge variant="secondary" className="text-xs">{parsedProfile.location}</Badge>
                        )}
                        {parsedProfile.industry && (
                          <Badge variant="outline" className="text-xs">{parsedProfile.industry}</Badge>
                        )}
                      </div>
                    </div>

                    {/* Summary */}
                    {parsedProfile.summary && (
                      <div className="p-3 rounded-lg border space-y-1">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground">{t(lang, 'summary')}</h4>
                        <p className="text-sm leading-relaxed">{parsedProfile.summary}</p>
                      </div>
                    )}

                    {/* Experience */}
                    {parsedProfile.experience?.length > 0 && (
                      <div className="p-3 rounded-lg border space-y-2">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground">{t(lang, 'experience')}</h4>
                        {parsedProfile.experience.slice(0, 3).map((exp, i) => (
                          <div key={i} className="text-sm">
                            <p className="font-medium">{exp.title}</p>
                            <p className="text-muted-foreground text-xs">{exp.company} · {exp.period}</p>
                          </div>
                        ))}
                        {parsedProfile.experience.length > 3 && (
                          <p className="text-xs text-muted-foreground">+{parsedProfile.experience.length - 3} more</p>
                        )}
                      </div>
                    )}

                    {/* Education */}
                    {parsedProfile.education?.length > 0 && (
                      <div className="p-3 rounded-lg border space-y-2">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground">{t(lang, 'education')}</h4>
                        {parsedProfile.education.slice(0, 2).map((edu, i) => (
                          <div key={i} className="text-sm">
                            <p className="font-medium">{edu.degree}</p>
                            <p className="text-muted-foreground text-xs">{edu.school} · {edu.period}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Skills */}
                    {parsedProfile.skills?.length > 0 && (
                      <div className="p-3 rounded-lg border space-y-2">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground">{t(lang, 'skills')}</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {parsedProfile.skills.slice(0, 12).map((skill, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                          ))}
                          {parsedProfile.skills.length > 12 && (
                            <Badge variant="outline" className="text-xs">+{parsedProfile.skills.length - 12}</Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Languages */}
                    {parsedProfile.languages?.length > 0 && (
                      <div className="p-3 rounded-lg border space-y-2">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground">{t(lang, 'languages')}</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {parsedProfile.languages.map((l, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{l.name} ({l.level})</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setParsedProfile(null)}
                    className="flex-1 gap-2"
                  >
                    <X className="w-4 h-4" />
                    {t(lang, 'linkedinReimport')}
                  </Button>
                  <Button
                    onClick={handleApplyToForm}
                    className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <ArrowRight className="w-4 h-4" />
                    {t(lang, 'linkedinApplyToForm')}
                  </Button>
                </div>
              </motion.div>
            )}
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="mt-4">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : savedProfiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">{t(lang, 'linkedinNoHistory')}</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-2">
                <div className="space-y-2">
                  {savedProfiles.map((profile) => (
                    <Card key={profile.id} className="overflow-hidden">
                      <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#0A66C2]/10 flex items-center justify-center">
                              <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
                            </div>
                            {profile.profileData.fullName || 'Unknown'}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {profile.importMethod === 'url' ? 'URL' : t(lang, 'linkedinPaste')}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-1">
                        <p className="text-xs text-muted-foreground mb-2">
                          {profile.profileData.headline || 'No headline'}
                          {profile.profileData.location && ` · ${profile.profileData.location}`}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {new Date(profile.createdAt).toLocaleDateString(lang, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => handleApplySaved(profile)}
                            >
                              <ArrowRight className="w-3 h-3" />
                              Use
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-red-500 hover:text-red-600"
                              onClick={() => handleDeleteSaved(profile.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        <div className="px-6 pb-5 pt-3">
          <Separator className="mb-3" />
          <p className="text-xs text-center text-muted-foreground">
            🔒 {t(lang, 'linkedinPrivacyNote')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
