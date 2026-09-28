'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, User, Mail, Phone, MapPin, Briefcase, GraduationCap,
  Globe, CheckCircle2, AlertTriangle, Lightbulb, ChevronRight,
  FileImage, FileText, Languages, Ruler, Sparkles, Shield, X as XIcon, Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCVStore, type ExtractedProfile, type MobilityResult } from '@/store/cv-store'
import { t } from '@/lib/i18n'

const countryFlags: Record<string, string> = {
  France: '🇫🇷', Canada: '🇨🇦', 'Royaume-Uni': '🇬🇧', 'États-Unis': '🇺🇸',
  Allemagne: '🇩🇪', 'Émirats Arabes Unis': '🇦🇪', Suisse: '🇨🇭',
  Australie: '🇦🇺', Belgique: '🇧🇪', Espagne: '🇪🇸', Italie: '🇮🇹', Japon: '🇯🇵',
}

const countryIdToNameKey: Record<string, string> = {
  France: 'mobShared.france', Canada: 'mobShared.canada', 'Royaume-Uni': 'mobShared.uk', 'États-Unis': 'mobShared.usa',
  Allemagne: 'mobShared.germany', 'Émirats Arabes Unis': 'mobShared.uae', Suisse: 'mobShared.switzerland',
  Australie: 'mobShared.australia', Belgique: 'mobShared.belgium', Espagne: 'mobShared.spain', Italie: 'mobShared.italy', Japon: 'mobShared.japan',
}

function buildCountryNormsData(language: Parameters<typeof t>[0]): Record<string, MobilityResult['countryNorms']> {
  return {
    France: { cvFormat: t(language, 'mobShared.franceCvFormat'), requiredSections: [t(language, 'mobShared.secEtatCivil'), t(language, 'mobShared.secFormation'), t(language, 'mobShared.secExperience'), t(language, 'mobShared.secCompetences'), t(language, 'mobShared.secLangues')], forbiddenSections: [t(language, 'mobShared.forbidAge'), t(language, 'mobShared.forbidFamilyStatus')], photoRequired: true, maxPages: 2, language: t(language, 'mobShared.franceLang'), tips: [t(language, 'mobShared.tipIncludePhotoId'), t(language, 'mobShared.tipReverseChronological')] },
    Canada: { cvFormat: t(language, 'mobShared.canadaCvFormat'), requiredSections: [t(language, 'mobShared.secResumePro'), t(language, 'mobShared.secExperience'), t(language, 'mobShared.secEducation'), t(language, 'mobShared.secSkills')], forbiddenSections: [t(language, 'mobShared.forbidPhoto'), t(language, 'mobShared.forbidAge'), t(language, 'mobShared.forbidNationality'), t(language, 'mobShared.forbidFamilyStatus')], photoRequired: false, maxPages: 2, language: t(language, 'mobShared.canadaLang'), tips: [t(language, 'mobShared.tipActionOrientedBullets'), t(language, 'mobShared.tipNoSensitiveData')] },
    'Royaume-Uni': { cvFormat: t(language, 'mobShared.ukCvFormat'), requiredSections: [t(language, 'mobShared.secPersonalProfile'), t(language, 'mobShared.secEmployment'), t(language, 'mobShared.secEducation'), t(language, 'mobShared.secSkills')], forbiddenSections: [t(language, 'mobShared.forbidPhoto'), t(language, 'mobShared.forbidAge'), t(language, 'mobShared.forbidNationality'), t(language, 'mobShared.forbidIrrelevantHobbies')], photoRequired: false, maxPages: 2, language: t(language, 'mobShared.ukLang'), tips: [t(language, 'mobShared.tipPersonalProfileFirst'), t(language, 'mobShared.tipNoPhotoOrPersonalData')] },
    'États-Unis': { cvFormat: t(language, 'mobShared.usaCvFormat'), requiredSections: [t(language, 'mobShared.secSummary'), t(language, 'mobShared.secExperience'), t(language, 'mobShared.secEducation'), t(language, 'mobShared.secSkills')], forbiddenSections: [t(language, 'mobShared.forbidPhoto'), t(language, 'mobShared.forbidAge'), t(language, 'mobShared.forbidNationality'), t(language, 'mobShared.forbidFullAddress'), t(language, 'mobShared.forbidMaritalStatus')], photoRequired: false, maxPages: 1, language: t(language, 'mobShared.usaLang'), tips: [t(language, 'mobShared.tipOnePageMax10yr'), t(language, 'mobShared.tipActionVerbs')] },
    Allemagne: { cvFormat: t(language, 'mobShared.germanyCvFormat'), requiredSections: [t(language, 'mobShared.secPersonalDataDe'), t(language, 'mobShared.secBildungsweg'), t(language, 'mobShared.secBeruflicherWerdegang'), t(language, 'mobShared.secKenntnisse'), t(language, 'mobShared.secHobbys')], forbiddenSections: [t(language, 'mobShared.forbidUnauthorizedRefs')], photoRequired: true, maxPages: 2, language: t(language, 'mobShared.germanyLang'), tips: [t(language, 'mobShared.tipPhotoRequired'), t(language, 'mobShared.tipExtendedPersonalDetails')] },
    'Émirats Arabes Unis': { cvFormat: t(language, 'mobShared.uaeCvFormat'), requiredSections: [t(language, 'mobShared.secPersonalInfo'), t(language, 'mobShared.secPhotoSection'), t(language, 'mobShared.secSummary'), t(language, 'mobShared.secExperience'), t(language, 'mobShared.secEducation'), t(language, 'mobShared.secSkills')], forbiddenSections: [], photoRequired: true, maxPages: 2, language: t(language, 'mobShared.uaeLang'), tips: [t(language, 'mobShared.tipIdPhotoRequired'), t(language, 'mobShared.tipCompletePersonalInfo')] },
    Suisse: { cvFormat: t(language, 'mobShared.switzerlandCvFormat'), requiredSections: [t(language, 'mobShared.secInformationsPersonnelles'), t(language, 'mobShared.secFormation'), t(language, 'mobShared.secExperience'), t(language, 'mobShared.secCompetences'), t(language, 'mobShared.secReferences')], forbiddenSections: [], photoRequired: true, maxPages: 2, language: t(language, 'mobShared.switzerlandLang'), tips: [t(language, 'mobShared.tipReferencesRequired'), t(language, 'mobShared.tipPhotoRequired')] },
    Australie: { cvFormat: t(language, 'mobShared.australiaCvFormat'), requiredSections: [t(language, 'mobShared.secProfile'), t(language, 'mobShared.secKeySkills'), t(language, 'mobShared.secEmploymentHistory'), t(language, 'mobShared.secEducation'), t(language, 'mobShared.secReferees')], forbiddenSections: [t(language, 'mobShared.forbidPhoto'), t(language, 'mobShared.forbidAge'), t(language, 'mobShared.forbidNationality'), t(language, 'mobShared.forbidFullAddress')], photoRequired: false, maxPages: 3, language: t(language, 'mobShared.australiaLang'), tips: [t(language, 'mobShared.tipSelectionCriteria'), t(language, 'mobShared.tipTwoThreePages')] },
    Belgique: { cvFormat: t(language, 'mobShared.belgiumCvFormat'), requiredSections: [t(language, 'mobShared.secInformationsPersonnelles'), t(language, 'mobShared.secFormation'), t(language, 'mobShared.secExperience'), t(language, 'mobShared.secCompetences'), t(language, 'mobShared.secLangues')], forbiddenSections: [t(language, 'mobShared.forbidPhotoOptional')], photoRequired: false, maxPages: 2, language: t(language, 'mobShared.belgiumLang'), tips: [t(language, 'mobShared.tipEuropassFormat'), t(language, 'mobShared.tipPhotoOptional')] },
    Espagne: { cvFormat: t(language, 'mobShared.spainCvFormat'), requiredSections: [t(language, 'mobShared.secDatosPersonales'), t(language, 'mobShared.secFormacion'), t(language, 'mobShared.secExperiencia'), t(language, 'mobShared.secCompetencias')], forbiddenSections: [t(language, 'mobShared.forbidSensitiveData')], photoRequired: true, maxPages: 2, language: t(language, 'mobShared.spainLang'), tips: [t(language, 'mobShared.tipEuropassFormat'), t(language, 'mobShared.tipPhotoUsuallyIncluded')] },
    Italie: { cvFormat: t(language, 'mobShared.italyCvFormat'), requiredSections: [t(language, 'mobShared.secDatiPersonali'), t(language, 'mobShared.secIstruzione'), t(language, 'mobShared.secEsperienza'), t(language, 'mobShared.secCompetenze')], forbiddenSections: [t(language, 'mobShared.forbidIrrelevantSensitiveData')], photoRequired: true, maxPages: 2, language: t(language, 'mobShared.italyLang'), tips: [t(language, 'mobShared.tipEuropassCurriculum'), t(language, 'mobShared.tipPhotoIncluded')] },
    Japon: { cvFormat: t(language, 'mobShared.japanCvFormat'), requiredSections: [t(language, 'mobShared.secPersonalDataEn'), t(language, 'mobShared.secEducation'), t(language, 'mobShared.secWorkExperience'), t(language, 'mobShared.secSkills')], forbiddenSections: [], photoRequired: true, maxPages: 2, language: t(language, 'mobShared.japanLang'), tips: [t(language, 'mobShared.tipRirekishoFormat'), t(language, 'mobShared.tipPhotoIncluded'), t(language, 'mobShared.tipHighlyCodifiedStructure')] },
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-500'
  return 'text-red-500'
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

export default function MobilityProfile() {
  const { stepData, extractedProfile, setStep, setMobilityResult, language } = useCVStore()
  const targetCountry = (stepData.targetCountry as string) || 'France'
  const [compatibilityScore] = useState(68)

  const skillsGap = useMemo(() => [
    t(language, 'mobProfile.skillsGapLinkedin'),
    t(language, 'mobProfile.skillsGapCloud'),
  ], [language])

  const recommendations = useMemo(() => [
    t(language, 'mobProfile.recom1'),
    t(language, 'mobProfile.recom2'),
    t(language, 'mobProfile.recom3'),
    t(language, 'mobProfile.recom4'),
    t(language, 'mobProfile.recom5'),
  ], [language])

  const countryNormsData = useMemo(() => buildCountryNormsData(language), [language])

  useEffect(() => {
    if (extractedProfile) {
      const norms = countryNormsData[targetCountry] ?? countryNormsData['France']
      setMobilityResult({
        targetCountry,
        countryNorms: norms,
        formattedCV: {
          summary: extractedProfile.summary,
          experience: extractedProfile.experience,
          education: extractedProfile.education,
          skills: extractedProfile.skills,
          languages: extractedProfile.languages,
        },
        formattedCL: { subject: '', greeting: '', paragraphs: [], signOff: '' },
        compatibilityScore,
        skillsGap,
        recommendations,
      })
    }
  }, [extractedProfile, targetCountry, compatibilityScore, skillsGap, recommendations, setMobilityResult, countryNormsData])

  const profile = extractedProfile
  const norms = countryNormsData[targetCountry] ?? countryNormsData['France']

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 border-b border-emerald-100 bg-white/80 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setStep('mobilityUpload', { targetCountry })}
            className="text-emerald-700 hover:bg-emerald-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-emerald-900">{t(language, 'mobProfile.title')}</h1>
          <Badge variant="secondary" className="ml-auto bg-emerald-100 text-emerald-700">
            {countryFlags[targetCountry] ?? '🌍'} {t(language, countryIdToNameKey[targetCountry] ?? 'mobShared.france')}
          </Badge>
        </div>
      </motion.header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* LEFT: Original extracted profile */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="mb-4 text-lg font-bold text-gray-800">
              <User className="mr-2 inline h-5 w-5 text-emerald-600" />
              {t(language, 'mobProfile.originalProfile')}
            </h2>

            <Card className="border-emerald-200 bg-white shadow-sm">
              <CardContent className="space-y-5 p-5">
                {/* Personal info */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">{t(language, 'mobProfile.personalInfo')}</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { icon: User, label: profile?.fullName ?? '—' },
                      { icon: Mail, label: profile?.email ?? '—' },
                      { icon: Phone, label: profile?.phone ?? '—' },
                      { icon: MapPin, label: profile?.location ?? '—' },
                    ].map((item, i) => {
                      const Icon = item.icon
                      return (
                        <div key={i} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                          <Icon className="h-4 w-4 shrink-0 text-emerald-600" />
                          <span className="truncate text-sm text-gray-700">{item.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Skills */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">{t(language, 'mobProfile.skills')}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile?.skills.map((s) => (
                      <Badge key={s} variant="secondary" className="bg-emerald-50 text-emerald-700">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Experience */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                    <Briefcase className="mr-1 inline h-3.5 w-3.5" /> {t(language, 'mobProfile.experience')}
                  </h3>
                  <div className="space-y-3">
                    {profile?.experience.map((exp, i) => (
                      <div key={i} className="relative pl-4 border-l-2 border-emerald-200">
                        <p className="text-sm font-medium text-gray-800">{exp.title}</p>
                        <p className="text-xs text-emerald-600">{exp.company} · {exp.period}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{exp.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Education */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                    <GraduationCap className="mr-1 inline h-3.5 w-3.5" /> {t(language, 'mobProfile.education')}
                  </h3>
                  <div className="space-y-3">
                    {profile?.education.map((edu, i) => (
                      <div key={i} className="relative pl-4 border-l-2 border-teal-200">
                        <p className="text-sm font-medium text-gray-800">{edu.degree}</p>
                        <p className="text-xs text-teal-600">{edu.school} · {edu.period}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* RIGHT: Reformatted for target country */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <h2 className="mb-4 text-lg font-bold text-gray-800">
              <Globe className="mr-2 inline h-5 w-5 text-teal-600" />
              {t(language, 'mobProfile.adaptedFor')} {t(language, countryIdToNameKey[targetCountry] ?? 'mobShared.france')}
            </h2>

            {/* Country norms */}
            <Card className="mb-4 border-teal-200 bg-white shadow-sm">
              <CardContent className="p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
                  {t(language, 'mobProfile.countryNorms')}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <FileImage className={`h-4 w-4 ${norms.photoRequired ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <span className="text-sm text-gray-700">{t(language, norms.photoRequired ? 'mobProfile.photoRequired' : 'mobProfile.photoNotRequired')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-teal-600" />
                    <span className="text-sm text-gray-700">{norms.maxPages} {t(language, 'mobProfile.pagesMax')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Languages className="h-4 w-4 text-teal-600" />
                    <span className="text-sm text-gray-700">{norms.language}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-teal-600" />
                    <span className="text-sm text-gray-700">{norms.cvFormat}</span>
                  </div>
                </div>

                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-emerald-700">{t(language, 'mobProfile.requiredSectionsLabel')}</p>
                  <div className="flex flex-wrap gap-1">
                    {norms.requiredSections.map((s) => (
                      <Badge key={s} variant="outline" className="border-emerald-300 text-xs text-emerald-700">
                        <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" /> {s}
                      </Badge>
                    ))}
                  </div>
                </div>
                {norms.forbiddenSections.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium text-red-600">{t(language, 'mobProfile.forbiddenSectionsLabel')}</p>
                    <div className="flex flex-wrap gap-1">
                      {norms.forbiddenSections.map((s) => (
                        <Badge key={s} variant="outline" className="border-red-300 text-xs text-red-600">
                          <XIcon className="mr-0.5 h-2.5 w-2.5" /> {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Compatibility score */}
            <Card className="mb-4 border-emerald-200 bg-white shadow-sm">
              <CardContent className="flex items-center gap-6 p-5">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                  <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-100"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className={getScoreBg(compatibilityScore)}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray={`${compatibilityScore}, 100`}
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className={`absolute text-lg font-bold ${getScoreColor(compatibilityScore)}`}>
                    {compatibilityScore}%
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{t(language, 'mobProfile.compatibilityScore')}</p>
                  <p className="text-xs text-gray-500">
                    {compatibilityScore >= 80
                      ? t(language, 'mobProfile.scoreExcellent')
                      : compatibilityScore >= 60
                        ? t(language, 'mobProfile.scoreGood')
                        : t(language, 'mobProfile.scoreNeedsWork')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Skills gap */}
            <Card className="mb-4 border-amber-200 bg-white shadow-sm">
              <CardContent className="p-5">
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-amber-600">
                  <AlertTriangle className="h-4 w-4" /> {t(language, 'mobProfile.missingSkills')}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {skillsGap.map((s) => (
                    <Badge key={s} variant="outline" className="border-amber-300 text-amber-700">
                      {s}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card className="border-emerald-200 bg-white shadow-sm">
              <CardContent className="p-5">
                <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-emerald-600">
                  <Lightbulb className="h-4 w-4" /> {t(language, 'mobProfile.recommendations')}
                </h3>
                <ul className="space-y-2">
                  {recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Button
            size="lg"
            onClick={() => setStep('mobilityResult')}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 text-white shadow-lg hover:from-emerald-700 hover:to-teal-700"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            {t(language, 'mobProfile.generateCvCl')}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setStep('mobilityUpload', { targetCountry })}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            <Eye className="mr-2 h-4 w-4" />
            {t(language, 'mobProfile.edit')}
          </Button>
        </motion.div>
      </main>
    </div>
  )
}
