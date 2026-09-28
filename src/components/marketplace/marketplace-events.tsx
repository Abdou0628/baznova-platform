'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, MapPin, Clock, Users, CheckCircle2, Video, UsersRound, Wrench, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCVStore } from '@/store/cv-store'
import { t } from '@/lib/i18n'

interface Event {
  id: string
  title: string
  description: string
  type: string
  date: string
  duration: number
  location: string
  attendeeCount: number
  capacity: number
  status: string
}

const typeIcons: Record<string, typeof Video> = {
  webinar: Video,
  meetup: UsersRound,
  workshop: Wrench,
  'job-fair': Briefcase,
}

const typeLabels: Record<string, 'mpEventTypeWebinar' | 'mpEventTypeMeetup' | 'mpEventTypeWorkshop' | 'mpEventTypeJobFair'> = {
  webinar: 'mpEventTypeWebinar',
  meetup: 'mpEventTypeMeetup',
  workshop: 'mpEventTypeWorkshop',
  'job-fair': 'mpEventTypeJobFair',
}

const typeColors: Record<string, string> = {
  webinar: 'from-sky-500 to-blue-500',
  meetup: 'from-emerald-500 to-teal-500',
  workshop: 'from-violet-500 to-purple-500',
  'job-fair': 'from-amber-500 to-orange-500',
}

export default function MarketplaceEvents() {
  const { language, setStep } = useCVStore()
  const isRtl = language === 'ar'
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState('all')
  const [activeStatus, setActiveStatus] = useState<'upcoming' | 'past'>('upcoming')
  const [rsvpIds, setRsvpIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const params = new URLSearchParams({ status: activeStatus, language })
    if (activeType !== 'all') params.set('type', activeType)
    fetch(`/api/marketplace/events?${params}`)
      .then(r => r.json())
      .then(data => { setEvents(data.events || []); setLoading(false) })
      .catch(() => { setLoading(false) })
  }, [activeType, activeStatus, language])

  const handleRSVP = async (eventId: string) => {
    try {
      const res = await fetch('/api/marketplace/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, action: 'rsvp' }),
      })
      if (res.ok) {
        setRsvpIds(prev => new Set(prev).add(eventId))
        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, attendeeCount: e.attendeeCount + 1 } : e))
      }
    } catch {}
  }

  const types = [
    { key: 'all', i18nKey: 'mpEventTypeAll' as const },
    { key: 'webinar', i18nKey: 'mpEventTypeWebinar' as const },
    { key: 'meetup', i18nKey: 'mpEventTypeMeetup' as const },
    { key: 'workshop', i18nKey: 'mpEventTypeWorkshop' as const },
    { key: 'job-fair', i18nKey: 'mpEventTypeJobFair' as const },
  ]

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString(language === 'fr' ? 'fr-FR' : language === 'ar' ? 'ar-SA' : language === 'es' ? 'es-ES' : 'en-US', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-violet-50/20" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => setStep('marketplaceHome')} className="cursor-pointer">
            <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{t(language, 'mpEventsTitle')}</h1>
              <p className="text-sm text-muted-foreground">{t(language, 'mpEventsSubtitle')}</p>
            </div>
          </div>
        </div>

        {/* Status Toggle */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeStatus === 'upcoming' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveStatus('upcoming')}
            className={`cursor-pointer ${activeStatus === 'upcoming' ? 'bg-violet-600 hover:bg-violet-700' : ''}`}
          >
            {t(language, 'mpEventUpcoming')}
          </Button>
          <Button
            variant={activeStatus === 'past' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveStatus('past')}
            className={`cursor-pointer ${activeStatus === 'past' ? 'bg-violet-600 hover:bg-violet-700' : ''}`}
          >
            {t(language, 'mpEventPast')}
          </Button>
        </div>

        {/* Type Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {types.map(type => (
            <Badge
              key={type.key}
              variant={activeType === type.key ? 'default' : 'outline'}
              className={`cursor-pointer transition-colors ${activeType === type.key ? 'bg-violet-600' : ''}`}
              onClick={() => setActiveType(type.key)}
            >
              {t(language, type.i18nKey)}
            </Badge>
          ))}
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-3" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2 mb-2" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center text-muted-foreground">
              {t(language, 'mpNoEvents')}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((event, i) => {
              const Icon = typeIcons[event.type] || Video
              const isFull = event.attendeeCount >= event.capacity
              const isRsvp = rsvpIds.has(event.id)
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card className="border-0 shadow-sm hover:shadow-lg transition-all h-full flex flex-col">
                    <CardContent className="p-5 flex flex-col flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${typeColors[event.type] || 'from-gray-500 to-gray-600'} text-white shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Badge variant="secondary" className="text-xs mb-1">
                            {t(language, typeLabels[event.type] || 'mpEventTypeWebinar')}
                          </Badge>
                          <h3 className="font-bold text-sm line-clamp-2">{event.title}</h3>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">{event.description}</p>
                      <div className="space-y-2 text-xs text-muted-foreground mb-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatDate(event.date)} · {event.duration} {t(language, 'mpEventDuration')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{event.location || t(language, 'mpEventLocation')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5" />
                          <span>{event.attendeeCount} {t(language, 'mpEventAttendees')} / {event.capacity}</span>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                        <div
                          className="bg-violet-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (event.attendeeCount / event.capacity) * 100)}%` }}
                        />
                      </div>
                      <div className="flex gap-2">
                        {activeStatus === 'upcoming' && (
                          isFull ? (
                            <Badge variant="secondary" className="text-amber-700 bg-amber-50">
                              {t(language, 'mpEventFull')}
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant={isRsvp ? 'secondary' : 'default'}
                              className={`flex-1 cursor-pointer ${isRsvp ? '' : 'bg-violet-600 hover:bg-violet-700'}`}
                              onClick={() => !isRsvp && handleRSVP(event.id)}
                              disabled={isRsvp}
                            >
                              {isRsvp ? (
                                <><CheckCircle2 className={`w-4 h-4 ${isRtl ? 'ml-1' : 'mr-1'}`} />{t(language, 'mpEventRSVPed')}</>
                              ) : (
                                t(language, 'mpEventRSVP')
                              )}
                            </Button>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
