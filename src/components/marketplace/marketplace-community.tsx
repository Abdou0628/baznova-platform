'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, MessageSquare, Plus, Search, ArrowUpDown, ChevronUp, ChevronDown, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useCVStore, type AppStep } from '@/store/cv-store'
import { t } from '@/lib/i18n'

interface Reply {
  id: string
  body: string
  upvotes: number
  createdAt: string
  user: { name: string | null; image: string | null } | null
}

interface Post {
  id: string
  title: string
  body: string
  category: string
  upvotes: number
  replyCount: number
  createdAt: string
  user: { name: string | null; image: string | null } | null
  replies?: Reply[]
}

const categories = [
  { key: 'all', i18nKey: 'mpCategoryAll' as const, color: 'bg-gray-100 text-gray-700' },
  { key: 'career-advice', i18nKey: 'mpCategoryCareerAdvice' as const, color: 'bg-emerald-100 text-emerald-700' },
  { key: 'job-search', i18nKey: 'mpCategoryJobSearch' as const, color: 'bg-amber-100 text-amber-700' },
  { key: 'interview-prep', i18nKey: 'mpCategoryInterviewPrep' as const, color: 'bg-violet-100 text-violet-700' },
  { key: 'cv-review', i18nKey: 'mpCategoryCvReview' as const, color: 'bg-sky-100 text-sky-700' },
  { key: 'industry-news', i18nKey: 'mpCategoryIndustryNews' as const, color: 'bg-rose-100 text-rose-700' },
  { key: 'off-topic', i18nKey: 'mpCategoryOffTopic' as const, color: 'bg-gray-100 text-gray-700' },
]

export default function MarketplaceCommunity() {
  const { language, setStep } = useCVStore()
  const isRtl = language === 'ar'
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'new' | 'top'>('new')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newCategory, setNewCategory] = useState('career-advice')
  const [submitting, setSubmitting] = useState(false)
  // Reply state
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)

  const loadPosts = () => {
    const params = new URLSearchParams({ language, sort, limit: '30' })
    if (activeCategory !== 'all') params.set('category', activeCategory)
    if (search) params.set('search', search)
    fetch(`/api/marketplace/posts?${params}`)
      .then(r => r.json())
      .then(data => { setPosts(data.posts || []); setLoading(false) })
      .catch(() => { setLoading(false) })
  }

  useEffect(() => {
    loadPosts()
  }, [language, sort, activeCategory, search])

  const handleCreatePost = async () => {
    if (!newTitle.trim() || !newBody.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/marketplace/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, body: newBody, category: newCategory, language }),
      })
      if (res.ok) {
        setNewTitle(''); setNewBody(''); setNewCategory('career-advice')
        setDialogOpen(false)
        loadPosts()
      }
    } catch {}
    setSubmitting(false)
  }

  const handleUpvote = async (postId: string) => {
    try {
      await fetch('/api/marketplace/posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action: 'upvote' }),
      })
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, upvotes: p.upvotes + 1 } : p))
    } catch {}
  }

  const handleDownvote = async (postId: string) => {
    try {
      await fetch('/api/marketplace/posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action: 'downvote' }),
      })
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, upvotes: Math.max(0, p.upvotes - 1) } : p))
    } catch {}
  }

  const handleReply = async (postId: string) => {
    if (!replyText.trim()) return
    setSubmittingReply(true)
    try {
      await fetch('/api/marketplace/posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action: 'reply', body: replyText }),
      })
      setReplyText('')
      loadPosts()
    } catch {}
    setSubmittingReply(false)
  }

  const getCategoryColor = (cat: string) => categories.find(c => c.key === cat)?.color || 'bg-gray-100 text-gray-700'
  const getCategoryLabel = (cat: string) => {
    const found = categories.find(c => c.key === cat)
    return found ? t(language, found.i18nKey) : cat
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-emerald-50/20" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setStep('marketplaceHome')} className="cursor-pointer">
              <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">{t(language, 'mpCommunityTitle')}</h1>
                <p className="text-sm text-muted-foreground">{t(language, 'mpCommunitySubtitle')}</p>
              </div>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer">
                <Plus className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                {t(language, 'mpNewPost')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t(language, 'mpNewPost')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <Input
                  placeholder={t(language, 'mpPostTitlePh')}
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                />
                <Textarea
                  placeholder={t(language, 'mpPostBodyPh')}
                  value={newBody}
                  onChange={e => setNewBody(e.target.value)}
                  rows={5}
                />
                <div>
                  <p className="text-sm font-medium mb-2">{t(language, 'mpPostCategory')}</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.filter(c => c.key !== 'all').map(cat => (
                      <Badge
                        key={cat.key}
                        variant={newCategory === cat.key ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setNewCategory(cat.key)}
                      >
                        {t(language, cat.i18nKey)}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>{t(language, 'mpPostCancel')}</Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                    onClick={handleCreatePost}
                    disabled={submitting || !newTitle.trim() || !newBody.trim()}
                  >
                    {t(language, 'mpPostSubmit')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search & Sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRtl ? 'right-3' : 'left-3'}`} />
            <Input
              placeholder={t(language, 'mpSearchPh')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`${isRtl ? 'pr-10' : 'pl-10'}`}
            />
          </div>
          <Button
            variant={sort === 'new' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSort(sort === 'new' ? 'top' : 'new')}
            className="cursor-pointer shrink-0"
          >
            <ArrowUpDown className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
            {sort === 'new' ? t(language, 'mpSortNew') : t(language, 'mpSortTop')}
          </Button>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(cat => (
            <Badge
              key={cat.key}
              variant={activeCategory === cat.key ? 'default' : 'outline'}
              className={`cursor-pointer transition-colors ${activeCategory === cat.key ? 'bg-emerald-600' : ''}`}
              onClick={() => setActiveCategory(cat.key)}
            >
              {t(language, cat.i18nKey)}
            </Badge>
          ))}
        </div>

        {/* Posts List */}
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2 mb-2" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-full" />
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
            posts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Vote column */}
                      <div className="flex flex-col items-center gap-0.5 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUpvote(post.id) }}
                          className="p-1 rounded hover:bg-emerald-50 text-muted-foreground hover:text-emerald-600 transition-colors cursor-pointer"
                          title={t(language, 'mpUpvote')}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-bold text-emerald-600">{post.upvotes}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownvote(post.id) }}
                          className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                          title={t(language, 'mpDownvote')}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="secondary" className={`text-xs ${getCategoryColor(post.category)}`}>
                            {getCategoryLabel(post.category)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {post.user?.name || t(language, 'mpAnonymous')}
                          </span>
                        </div>
                        <h3 className="font-semibold text-sm mb-1">{post.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{post.body}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{post.replyCount} {t(language, 'mpReplies')}</span>
                          <MessageSquare className="w-3 h-3" />
                        </div>
                      </div>
                    </div>

                    {/* Expanded: Replies */}
                    <AnimatePresence>
                      {expandedPost === post.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className={`mt-4 pt-4 border-t ${isRtl ? 'border-gray-100' : 'border-gray-100'}`}>
                            {/* Existing replies */}
                            {post.replies && post.replies.length > 0 && (
                              <div className="space-y-3 mb-4">
                                {post.replies.map(reply => (
                                  <div key={reply.id} className="bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-medium">{reply.user?.name || t(language, 'mpAnonymous')}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{reply.body}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Reply input */}
                            <div className="flex gap-2">
                              <Input
                                placeholder={t(language, 'mpReplyPlaceholder')}
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(post.id) } }}
                              />
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 shrink-0 cursor-pointer"
                                onClick={() => handleReply(post.id)}
                                disabled={submittingReply || !replyText.trim()}
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
