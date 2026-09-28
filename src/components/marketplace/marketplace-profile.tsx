'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Users, Edit3, Save, Award, MessageSquare, Calendar, Star, Shield, Sparkles, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

interface ProfileData {
  id: string
  bio: string
  skills: string
  reputation: number
  postsCount: number
  repliesCount: number
  eventsAttended: number
  badges: string
  user: { name: string | null; image: string | null; email: string | null }
}

const badgeConfig: Record<string, { icon: typeof Star; i18nKey: string; color: string }> = {
  'first-post': { icon: Edit3, i18nKey: 'mpBadgeFirstPost', color: 'bg-emerald-100 text-emerald-700' },
  helpful: { icon: Star, i18nKey: 'mpBadgeHelpful', color: 'bg-amber-100 text-amber-700' },
  active: { icon: Zap, i18nKey: 'mpBadgeActive', color: 'bg-sky-100 text-sky-700' },
  'top-contributor': { icon: Shield, i18nKey: 'mpBadgeTopContributor', color: 'bg-violet-100 text-violet-700' },
  'event-attendee': { icon: Calendar, i18nKey: 'mpBadgeEventAttendee', color: 'bg-rose-100 text-rose-700' },
  'early-adopter': { icon: Sparkles, i18nKey: 'mpBadgeEarlyAdopter', color: 'bg-orange-100 text-orange-700' },
}

export default function MarketplaceProfile() {
  const { language, setStep } = useCVStore()
  const isRtl = language === 'ar'
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState('')
  const [skills, setSkills] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/marketplace/profile')
      .then(r => r.json())
      .then(data => {
        if (data.profile) {
          setProfile(data.profile)
          setBio(data.profile.bio)
          setSkills(data.profile.skills)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/marketplace/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio, skills }),
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(data.profile)
        setEditing(false)
      }
    } catch {}
    setSaving(false)
  }

  const parsedSkills: string[] = (() => {
    try { return JSON.parse(skills) } catch { return skills.split(',').map(s => s.trim()).filter(Boolean) }
  })()

  const parsedBadges: string[] = (() => {
    try { return JSON.parse(profile?.badges || '[]') } catch { return [] }
  })()

  const repLevel = profile ? Math.min(100, Math.floor(profile.reputation / 2)) : 0
  const repLevelKey = repLevel >= 80 ? 'mpRepExpert' : repLevel >= 50 ? 'mpRepAdvanced' : repLevel >= 20 ? 'mpRepIntermediate' : 'mpRepBeginner'
  const repLabel = t(language, repLevelKey)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-amber-50/20" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-32 bg-gray-200 rounded-xl" />
            <div className="h-64 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-amber-50/20" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setStep('marketplaceHome')} className="cursor-pointer">
              <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">{t(language, 'mpProfileTitle')}</h1>
                <p className="text-sm text-muted-foreground">{t(language, 'mpProfileSubtitle')}</p>
              </div>
            </div>
          </div>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="cursor-pointer">
              <Edit3 className={`w-4 h-4 ${isRtl ? 'ml-1' : 'mr-1'}`} />
              {t(language, 'mpProfileEdit')}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Profile Card */}
          <div className="lg:col-span-1 space-y-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6 text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold">
                    {profile?.user?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <h2 className="text-lg font-bold">{profile?.user?.name || t(language, 'mpUtilisateur')}</h2>
                  <p className="text-sm text-muted-foreground">{profile?.user?.email || ''}</p>

                  {/* Reputation */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t(language, 'mpProfileReputation')}</span>
                      <span className="font-bold text-amber-600">{profile?.reputation || 0}</span>
                    </div>
                    <Progress value={repLevel} className="h-2" />
                    <p className="text-xs text-muted-foreground">{repLabel}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Badges */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    {t(language, 'mpProfileBadges')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {parsedBadges.length > 0 ? parsedBadges.map((badge) => {
                      const config = badgeConfig[badge]
                      if (!config) return null
                      const Icon = config.icon
                      return (
                        <Badge key={badge} variant="secondary" className={`${config.color} gap-1`}>
                          <Icon className="w-3 h-3" />
                          {t(language, config.i18nKey as 'mpBadgeFirstPost')}
                        </Badge>
                      )
                    }) : (
                      <p className="text-xs text-muted-foreground">{t(language, 'mpBadgeEarlyAdopter')}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right: Details */}
          <div className="lg:col-span-2 space-y-4">
            {/* Stats */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <div className="grid grid-cols-3 gap-3">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <MessageSquare className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold">{profile?.postsCount || 0}</p>
                    <p className="text-xs text-muted-foreground">{t(language, 'mpProfilePosts')}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <Star className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold">{profile?.repliesCount || 0}</p>
                    <p className="text-xs text-muted-foreground">{t(language, 'mpProfileReplies')}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <Calendar className="w-5 h-5 text-violet-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold">{profile?.eventsAttended || 0}</p>
                    <p className="text-xs text-muted-foreground">{t(language, 'mpProfileEventsAttended')}</p>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            {/* Bio */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2">{t(language, 'mpProfileBio')}</h3>
                  {editing ? (
                    <Textarea
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder={t(language, 'mpProfileBioPh')}
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{bio || t(language, 'mpProfileBioPh')}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Skills */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2">{t(language, 'mpProfileSkills')}</h3>
                  {editing ? (
                    <Input
                      value={skills}
                      onChange={e => setSkills(e.target.value)}
                      placeholder={t(language, 'mpProfileSkillsPh')}
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {parsedSkills.length > 0 ? parsedSkills.map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                      )) : (
                        <p className="text-sm text-muted-foreground">{t(language, 'mpProfileSkillsPh')}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Save Button */}
            {editing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setEditing(false); setBio(profile?.bio || ''); setSkills(profile?.skills || '') }} className="cursor-pointer">
                  {t(language, 'mpPostCancel')}
                </Button>
                <Button
                  className="bg-amber-600 hover:bg-amber-700 cursor-pointer"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save className={`w-4 h-4 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                  {t(language, 'mpProfileSave')}
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
