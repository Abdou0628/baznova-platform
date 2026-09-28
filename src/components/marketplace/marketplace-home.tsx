'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Store, Users, MessageSquare, Calendar, BookOpen, ChevronRight, TrendingUp, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCVStore, type AppStep } from '@/store/cv-store'
import { t } from '@/lib/i18n'

interface Post {
  id: string
  title: string
  body: string
  category: string
  upvotes: number
  replyCount: number
  createdAt: string
  user: { name: string | null; image: string | null } | null
}

const categoryColors: Record<string, string> = {
  'career-advice': 'bg-emerald-100 text-emerald-700',
  'job-search': 'bg-amber-100 text-amber-700',
  'interview-prep': 'bg-violet-100 text-violet-700',
  'cv-review': 'bg-sky-100 text-sky-700',
  'industry-news': 'bg-rose-100 text-rose-700',
  'off-topic': 'bg-gray-100 text-gray-700',
}

export default function MarketplaceHome() {
  const { language, setStep } = useCVStore()
  const isRtl = language === 'ar'
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Seed if empty
    fetch('/api/marketplace/posts', { method: 'PATCH' }).catch(() => {})
    // Fetch posts
    fetch(`/api/marketplace/posts?language=${language}&sort=top&limit=5`)
      .then(r => r.json())
      .then(data => { setPosts(data.posts || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [language])

  const stats = [
    { icon: Users, label: t(language, 'marketplaceStatMembers'), value: '2,847', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: MessageSquare, label: t(language, 'marketplaceStatDiscussions'), value: '1,203', color: 'text-amber-600', bg: 'bg-amber-50' },
    { icon: Calendar, label: t(language, 'marketplaceStatEvents'), value: '48', color: 'text-violet-600', bg: 'bg-violet-50' },
    { icon: BookOpen, label: t(language, 'marketplaceStatResources'), value: '356', color: 'text-sky-600', bg: 'bg-sky-50' },
  ]

  const quickActions = [
    { icon: MessageSquare, label: t(language, 'marketplaceQuickCommunity'), step: 'marketplaceCommunity' as AppStep, color: 'from-emerald-500 to-teal-500' },
    { icon: Calendar, label: t(language, 'marketplaceQuickEvents'), step: 'marketplaceEvents' as AppStep, color: 'from-violet-500 to-purple-500' },
    { icon: Users, label: t(language, 'marketplaceQuickProfile'), step: 'marketplaceProfile' as AppStep, color: 'from-amber-500 to-orange-500' },
  ]

  const trending = [
    t(language, 'marketplaceTrending1'),
    t(language, 'marketplaceTrending2'),
    t(language, 'marketplaceTrending3'),
    t(language, 'marketplaceTrending4'),
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-emerald-50/20" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => setStep('landing')} className="cursor-pointer">
            <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{t(language, 'mpHomeH1')}</h1>
              <p className="text-sm text-muted-foreground">{t(language, 'marketplaceSubtitle')}</p>
            </div>
          </div>
        </div>

        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 sm:p-8 mb-8"
        >
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">{t(language, 'marketplaceWelcomeTitle')}</h2>
            <p className="text-emerald-100 text-sm sm:text-base max-w-xl">{t(language, 'marketplaceWelcomeDesc')}</p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {quickActions.map((action, i) => (
            <motion.div
              key={action.step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <Card
                className="cursor-pointer border-0 shadow-sm hover:shadow-lg transition-all group"
                onClick={() => setStep(action.step)}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} text-white shrink-0`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{action.label}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform ${isRtl ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Featured Discussions */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold">{t(language, 'marketplaceFeaturedTitle')}</h2>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-2" />
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    {t(language, 'marketplaceNoPosts')}
                  </CardContent>
                </Card>
              ) : (
                posts.map((post) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Card
                      className="cursor-pointer border-0 shadow-sm hover:shadow-md transition-all"
                      onClick={() => setStep('marketplaceCommunity')}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center gap-1 text-muted-foreground shrink-0">
                            <span className="text-sm font-bold text-emerald-600">{post.upvotes}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="secondary" className={`text-xs ${categoryColors[post.category] || 'bg-gray-100 text-gray-700'}`}>
                                {post.category}
                              </Badge>
                            </div>
                            <h3 className="font-semibold text-sm mb-1 line-clamp-2">{post.title}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-1">{post.body}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span>{post.user?.name || t(language, 'mpAnonymous')}</span>
                              <span>{post.replyCount} {t(language, 'mpReplies')}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Trending Topics */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Hash className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold">{t(language, 'marketplaceTrendingTitle')}</h2>
            </div>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                {trending.map((topic, i) => (
                  <div
                    key={topic}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-50 cursor-pointer transition-colors"
                    onClick={() => setStep('marketplaceCommunity')}
                  >
                    <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                    <span className="text-sm font-medium text-emerald-700">{topic}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
