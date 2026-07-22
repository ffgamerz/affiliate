import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Box, Typography, Card, CardContent, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, Chip, Snackbar, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Divider, useTheme, useMediaQuery,
} from '@mui/material'
import {
  Add, Edit, Delete, YouTube, Facebook, Instagram, Info, Upload,
  MusicNote as TikTokIcon, Shop, Forum as ThreadsIcon,
  Search as SearchIcon, Close as CloseIcon, ContentCopy as CopyIcon,
  Replay as ReplayIcon, Bookmark, BookmarkBorder,
} from '@mui/icons-material'
import { supabase } from '../lib/supabase'

const GoogleDriveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 87.3 76.6" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M63.7 28.1l-11.9-6.8c-.1 0-.2-.1-.3-.1l-11.9-6.8c-.1 0-.2 0-.3.1L21.9 28c-.1.1-.2.1-.3.1L6.1 34.9c-.1 0-.2.1-.1.2v12.3c0 .1.1.2.2.2l15.6 9.1c.1 0 .2 0 .3-.1l11.9 6.8c.1 0 .2.1.3.1l11.9 6.8c.1 0 .2 0 .3-.1l11.9-6.8c.1 0-.2-.1-.3-.1l11.9-6.8c.1 0 .2 0 .3.1l15.6-9.1c.1 0 .2-.1.2-.2V35c0-.1-.1-.2-.2-.2l-15.6-9.1c-.1 0-.2-.1-.3-.1z" fill="#0066CC"/>
    <path d="M63.7 28.1L44.2 4.2c-.1-.1-.2-.1-.3 0L21.9 28c-.1.1-.2.1-.3.1-.1L6.1 34.9c-.1 0-.2.1-.1.2v12.3c0 .1.1.2.2.2l15.6 9.1c.1 0 .2 0 .3-.1l11.9 6.8c.1 0 .2.1.3.1l11.9 6.8c.1 0 .2 0 .3-.1l11.9-6.8c.1 0-.2-.1-.3-.1l11.9-6.8c.1 0 .2 0 .3.1l15.6-9.1c.1 0 .2-.1.2-.2V35c0-.1-.1-.2-.2-.2l-15.6-9.1c-.1 0-.2-.1-.3-.1z" fill="#00AC47"/>
  </svg>
)

interface Video {
  id: string; title: string; description: string | null; created_at: string
  youtube_url: string | null; youtube_upload_date: string | null
  facebook_url: string | null; facebook_upload_date: string | null
  instagram_url: string | null; instagram_upload_date: string | null
  shopee_url: string | null; shopee_upload_date: string | null
  threads_url: string | null; threads_upload_date: string | null
  tiktok_url: string | null; tiktok_upload_date: string | null
  tiktok_product_url: string | null; shopee_product_url: string | null
}

interface Reupload {
  id: string; video_id: string; platform: string; url: string | null
  upload_date: string | null; notes: string | null; created_at: string
}

const platforms = [
  { key: 'youtube', label: 'YouTube' }, { key: 'tiktok', label: 'TikTok' },
  { key: 'facebook', label: 'Facebook' }, { key: 'instagram', label: 'Instagram' },
  { key: 'threads', label: 'Threads' }, { key: 'shopee', label: 'Shopee' },
]

interface DescriptionSection { title: string; content: string }

const parseDescription = (text: string): DescriptionSection[] => {
  if (!text) return []
  const sections: DescriptionSection[] = []
  const lines = text.split('\n')
  const sectionStartIndices: number[] = []
  lines.forEach((line, index) => { const t = line.trim(); if (t.startsWith('--') && t.endsWith('--')) sectionStartIndices.push(index) })
  if (sectionStartIndices.length === 0) { sections.push({ title: 'Content', content: text }); return sections }
  for (let i = 0; i < sectionStartIndices.length; i++) {
    const currentStart = sectionStartIndices[i]; const nextStart = sectionStartIndices[i + 1]
    const title = lines[currentStart].trim().replace(/^--\s*/, '').replace(/\s*--$/, '')
    const content = (nextStart ? lines.slice(currentStart + 1, nextStart) : lines.slice(currentStart + 1)).join('\n').trim()
    sections.push({ title, content })
  }
  return sections
}

const platformIcons: Record<string, React.ReactElement | null> = {
  youtube: <YouTube />, tiktok: <TikTokIcon />, facebook: <Facebook />,
  instagram: <Instagram />, threads: <ThreadsIcon />, shopee: <Shop />,
}

const getPlatformColor = (p: string): string => {
  const c: Record<string, string> = { youtube: '#FF0000', tiktok: '#000000', facebook: '#1877F2', instagram: '#E4405F', threads: '#000000', shopee: '#EE4D2D' }
  return c[p] || '#666666'
}

const buildUploadDateOrFilter = (date: string): string => platforms.map(p => `${p.key}_upload_date.eq.${date}`).join(',')

const StatCard = ({ filterKey, title, videoCount, platformUploadCount, uploadDateFilter, onFilterClick, platformBreakdown }: {
  filterKey: 'today' | 'yesterday' | 'range-3-9'; title: string; videoCount: number; platformUploadCount: number
  uploadDateFilter: 'today' | 'yesterday' | 'range-3-9' | ''
  onFilterClick: (filterKey: 'today' | 'yesterday' | 'range-3-9') => void
  platformBreakdown: { key: string; original: number; reupload: number }[]
}) => (
  <Card sx={{ bgcolor: 'background.paper', cursor: 'pointer', transition: 'all 0.2s ease', border: uploadDateFilter === filterKey ? '1px solid' : '1px solid #f0f0f0', borderColor: uploadDateFilter === filterKey ? 'primary.main' : '#f0f0f0', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } }}
    onClick={() => onFilterClick(filterKey)}>
    <CardContent sx={{ p: 2.5 }}>
      <Typography variant="caption" sx={{ fontSize: 12, fontWeight: 500, color: 'text.secondary', letterSpacing: 0.5, display: 'block', mb: 1 }}>{title}</Typography>
      <Typography variant="h4" sx={{ fontWeight: 700, fontSize: 32, color: 'text.primary', mb: 0.5 }}>{videoCount}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>Total platform uploads: <Typography component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>{platformUploadCount}</Typography></Typography>
      {platformBreakdown.some(p => p.original + p.reupload > 0) && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
          {platformBreakdown.map((p) => {
            const total = p.original + p.reupload
            if (total === 0) return null
            if (p.original > 0 && p.reupload > 0)
              return (<Box key={p.key} sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 1, py: 0.5, bgcolor: '#f5f5f5', borderRadius: 0.5, border: '1px solid', borderColor: '#81c784' }}>
                  <Box sx={{ width: 12, height: 12, display: 'flex', alignItems: 'center', color: getPlatformColor(p.key) }}>{platformIcons[p.key]}</Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', fontSize: 12 }}>{p.original}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 1, py: 0.5, bgcolor: '#f5f5f5', borderRadius: 0.5, border: '1px solid', borderColor: '#ffb74d' }}>
                  <Box sx={{ width: 12, height: 12, display: 'flex', alignItems: 'center', color: getPlatformColor(p.key) }}>{platformIcons[p.key]}</Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', fontSize: 12 }}>{p.reupload}</Typography>
                </Box>
              </Box>)
            const isReupload = p.reupload > 0 && p.original === 0
            return (<Box key={p.key} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 1, py: 0.5, bgcolor: '#f5f5f5', borderRadius: 0.5, border: '1px solid', borderColor: isReupload ? '#ffb74d' : '#81c784' }}>
              <Box sx={{ width: 12, height: 12, display: 'flex', alignItems: 'center', color: getPlatformColor(p.key) }}>{platformIcons[p.key]}</Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', fontSize: 12 }}>{total}</Typography>
            </Box>)
          })}
        </Box>
      )}
    </CardContent>
  </Card>
)

export default function Videos() {
  const location = useLocation(); const theme = useTheme(); const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [videos, setVideos] = useState<Video[]>([]); const [reuploads, setReuploads] = useState<Reupload[]>([])
  const [loading, setLoading] = useState(true); const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true); const [currentPage, setCurrentPage] = useState(0)
  const [open, setOpen] = useState(false); const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [descriptionOpen, setDescriptionOpen] = useState(false); const [selectedDescription, setSelectedDescription] = useState('')
  const [selectedDescriptionVideo, setSelectedDescriptionVideo] = useState<Video | null>(null)
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false); const [selectedVideoUrl, setSelectedVideoUrl] = useState('')
  const [videoLoading, setVideoLoading] = useState(false); const [uploadInfoOpen, setUploadInfoOpen] = useState(false)
  const [selectedVideoForInfo, setSelectedVideoForInfo] = useState<Video | null>(null)
  const ITEMS_PER_PAGE = 10
  const [searchQuery, setSearchQuery] = useState(''); const [activeSearchQuery, setActiveSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState(''); const [filterEmptyPlatform, setFilterEmptyPlatform] = useState<string | null>(null)
  const [platformFilter, setPlatformFilter] = useState<string>('')
  const [uploadDateFilter, setUploadDateFilter] = useState<'today' | 'yesterday' | 'range-3-9' | ''>('')
  const [customUploadDateFilter, setCustomUploadDateFilter] = useState('')
  const dflt = () => platforms.map(p => ({ key: p.key, original: 0, reupload: 0 }))
const [todayStats, setTodayStats] = useState({ videoCount: 0, reuploadCount: 0, platformBreakdown: dflt() })
const [yesterdayStats, setYesterdayStats] = useState({ videoCount: 0, reuploadCount: 0, platformBreakdown: dflt() })
const [range3to9Stats, setRange3to9Stats] = useState({ videoCount: 0, reuploadCount: 0, platformBreakdown: dflt() })
const [reuploadDialogOpen, setReuploadDialogOpen] = useState(false); const [reuploadPlatform, setReuploadPlatform] = useState('')

// Original Creator stats
const [creatorStats, setCreatorStats] = useState({
  weekNumber: 0,
  shopeeCount: 0,
  target: 20,
  weekStart: '',
  weekEnd: '',
  platformBreakdown: dflt()
})
const [weeklyHistory, setWeeklyHistory] = useState<Array<{
  weekNumber: number;
  shopeeCount: number;
  dates: string[];
  platformBreakdown: { key: string; original: number; reupload: number }[]
}>>([])
const [weeklyHistoryOpen, setWeeklyHistoryOpen] = useState(false)
const [shopeeWeekFilter, setShopeeWeekFilter] = useState(false) // Filter for shopee videos in current week
  const [shopeeWeekDateRange, setShopeeWeekDateRange] = useState<string[] | null>(null) // Specific week date range for filtering
  const [reuploadUrl, setReuploadUrl] = useState(''); const [reuploadUploadDate, setReuploadUploadDate] = useState('')
  const [reuploadNotes, setReuploadNotes] = useState(''); const searchInputRef = useRef<HTMLInputElement>(null)
  const processedLocationStateRef = useRef<string | null>(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '' })
  const [title, setTitle] = useState(''); const [description, setDescription] = useState('')
  const [descriptionFocused, setDescriptionFocused] = useState(false); const [createdAt, setCreatedAt] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState(''); const [youtubeUploadDate, setYoutubeUploadDate] = useState<string | null>(null)
  const [facebookUrl, setFacebookUrl] = useState(''); const [facebookUploadDate, setFacebookUploadDate] = useState<string | null>(null)
  const [instagramUrl, setInstagramUrl] = useState(''); const [instagramUploadDate, setInstagramUploadDate] = useState<string | null>(null)
  const [shopeeUrl, setShopeeUrl] = useState(''); const [shopeeUploadDate, setShopeeUploadDate] = useState<string | null>(null)
  const [shopeeProductUrl, setShopeeProductUrl] = useState(''); const [threadsUrl, setThreadsUrl] = useState('')
  const [threadsUploadDate, setThreadsUploadDate] = useState<string | null>(null); const [tiktokUrl, setTiktokUrl] = useState('')
  const [tiktokUploadDate, setTiktokUploadDate] = useState<string | null>(null); const [tiktokProductUrl, setTiktokProductUrl] = useState('')
  const [bookmarkedVideoIds, setBookmarkedVideoIds] = useState<Set<string>>(new Set())
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false)

  // Refs to track previous values for unselect optimization
  const prevUploadDateFilterRef = useRef<'today' | 'yesterday' | 'range-3-9' | ''>('')
  const prevYoutubeUrlRef = useRef('')
  const prevFacebookUrlRef = useRef('')
  const prevInstagramUrlRef = useRef('')
  const prevShopeeUrlRef = useRef('')
  const prevThreadsUrlRef = useRef('')
  const prevTiktokUrlRef = useRef('')

  // Date helper functions - defined early to avoid hoisting issues
  // Use Asia/Kuala_Lumpur timezone to match Malaysia local time
  const getTodayDate = () => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    return formatter.format(new Date())
  }
  const getDateDaysAgo = (days: number): string => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    const d = new Date()
    d.setDate(d.getDate() - days)
    return formatter.format(d)
  }
// Memoize date values to prevent infinite re-render loop
const todayDate = useMemo(() => getTodayDate(), [])
const yesterdayDate = useMemo(() => getDateDaysAgo(1), [])
const dates3to9 = useMemo(() => Array.from({ length: 7 }, (_, i) => getDateDaysAgo(i + 3)), [])

// Helper: Get current week range (Wednesday-Tuesday) in MY timezone
const getCurrentWeekRange = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const now = new Date()
  const myDateStr = formatter.format(now)
  const myDate = new Date(myDateStr)
  
  // Get Wednesday of current week (0 = Sunday, 3 = Wednesday)
  const dayOfWeek = myDate.getDay()
  const wednesday = new Date(myDate)
  // Calculate days to go back to get to Wednesday
  // If day is Wed(3), go back 0; Thu(4), go back 1; ... Sun(0), go back 4; Mon(1), go back 5; Tue(2), go back 6
  const daysToWednesday = (dayOfWeek + 4) % 7
  wednesday.setDate(myDate.getDate() - daysToWednesday)
  
  const tuesday = new Date(wednesday)
  tuesday.setDate(wednesday.getDate() + 6)
  
  // Generate all 7 dates in the week (Wed to Tue)
  const weekDates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(wednesday)
    d.setDate(wednesday.getDate() + i)
    weekDates.push(formatter.format(d))
  }
  
  return { monday: wednesday, sunday: tuesday, weekDates }
}

// Helper: Get ISO week number
const getISOWeekNumber = (date: Date): number => {
  const d = new Date(date)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// Helper: Format date range for display
const formatWeekRange = (monday: Date, sunday: Date): { start: string, end: string } => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
  return {
    start: formatter.format(monday),
    end: formatter.format(sunday)
  }
}

  // Auto-set/clear upload dates when URL changes - using useEffect for Safari compatibility
  useEffect(() => {
    if (youtubeUrl && !prevYoutubeUrlRef.current && !youtubeUploadDate) {
      setYoutubeUploadDate(todayDate)
    } else if (!youtubeUrl && prevYoutubeUrlRef.current) {
      setYoutubeUploadDate(null)
    }
    prevYoutubeUrlRef.current = youtubeUrl
  }, [youtubeUrl, todayDate, youtubeUploadDate])

  useEffect(() => {
    if (facebookUrl && !prevFacebookUrlRef.current && !facebookUploadDate) {
      setFacebookUploadDate(todayDate)
    } else if (!facebookUrl && prevFacebookUrlRef.current) {
      setFacebookUploadDate(null)
    }
    prevFacebookUrlRef.current = facebookUrl
  }, [facebookUrl, todayDate, facebookUploadDate])

  useEffect(() => {
    if (instagramUrl && !prevInstagramUrlRef.current && !instagramUploadDate) {
      setInstagramUploadDate(todayDate)
    } else if (!instagramUrl && prevInstagramUrlRef.current) {
      setInstagramUploadDate(null)
    }
    prevInstagramUrlRef.current = instagramUrl
  }, [instagramUrl, todayDate, instagramUploadDate])

  useEffect(() => {
    if (shopeeUrl && !prevShopeeUrlRef.current && !shopeeUploadDate) {
      setShopeeUploadDate(todayDate)
    } else if (!shopeeUrl && prevShopeeUrlRef.current) {
      setShopeeUploadDate(null)
    }
    prevShopeeUrlRef.current = shopeeUrl
  }, [shopeeUrl, todayDate, shopeeUploadDate])

  useEffect(() => {
    if (threadsUrl && !prevThreadsUrlRef.current && !threadsUploadDate) {
      setThreadsUploadDate(todayDate)
    } else if (!threadsUrl && prevThreadsUrlRef.current) {
      setThreadsUploadDate(null)
    }
    prevThreadsUrlRef.current = threadsUrl
  }, [threadsUrl, todayDate, threadsUploadDate])

  useEffect(() => {
    if (tiktokUrl && !prevTiktokUrlRef.current && !tiktokUploadDate) {
      setTiktokUploadDate(todayDate)
    } else if (!tiktokUrl && prevTiktokUrlRef.current) {
      setTiktokUploadDate(null)
    }
    prevTiktokUrlRef.current = tiktokUrl
  }, [tiktokUrl, todayDate, tiktokUploadDate])

  // Sync date with URL when dialog opens (for edit mode)
  useEffect(() => {
    if (open && editingVideo) {
      // When editing, if URL exists but date is empty, set date to today
      if (youtubeUrl && !youtubeUploadDate) setYoutubeUploadDate(todayDate)
      if (facebookUrl && !facebookUploadDate) setFacebookUploadDate(todayDate)
      if (instagramUrl && !instagramUploadDate) setInstagramUploadDate(todayDate)
      if (shopeeUrl && !shopeeUploadDate) setShopeeUploadDate(todayDate)
      if (threadsUrl && !threadsUploadDate) setThreadsUploadDate(todayDate)
      if (tiktokUrl && !tiktokUploadDate) setTiktokUploadDate(todayDate)
    }
  }, [open, editingVideo, youtubeUrl, youtubeUploadDate, facebookUrl, facebookUploadDate, instagramUrl, instagramUploadDate, shopeeUrl, shopeeUploadDate, threadsUrl, threadsUploadDate, tiktokUrl, tiktokUploadDate, todayDate])

  // Optimized fetchStats - fetch IDs for proper deduplication
  const fetchStats = useCallback(async () => {
    // Use memoized date values
    const todayStr = todayDate
    const yesterdayStr = yesterdayDate
    const d3to9 = dates3to9
    
    // Check cache first
    const cacheKey = `stats_${todayStr}`; const cached = localStorage.getItem(cacheKey)
    const now = Date.now(); const cacheAge = cached ? JSON.parse(cached).timestamp : 0
    if (cached && (now - cacheAge) < 5 * 60 * 1000) { // 5 min cache
      const { todayStats: ts, yesterdayStats: ys, range3to9Stats: rs } = JSON.parse(cached)
      setTodayStats(ts); setYesterdayStats(ys); setRange3to9Stats(rs)
      return
    }
    
    // Fetch video IDs for original uploads (to deduplicate)
    const cOrigIds = async (date: string) => {
      const { data } = await supabase.from('videos').select('id')
        .or(buildUploadDateOrFilter(date))
      return data ? data.map((v: any) => v.id) : []
    }
    
    // Fetch video IDs for reuploads (to deduplicate)
    const cReupIds = async (date: string) => {
      const { data } = await supabase.from('reuploads').select('video_id')
        .eq('upload_date', date)
      return data ? data.map((r: any) => r.video_id) : []
    }
    
    // Platform breakdown
    const cBreak = async (date: string) => {
      const r: { key: string; original: number; reupload: number }[] = []
      for (const p of platforms) {
        const [o, ru] = await Promise.all([
          supabase.from('videos').select('*', { count: 'exact', head: true }).eq(`${p.key}_upload_date`, date),
          supabase.from('reuploads').select('*', { count: 'exact', head: true }).eq('platform', p.key).eq('upload_date', date)
        ])
        r.push({ key: p.key, original: o.count || 0, reupload: ru.count || 0 })
      }
      return r
    }
    
    // Range queries
    // Range queries - use in() for each platform to get accurate count
    const cOrigRangeIds = async (dates: string[]) => {
      // Use in() for each platform to get all video IDs
      const allIds: string[] = []
      for (const p of platforms) {
        const { data } = await supabase.from('videos').select('id')
          .in(`${p.key}_upload_date`, dates)
        if (data) allIds.push(...data.map((v: any) => v.id))
      }
      return [...new Set(allIds)]
    }
    
    const cReupRangeIds = async (dates: string[]) => {
      const { data } = await supabase.from('reuploads').select('video_id')
        .in('upload_date', dates)
      return data ? data.map((r: any) => r.video_id) : []
    }
    
    const cBreakRange = async (dates: string[]) => {
      const r: { key: string; original: number; reupload: number }[] = []
      for (const p of platforms) {
        const [o, ru] = await Promise.all([
          supabase.from('videos').select('*', { count: 'exact', head: true }).in(`${p.key}_upload_date`, dates),
          supabase.from('reuploads').select('*', { count: 'exact', head: true }).eq('platform', p.key).in('upload_date', dates)
        ])
        r.push({ key: p.key, original: o.count || 0, reupload: ru.count || 0 })
      }
      return r
    }
    
    // Calculate unique video count
    const getUniqueCount = (vIds: string[], rIds: string[]) => {
      const allIds = [...vIds, ...rIds]
      return [...new Set(allIds)].length
    }
    
    // Run all queries in parallel
    const [tVIds, tRIds, tB, yVIds, yRIds, yB, rVIds, rRIds, rB] = await Promise.all([
      cOrigIds(todayStr), cReupIds(todayStr), cBreak(todayStr),
      cOrigIds(yesterdayStr), cReupIds(yesterdayStr), cBreak(yesterdayStr),
      cOrigRangeIds(d3to9), cReupRangeIds(d3to9), cBreakRange(d3to9)
    ])
    
    const ts = { videoCount: getUniqueCount(tVIds, tRIds), reuploadCount: tRIds.length, platformBreakdown: tB }
    const ys = { videoCount: getUniqueCount(yVIds, yRIds), reuploadCount: yRIds.length, platformBreakdown: yB }
    const rs = { videoCount: getUniqueCount(rVIds, rRIds), reuploadCount: rRIds.length, platformBreakdown: rB }
    
    // Cache for 5 minutes
    localStorage.setItem(cacheKey, JSON.stringify({ 
      todayStats: ts, yesterdayStats: ys, range3to9Stats: rs, 
      timestamp: now 
    }))
    
    setTodayStats(ts); setYesterdayStats(ys); setRange3to9Stats(rs)
  }, [])

  // Handle location state for navigation from other pages
  useEffect(() => {
    const state = location.state as any
    const stateKey = state ? JSON.stringify(state) : null
    // Only process if this is a new state (not same as before)
    if (processedLocationStateRef.current === stateKey) return
    processedLocationStateRef.current = stateKey
    
    if (state?.focusSearch && searchInputRef.current) searchInputRef.current.focus()
    if (state?.calendarUploadDate) { 
      setCustomUploadDateFilter(state.calendarUploadDate); 
      setUploadDateFilter(''); 
      setSearchQuery(''); 
      setActiveSearchQuery('');
      setPlatformFilter(''); 
      setFilterEmptyPlatform(null); 
    }
    if (state?.searchQuery) {
      setSearchQuery(state.searchQuery);
      setActiveSearchQuery(state.searchQuery);
      setUploadDateFilter('');
      setPlatformFilter('');
      setDateFilter('');
      setCustomUploadDateFilter('');
      setFilterEmptyPlatform(null);
    }
    if (state?.filterEmptyPlatform) {
      setFilterEmptyPlatform(state.filterEmptyPlatform)
    }
    if (state?.openAddDialog) {
      openAddDialog()
    }
  }, [location.key])

  // Handle stat card click - reset other filters when clicking stat card
  const handleStatCardClick = (filterKey: 'today' | 'yesterday' | 'range-3-9') => {
    // If clicking the same filter (unselect), just reset without fetching
    if (uploadDateFilter === filterKey) {
      setUploadDateFilter('')
      setSearchQuery('')
      setActiveSearchQuery('')
      setDateFilter('')
      setPlatformFilter('')
      setFilterEmptyPlatform(null)
      setCustomUploadDateFilter('')
      // Don't fetch - data is already loaded, just reset filter
      // Reset loading state to false since we're not fetching
      setLoading(false)
    } else {
      setUploadDateFilter(filterKey)
      // Reset other filters when clicking stat card to show clean data
      setSearchQuery('')
      setActiveSearchQuery('')
      setDateFilter('')
      setPlatformFilter('')
      setFilterEmptyPlatform(null)
      setCustomUploadDateFilter('')
    }
  }

  // Handle search button click
  const handleSearch = () => {
    setActiveSearchQuery(searchQuery)
  }

  // Build query for videos - with optional pagination
  const buildFilteredQuery = useCallback((page: number, usePagination: boolean = true) => {
    let q = supabase.from('videos').select('*', { count: 'exact' })
    if (usePagination) {
      q = q.order('created_at', { ascending: false }).range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1)
    } else {
      // No pagination - fetch all matching records (for upload date filter)
      q = q.order('created_at', { ascending: false })
    }
    if (activeSearchQuery) q = q.or(`title.ilike.%${activeSearchQuery}%`)
    if (dateFilter) q = q.eq('created_at', `${dateFilter}T00:00:00.000Z`)
    if (platformFilter) q = q.not(`${platformFilter}_url`, 'is', null)
    if (filterEmptyPlatform) q = q.is(`${filterEmptyPlatform}_url`, null)
    // Apply upload date filter (platform upload dates) - for klik kad Today/Yesterday/3-9
    if (uploadDateFilter === 'today') q = q.or(buildUploadDateOrFilter(todayDate))
    else if (uploadDateFilter === 'yesterday') q = q.or(buildUploadDateOrFilter(yesterdayDate))
    else if (uploadDateFilter === 'range-3-9') {
      // Use in() for each platform to get all matching videos
      const rangeFilters = dates3to9.flatMap(d => buildUploadDateOrFilter(d).split(',')).join(',')
      q = q.or(rangeFilters)
    }
    else if (customUploadDateFilter) q = q.or(buildUploadDateOrFilter(customUploadDateFilter))
    return q
  }, [activeSearchQuery, dateFilter, platformFilter, filterEmptyPlatform, uploadDateFilter, customUploadDateFilter, todayDate, yesterdayDate, dates3to9])

  const fetchData = useCallback(async (page: number = 0, reset: boolean = false) => {
    if (page === 0) setLoading(true); else setLoadingMore(true)
    
    // When uploadDateFilter is active, we need to fetch all matching videos to include reuploads
    // This is more accurate but uses more bandwidth - only when user clicks a stat card
    const isUploadDateFilterActive = uploadDateFilter !== '' || customUploadDateFilter !== ''
    // When shopee week filter is active, we need to fetch all videos to filter client-side
    const isShopeeWeekFilterActive = shopeeWeekFilter || shopeeWeekDateRange !== null
    
    let vR
    if (isUploadDateFilterActive && page === 0) {
      // For range-3-9, we need to fetch videos using in() for each platform
      if (uploadDateFilter === 'range-3-9') {
        // Fetch all video IDs for the date range
        const allIds: string[] = []
        for (const p of platforms) {
          const { data } = await supabase.from('videos').select('id')
            .in(`${p.key}_upload_date`, dates3to9)
          if (data) allIds.push(...data.map((v: any) => v.id))
        }
        const uniqueIds = [...new Set(allIds)]
        // Fetch full video data
        const { data: vData } = await supabase.from('videos').select('*').in('id', uniqueIds)
        vR = { data: vData || [] }
      } else {
        // Fetch all matching videos (no pagination) for accurate upload date filter
        vR = await buildFilteredQuery(0, false)
      }
    } else if (isShopeeWeekFilterActive && page === 0) {
      // Fetch all videos for shopee week filter - we'll filter client-side
      // This ensures videos with shopee_upload_date but no shopee_url are included
      const { data: allVideos } = await supabase.from('videos').select('*').order('created_at', { ascending: false })
      vR = { data: allVideos || [] }
    } else {
      vR = await buildFilteredQuery(page)
    }
    
    const rR = await supabase.from('reuploads').select('*')
    
    // If upload date filter is active, we need to also fetch videos that have reuploads on that date
    // but no platform upload_date set
    let vData = (vR.data as Video[]) || []
    if (isUploadDateFilterActive && page === 0) {
      const rData = (rR.data as Reupload[]) || []
      let targetDate: string | null = null
      let targetDates: string[] | null = null
      if (uploadDateFilter === 'today') targetDate = todayDate
      else if (uploadDateFilter === 'yesterday') targetDate = yesterdayDate
      else if (uploadDateFilter === 'range-3-9') targetDates = dates3to9
      else if (customUploadDateFilter) targetDate = customUploadDateFilter
      
      if (targetDate) {
        // Get video IDs from reuploads on target date
        const reuploadVideoIds = [...new Set(rData.filter(r => r.upload_date === targetDate).map(r => r.video_id))]
        // Fetch videos that have reuploads but no platform upload_date
        if (reuploadVideoIds.length > 0) {
          const { data: reuploadVideos } = await supabase.from('videos').select('id, title, description, created_at, youtube_url, youtube_upload_date, facebook_url, facebook_upload_date, instagram_url, instagram_upload_date, shopee_url, shopee_upload_date, shopee_product_url, threads_url, threads_upload_date, tiktok_url, tiktok_upload_date, tiktok_product_url')
            .in('id', reuploadVideoIds)
          if (reuploadVideos) {
            // Merge with existing videos, avoiding duplicates
            const existingIds = new Set(vData.map(v => v.id))
            vData = [...vData, ...reuploadVideos.filter((v: any) => !existingIds.has(v.id))]
          }
        }
      } else if (targetDates) {
        // For range-3-9, get video IDs from reuploads on any date in range
        const reuploadVideoIds = [...new Set(rData.filter(r => targetDates!.includes(r.upload_date || '')).map(r => r.video_id))]
        // Fetch videos that have reuploads but no platform upload_date
        if (reuploadVideoIds.length > 0) {
          const { data: reuploadVideos } = await supabase.from('videos').select('id, title, description, created_at, youtube_url, youtube_upload_date, facebook_url, facebook_upload_date, instagram_url, instagram_upload_date, shopee_url, shopee_upload_date, shopee_product_url, threads_url, threads_upload_date, tiktok_url, tiktok_upload_date, tiktok_product_url')
            .in('id', reuploadVideoIds)
          if (reuploadVideos) {
            // Merge with existing videos, avoiding duplicates
            const existingIds = new Set(vData.map(v => v.id))
            vData = [...vData, ...reuploadVideos.filter((v: any) => !existingIds.has(v.id))]
          }
        }
      }
    }
    
    if (isUploadDateFilterActive || isShopeeWeekFilterActive) {
      // For upload date filter or shopee week filter, use all results
      setVideos(vData)
      setHasMore(false) // No pagination when filtering
    } else if (reset || page === 0) {
      setVideos((vR.data as Video[]) || [])
    } else {
      setVideos(prev => [...prev, ...((vR.data as Video[]) || [])])
      setHasMore((vR.data?.length || 0) === ITEMS_PER_PAGE)
    }
    
    setReuploads((rR.data as Reupload[]) || [])
    setLoading(false); setLoadingMore(false); fetchStats()
  }, [buildFilteredQuery, fetchStats, uploadDateFilter, customUploadDateFilter, todayDate, yesterdayDate, dates3to9, shopeeWeekFilter, shopeeWeekDateRange])

  // Fetch bookmarks for current user
  const fetchBookmarks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setBookmarkedVideoIds(new Set())
      return
    }
    const { data } = await supabase.from('bookmarks').select('video_id').eq('user_id', user.id)
    if (data) {
      setBookmarkedVideoIds(new Set(data.map((b: any) => b.video_id)))
    }
  }, [])

  // Effect to trigger fetch when filters change
  // Note: shopeeWeekFilter and shopeeWeekDateRange are handled separately in onClick to avoid unnecessary re-fetch
  // Note: uploadDateFilter unselect is also handled in handleStatCardClick to avoid unnecessary re-fetch
  useEffect(() => {
    // Don't reset if bookmark filter is active - it has its own fetch logic
    if (showBookmarkedOnly) return
    // Skip fetch if this is an unselect operation (uploadDateFilter changed from value to '')
    // The unselect is handled in handleStatCardClick which just resets the filter without fetching
    if (prevUploadDateFilterRef.current !== '' && uploadDateFilter === '') {
      prevUploadDateFilterRef.current = uploadDateFilter
      return
    }
    prevUploadDateFilterRef.current = uploadDateFilter
    setCurrentPage(0); setVideos([]); setHasMore(true); fetchData(0, true)
  }, [activeSearchQuery, dateFilter, customUploadDateFilter, filterEmptyPlatform, platformFilter, uploadDateFilter, fetchData, showBookmarkedOnly])

  // Fetch data on initial mount (only if no search query from location state)
  useEffect(() => {
    // Check if there's a search query from location state
    const state = location.state as any
    if (!state?.searchQuery) {
      fetchData(0, true)
    }
  }, [location.key, fetchData])

  // Fetch bookmarks on mount
  useEffect(() => {
    fetchBookmarks()
  }, [fetchBookmarks])

  // Fetch creator stats - original uploads only (no reuploads)
  const fetchCreatorStats = useCallback(async () => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    
    // Get current week range
    const { monday, sunday, weekDates } = getCurrentWeekRange()
    const weekNumber = getISOWeekNumber(monday)
    const { start, end } = formatWeekRange(monday, sunday)
    
    // Count shopee uploads in current week (original uploads only)
    const { count: shopeeCount } = await supabase.from('videos')
      .select('*', { count: 'exact', head: true })
      .gte('shopee_upload_date', weekDates[0])
      .lte('shopee_upload_date', weekDates[6])
    
    // Platform breakdown for current week
    const platformBreakdown = await Promise.all(platforms.map(async (p) => {
      const { count } = await supabase.from('videos')
        .select('*', { count: 'exact', head: true })
        .gte(`${p.key}_upload_date`, weekDates[0])
        .lte(`${p.key}_upload_date`, weekDates[6])
      return { key: p.key, original: count || 0, reupload: 0 }
    }))
    
    setCreatorStats({
      weekNumber,
      shopeeCount: shopeeCount || 0,
      target: 20,
      weekStart: start,
      weekEnd: end,
      platformBreakdown
    })
    
    // Fetch last 5 weeks history
    const historyPromises = []
    for (let i = 1; i <= 5; i++) {
      const pastMonday = new Date(monday)
      pastMonday.setDate(monday.getDate() - (i * 7))
      const pastSunday = new Date(pastMonday)
      pastSunday.setDate(pastMonday.getDate() + 6)
      
      const pastWeekDates: string[] = []
      for (let j = 0; j < 7; j++) {
        const d = new Date(pastMonday)
        d.setDate(pastMonday.getDate() + j)
        pastWeekDates.push(formatter.format(d))
      }
      
      const pastWeekNumber = getISOWeekNumber(pastMonday)
      
      // Count shopee uploads for this past week
      const { count: pastShopeeCount } = await supabase.from('videos')
        .select('*', { count: 'exact', head: true })
        .gte('shopee_upload_date', pastWeekDates[0])
        .lte('shopee_upload_date', pastWeekDates[6])
      
      // Platform breakdown for this week
      const pastPlatformBreakdown = await Promise.all(platforms.map(async (p) => {
        const { count } = await supabase.from('videos')
          .select('*', { count: 'exact', head: true })
          .gte(`${p.key}_upload_date`, pastWeekDates[0])
          .lte(`${p.key}_upload_date`, pastWeekDates[6])
        return { key: p.key, original: count || 0, reupload: 0 }
      }))
      
      historyPromises.push({
        weekNumber: pastWeekNumber,
        shopeeCount: pastShopeeCount || 0,
        dates: pastWeekDates,
        platformBreakdown: pastPlatformBreakdown
      })
    }
    
    const history = await Promise.all(historyPromises)
    setWeeklyHistory(history)
  }, [])

  // Fetch creator stats on mount
  useEffect(() => {
    fetchCreatorStats()
  }, [fetchCreatorStats])

  // Fetch bookmarked videos when bookmark filter is active
  useEffect(() => {
    if (showBookmarkedOnly) {
      const loadBookmarkedVideos = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }
        const { data: bookmarkData } = await supabase.from('bookmarks').select('video_id').eq('user_id', user.id)
        if (bookmarkData && bookmarkData.length > 0) {
          const videoIds = bookmarkData.map((b: any) => b.video_id)
          const { data: videoData } = await supabase.from('videos').select('*').in('id', videoIds)
          setVideos((videoData as Video[]) || [])
        } else {
          setVideos([])
        }
        setHasMore(false)
        setLoading(false)
      }
      loadBookmarkedVideos()
    }
  }, [showBookmarkedOnly])

  const handleLoadMore = () => { const np = currentPage + 1; setCurrentPage(np); fetchData(np, false) }

  const handleAddVideo = async () => {
    if (!title) return
    const { error } = await supabase.from('videos').insert({ title, description, youtube_url: youtubeUrl || null, youtube_upload_date: youtubeUploadDate, facebook_url: facebookUrl || null, facebook_upload_date: facebookUploadDate, instagram_url: instagramUrl || null, instagram_upload_date: instagramUploadDate, shopee_url: shopeeUrl || null, shopee_upload_date: shopeeUploadDate, shopee_product_url: shopeeProductUrl || null, threads_url: threadsUrl || null, threads_upload_date: threadsUploadDate, tiktok_url: tiktokUrl || null, tiktok_upload_date: tiktokUploadDate, tiktok_product_url: tiktokProductUrl || null })
    if (!error) { setOpen(false); resetForm(); fetchData(0, true) }
  }

  const handleUpdateVideo = async () => {
    if (!editingVideo) return
    const u: any = { title, description, youtube_url: youtubeUrl || null, youtube_upload_date: youtubeUploadDate, facebook_url: facebookUrl || null, facebook_upload_date: facebookUploadDate, instagram_url: instagramUrl || null, instagram_upload_date: instagramUploadDate, shopee_url: shopeeUrl || null, shopee_upload_date: shopeeUploadDate, shopee_product_url: shopeeProductUrl || null, threads_url: threadsUrl || null, threads_upload_date: threadsUploadDate, tiktok_url: tiktokUrl || null, tiktok_upload_date: tiktokUploadDate, tiktok_product_url: tiktokProductUrl || null }
    if (createdAt) u.created_at = new Date(createdAt).toISOString()
    const { error } = await supabase.from('videos').update(u).eq('id', editingVideo.id)
    if (!error) { 
      setOpen(false); 
      setEditingVideo(null); 
      resetForm(); 
      // If bookmark filter is active, fetch bookmarked videos; otherwise use normal fetch
      if (showBookmarkedOnly) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: bookmarkData } = await supabase.from('bookmarks').select('video_id').eq('user_id', user.id)
          if (bookmarkData && bookmarkData.length > 0) {
            const videoIds = bookmarkData.map((b: any) => b.video_id)
            const { data: videoData } = await supabase.from('videos').select('*').in('id', videoIds)
            setVideos((videoData as Video[]) || [])
          }
        }
      } else {
        fetchData(0, true)
      }
    }
  }

  const handleDeleteVideo = async (id: string) => { if (confirm('Are you sure you want to delete this video?')) { await supabase.from('videos').delete().eq('id', id); fetchData(0, true) } }

  const resetForm = () => { setTitle(''); setDescription(''); setCreatedAt(''); setYoutubeUrl(''); setYoutubeUploadDate(null); setFacebookUrl(''); setFacebookUploadDate(null); setInstagramUrl(''); setInstagramUploadDate(null); setShopeeUrl(''); setShopeeUploadDate(null); setShopeeProductUrl(''); setThreadsUrl(''); setThreadsUploadDate(null); setTiktokUrl(''); setTiktokUploadDate(null); setTiktokProductUrl('') }

  const openEditDialog = (video: Video) => {
    setEditingVideo(video); setTitle(video.title); setDescription(video.description || ''); setDescriptionFocused(false)
    setCreatedAt(video.created_at ? video.created_at.split('T')[0] : '')
    setYoutubeUrl(video.youtube_url || ''); setYoutubeUploadDate(video.youtube_upload_date || null)
    setFacebookUrl(video.facebook_url || ''); setFacebookUploadDate(video.facebook_upload_date || null)
    setInstagramUrl(video.instagram_url || ''); setInstagramUploadDate(video.instagram_upload_date || null)
    setShopeeUrl(video.shopee_url || ''); setShopeeUploadDate(video.shopee_upload_date || null); setShopeeProductUrl(video.shopee_product_url || '')
    setThreadsUrl(video.threads_url || ''); setThreadsUploadDate(video.threads_upload_date || null)
    setTiktokUrl(video.tiktok_url || ''); setTiktokUploadDate(video.tiktok_upload_date || null); setTiktokProductUrl(video.tiktok_product_url || '')
    setOpen(true)
  }

  const copyToClipboard = async (text: string, platform: string) => { try { await navigator.clipboard.writeText(text); setSnackbar({ open: true, message: `${platform} URL copied to clipboard!` }) } catch { setSnackbar({ open: true, message: 'Failed to copy URL' }) } }
  const openAddDialog = () => { setEditingVideo(null); setDescriptionFocused(false); resetForm(); setOpen(true) }
  const openReuploadDialog = (platform: string) => { setReuploadPlatform(platform); setReuploadUrl(''); setReuploadUploadDate(todayDate); setReuploadNotes(''); setReuploadDialogOpen(true) }

  const handleSaveReupload = async () => {
    if (!editingVideo) return
    const { error } = await supabase.from('reuploads').insert({ video_id: editingVideo.id, platform: reuploadPlatform, url: reuploadUrl || null, upload_date: reuploadUploadDate || null, notes: reuploadNotes || null })
    if (!error) {
      setReuploadDialogOpen(false)
      setOpen(false)
      setEditingVideo(null)
      resetForm()
      setSnackbar({ open: true, message: 'Reupload saved successfully!' })
      // If bookmark filter is active, fetch bookmarked videos; otherwise use normal fetch
      if (showBookmarkedOnly) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: bookmarkData } = await supabase.from('bookmarks').select('video_id').eq('user_id', user.id)
          if (bookmarkData && bookmarkData.length > 0) {
            const videoIds = bookmarkData.map((b: any) => b.video_id)
            const { data: videoData } = await supabase.from('videos').select('*').in('id', videoIds)
            setVideos((videoData as Video[]) || [])
          }
        }
      } else {
        fetchData(0, true)
      }
    } else {
      console.error('Reupload error:', error)
      setSnackbar({ open: true, message: `Failed: ${error.message || 'Unknown error'}` })
    }
  }

  const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null
    const patterns = [/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/, /youtube\.com\/watch\?.*v=([^&\n?#]+)/]
    for (const p of patterns) { const m = url.match(p); if (m) return m[1] }
    return null
  }
  const getAvailablePlatforms = (video: Video) => platforms.filter(p => !!(video[`${p.key}_url` as keyof Video] as string | null))
  const openVideoPlayer = (url: string) => { setSelectedVideoUrl(url); setVideoPlayerOpen(true); setVideoLoading(true) }
  const openUploadInfo = (video: Video) => { setSelectedVideoForInfo(video); setUploadInfoOpen(true) }
  const isMobileDevice = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const searchGoogleDriveLatest = (t: string) => { const f = '1-1cXk5CecrMqVFN0krVA3JUf-SrCJejY'; window.open(`https://drive.google.com/drive/u/0/search?q=${isMobileDevice() ? encodeURIComponent(t) : encodeURIComponent(`${t} parent:${f}`)}`, '_blank') }
  const searchGoogleDriveArchive = (t: string) => { const f = '1DYoHgOxk3UAB6FQgWgbUhbgx9Xg74vDR'; window.open(`https://drive.google.com/drive/u/0/search?q=${isMobileDevice() ? encodeURIComponent(t) : encodeURIComponent(`${t} parent:${f}`)}`, '_blank') }
  const searchGoogleDriveAll = (t: string) => window.open(`https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(t)}`, '_blank')
  const handleVideoLoad = () => setVideoLoading(false)

  const isPlatformDateMatch = (pk: string, v: Video): boolean => {
    const ud = v[`${pk}_upload_date` as keyof Video] as string | null; if (!ud) return false
    if (uploadDateFilter === 'today') return ud === todayDate; if (uploadDateFilter === 'yesterday') return ud === yesterdayDate
    if (uploadDateFilter === 'range-3-9') return dates3to9.includes(ud); if (customUploadDateFilter) return ud === customUploadDateFilter
    return false
  }

  const isPlatformReuploadMatch = (pk: string, vid: string): boolean => {
    let td: string | null = null
    if (uploadDateFilter === 'today') td = todayDate; else if (uploadDateFilter === 'yesterday') td = yesterdayDate
    else if (uploadDateFilter === 'range-3-9') return dates3to9.some(d => reuploads.some(r => r.video_id === vid && r.platform === pk && r.upload_date === d))
    else if (customUploadDateFilter) td = customUploadDateFilter
    if (!td) return false; return reuploads.some(r => r.video_id === vid && r.platform === pk && r.upload_date === td)
  }

  const hasReuploadForVideoOnDate = (vid: string, d: string) => reuploads.some(r => r.video_id === vid && r.upload_date === d)
  const hasReuploadForVideoOnAnyDateInRange = (vid: string, ds: string[]) => ds.some(d => reuploads.some(r => r.video_id === vid && r.upload_date === d))
  const hasUploadOnDate = (v: Video, d: string) => platforms.some(p => (v[`${p.key}_upload_date` as keyof Video] as string | null) === d)
  const hasUploadOnAnyDateInRange = (v: Video, ds: string[]) => platforms.some(p => { const ud = v[`${p.key}_upload_date` as keyof Video] as string | null; return ud && ds.includes(ud) })

  // Toggle bookmark for a video
  const toggleBookmark = async (videoId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSnackbar({ open: true, message: 'Please login to bookmark videos' })
      return
    }
    
    const isBookmarked = bookmarkedVideoIds.has(videoId)
    
    if (isBookmarked) {
      // Remove bookmark
      const { error } = await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('video_id', videoId)
      if (!error) {
        setBookmarkedVideoIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(videoId)
          return newSet
        })
        setSnackbar({ open: true, message: 'Bookmark removed' })
      }
    } else {
      // Add bookmark
      const { error } = await supabase.from('bookmarks').insert({ user_id: user.id, video_id: videoId })
      if (!error) {
        setBookmarkedVideoIds(prev => new Set(prev).add(videoId))
        setSnackbar({ open: true, message: 'Video bookmarked!' })
      }
    }
  }

  // Apply bookmark filter first (standalone filter)
  const bookmarkFilteredVideos = useMemo(() => {
    if (showBookmarkedOnly) {
      return videos.filter(v => bookmarkedVideoIds.has(v.id))
    }
    return videos
  }, [videos, showBookmarkedOnly, bookmarkedVideoIds])

  // Helper: Check if video has shopee upload in current week
// Helper: Check if video has shopee upload in a specific date range
const hasShopeeUploadInDateRange = (v: Video, dates: string[]) => {
  const shopeeDate = v.shopee_upload_date
  return shopeeDate && dates.includes(shopeeDate)
}

const hasShopeeUploadInCurrentWeek = (v: Video) => {
  const { weekDates } = getCurrentWeekRange()
  return hasShopeeUploadInDateRange(v, weekDates)
}

const filteredVideos = useMemo(() => {
    // If there's an active search query, videos are already filtered by buildFilteredQuery
    // Only apply client-side filtering for upload date filters
    if (activeSearchQuery) return bookmarkFilteredVideos
    return bookmarkFilteredVideos.filter(v => {
      const m = uploadDateFilter === '' || (uploadDateFilter === 'today' ? hasUploadOnDate(v, todayDate) || hasReuploadForVideoOnDate(v.id, todayDate) : uploadDateFilter === 'yesterday' ? hasUploadOnDate(v, yesterdayDate) || hasReuploadForVideoOnDate(v.id, yesterdayDate) : uploadDateFilter === 'range-3-9' ? hasUploadOnAnyDateInRange(v, dates3to9) || hasReuploadForVideoOnAnyDateInRange(v.id, dates3to9) : true)
      const mc = customUploadDateFilter === '' || hasUploadOnDate(v, customUploadDateFilter) || hasReuploadForVideoOnDate(v.id, customUploadDateFilter)
      // Special case: shopee week filter (current week or specific date range)
      const sw = !shopeeWeekFilter && !shopeeWeekDateRange ? true : 
                 shopeeWeekDateRange ? hasShopeeUploadInDateRange(v, shopeeWeekDateRange) :
                 hasShopeeUploadInCurrentWeek(v)
      return m && mc && sw
    })
  }, [bookmarkFilteredVideos, uploadDateFilter, customUploadDateFilter, todayDate, yesterdayDate, dates3to9, reuploads, activeSearchQuery, shopeeWeekFilter, shopeeWeekDateRange])

// Original Creator Card Component
const OriginalCreatorCard = () => {
  const progressPercent = Math.min((creatorStats.shopeeCount / creatorStats.target) * 100, 100)
  const isReached = creatorStats.shopeeCount >= creatorStats.target
  
  const getProgressColor = () => {
    if (creatorStats.shopeeCount >= creatorStats.target) return '#4caf50'
    if (creatorStats.shopeeCount >= 15) return '#66bb6a'
    if (creatorStats.shopeeCount >= 10) return '#ff9800'
    return '#ef5350'
  }
  
  const getStatusText = () => {
    if (isReached) return { text: 'Target Reached', color: 'success' }
    const remaining = creatorStats.target - creatorStats.shopeeCount
    return { text: `${remaining} more needed`, color: 'warning' }
  }
  
  const status = getStatusText()
  
  return (
    <Card 
      sx={{ 
        bgcolor: 'background.paper', 
        cursor: 'pointer', 
        transition: 'all 0.2s ease',
        border: (shopeeWeekFilter || shopeeWeekDateRange !== null) ? '1px solid' : '1px solid #f0f0f0',
        borderColor: (shopeeWeekFilter || shopeeWeekDateRange !== null) ? 'primary.main' : '#f0f0f0',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
      }}
      onClick={() => {
        // Toggle filter - if already active, clear it
        if (shopeeWeekFilter) {
          setShopeeWeekFilter(false)
          setShopeeWeekDateRange(null)
          // Don't need to fetch again - just reset filter, data is already loaded
        } else {
          // Filter to show shopee videos in current week
          // Don't set platformFilter - we want to show videos with shopee_upload_date even if shopee_url is empty
          setUploadDateFilter('')
          setCustomUploadDateFilter('')
          setSearchQuery('')
          setActiveSearchQuery('')
          setDateFilter('')
          setFilterEmptyPlatform(null)
          setShopeeWeekFilter(true)
          setShopeeWeekDateRange(null)
        }
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        {/* Duration Badge */}
        <Box sx={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: 0.5,
          px: 1, 
          py: 0.25,
          bgcolor: '#f3e5f5',
          borderRadius: 10,
          fontSize: 11,
          fontWeight: 600,
          color: '#7c4dff',
          mb: 1
        }}>
          <Box sx={{ 
            bgcolor: '#7c4dff', 
            color: 'white', 
            borderRadius: '50%',
            width: 16,
            height: 16,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10
          }}>W</Box>
          Week {creatorStats.weekNumber}
          <Typography component="span" sx={{ color: '#999', fontWeight: 400 }}>|</Typography>
          Repeat weekly
        </Box>
        
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Shop sx={{ fontSize: 18, color: '#EE4D2D' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Original Creator
            </Typography>
          </Box>
          <Chip
            label={isReached ? "✓ Target Reached" : "⏳ In Progress"}
            size="small"
            sx={{
              height: 20,
              fontSize: 11,
              bgcolor: isReached ? '#e8f5e9' : '#fff3e0',
              color: isReached ? '#2e7d32' : '#e65100',
              fontWeight: 600
            }}
          />
        </Box>
        
        {/* Duration Text */}
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
          Wed, {creatorStats.weekStart} 12:00am – Tue, {creatorStats.weekEnd} 11:59pm
        </Typography>
        
        {/* Progress Section */}
        <Box sx={{ bgcolor: '#f9f9f9', borderRadius: 1, p: 1.5, mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Shopee Videos
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16 }}>
              <Typography component="span" sx={{ color: 'text.primary' }}>{creatorStats.shopeeCount}</Typography>
              <Typography component="span" sx={{ color: '#999', fontWeight: 400 }}> / </Typography>
              <Typography component="span" sx={{ color: '#7c4dff' }}>{creatorStats.target}</Typography>
            </Typography>
          </Box>
          
          {/* Progress Bar */}
          <Box sx={{ width: '100%', height: 8, bgcolor: '#e0e0e0', borderRadius: 1, overflow: 'hidden', mb: 1 }}>
            <Box sx={{ 
              width: `${progressPercent}%`, 
              height: '100%', 
              bgcolor: getProgressColor(),
              transition: 'width 0.5s ease'
            }} />
          </Box>
          
          {/* Status */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
              {isReached ? 'Target achieved 🎉' : <><strong>{creatorStats.target - creatorStats.shopeeCount}</strong> more needed</>}
            </Typography>
            <Typography variant="caption" sx={{ 
              fontSize: 11, 
              fontWeight: 600,
              color: isReached ? '#2e7d32' : '#e65100'
            }}>
              {status.text}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

// Weekly History Dialog Component
const WeeklyHistoryDialog = () => {
  const getProgressColor = (count: number) => {
    if (count >= 20) return '#4caf50'
    if (count >= 15) return '#66bb6a'
    if (count >= 10) return '#ff9800'
    return '#ef5350'
  }
  
  return (
    <Dialog open={weeklyHistoryOpen} onClose={() => setWeeklyHistoryOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Weekly History (Last 5 Weeks)</Typography>
          <IconButton onClick={() => setWeeklyHistoryOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {weeklyHistory.map((week, index) => (
            <Box 
              key={index} 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5,
                py: 1,
                borderBottom: index < weeklyHistory.length - 1 ? '1px solid #eee' : 'none',
                cursor: 'pointer',
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
              onClick={() => {
                // Filter to show shopee videos for this specific week
                setPlatformFilter('')
                setUploadDateFilter('')
                setCustomUploadDateFilter('')
                setSearchQuery('')
                setActiveSearchQuery('')
                setDateFilter('')
                setFilterEmptyPlatform(null)
                setShopeeWeekFilter(false)
                setShopeeWeekDateRange(week.dates)
                setWeeklyHistoryOpen(false)
              }}
            >
              <Box sx={{ width: 40, flexShrink: 0 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>W{week.weekNumber}</Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {week.dates[0]} - {week.dates[6]}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {week.shopeeCount} / 20
                  </Typography>
                </Box>
                <Box sx={{ width: '100%', height: 6, bgcolor: '#e0e0e0', borderRadius: 1, overflow: 'hidden' }}>
                  <Box sx={{ 
                    width: `${Math.min((week.shopeeCount / 20) * 100, 100)}%`, 
                    height: '100%', 
                    bgcolor: getProgressColor(week.shopeeCount)
                  }} />
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </DialogContent>
    </Dialog>
  )
}

const displayedVideos = filteredVideos

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box><Typography variant="h4" sx={{ fontWeight: 700 }}>Videos</Typography><Typography variant="body2" color="text.secondary">Track video uploads across platforms with quick search and smart filters.</Typography></Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<ReplayIcon />} onClick={() => {
            localStorage.removeItem(`stats_${getTodayDate()}`)
            fetchStats()
          }} size="medium">Refresh Stats</Button>
          <Button variant="contained" startIcon={<Add />} onClick={openAddDialog} size="medium">Add Video</Button>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 2, mb: 2 }}>
        <StatCard filterKey="today" title="Total videos uploaded today" videoCount={todayStats.videoCount} platformUploadCount={todayStats.platformBreakdown.reduce((t, p) => t + p.original + p.reupload, 0)} uploadDateFilter={uploadDateFilter} onFilterClick={handleStatCardClick} platformBreakdown={todayStats.platformBreakdown} />
        <StatCard filterKey="yesterday" title="Total videos uploaded yesterday" videoCount={yesterdayStats.videoCount} platformUploadCount={yesterdayStats.platformBreakdown.reduce((t, p) => t + p.original + p.reupload, 0)} uploadDateFilter={uploadDateFilter} onFilterClick={handleStatCardClick} platformBreakdown={yesterdayStats.platformBreakdown} />
        <StatCard filterKey="range-3-9" title="Days 3-9 uploads" videoCount={range3to9Stats.videoCount} platformUploadCount={range3to9Stats.platformBreakdown.reduce((t, p) => t + p.original + p.reupload, 0)} uploadDateFilter={uploadDateFilter} onFilterClick={handleStatCardClick} platformBreakdown={range3to9Stats.platformBreakdown} />
        <OriginalCreatorCard />
      </Box>
      
      {/* Past Campaign Card - small card below Original Creator */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 2, mb: 2 }}>
        <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1', md: '4 / -1' } }}>
          <Card 
            sx={{ 
              bgcolor: 'background.paper', 
              cursor: 'pointer', 
              transition: 'all 0.2s ease',
              border: '1px solid #f0f0f0',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
            }}
            onClick={() => setWeeklyHistoryOpen(true)}
          >
            <CardContent sx={{ p: 1.5 }}>
              <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', letterSpacing: 0.5 }}>
                Past Campaign
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <Shop sx={{ fontSize: 14, color: '#EE4D2D' }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  View History
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, mb: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <Box sx={{ flex: 1, minWidth: 200, position: 'relative', display: 'flex', gap: 1 }}>
          <SearchIcon sx={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'text.secondary', fontSize: 20, zIndex: 1 }} />
          <TextField 
            inputRef={searchInputRef} 
            size="small" 
            placeholder="Search videos..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            sx={{ width: '100%', '& .MuiOutlinedInput-root': { pl: 4 } }} 
          />
          {searchQuery && (
            <Button 
              variant="contained" 
              size="small" 
              onClick={handleSearch}
              sx={{ minWidth: 80 }}
            >
              Search
            </Button>
          )}
        </Box>
        <TextField size="small" label="Date" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} sx={{ minWidth: { xs: '100%', sm: 160 } }} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" label="Upload Date" type="date" value={customUploadDateFilter} onChange={(e) => setCustomUploadDateFilter(e.target.value)} sx={{ minWidth: { xs: '100%', sm: 160 } }} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} sx={{ minWidth: { xs: '100%', sm: 150 } }} slotProps={{ select: { native: true, displayEmpty: true } }}>
          <option value="">Platform</option>
          {platforms.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </TextField>
        <Chip 
          label="Bookmarked" 
          size="small" 
          onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
          color={showBookmarkedOnly ? 'primary' : 'default'}
          variant={showBookmarkedOnly ? 'filled' : 'outlined'}
          sx={{ cursor: 'pointer', height: 36 }}
        />
        {(searchQuery || dateFilter || customUploadDateFilter || filterEmptyPlatform || platformFilter || uploadDateFilter || showBookmarkedOnly || shopeeWeekFilter || shopeeWeekDateRange) && (
          <Button variant="outlined" size="small" onClick={() => { setSearchQuery(''); setActiveSearchQuery(''); setDateFilter(''); setCustomUploadDateFilter(''); setFilterEmptyPlatform(null); setPlatformFilter(''); setUploadDateFilter(''); setShowBookmarkedOnly(false); setShopeeWeekFilter(false); setShopeeWeekDateRange(null) }} startIcon={<CloseIcon />}>Clear</Button>
        )}
      </Box>

      {filterEmptyPlatform && <Alert severity="info" sx={{ mb: 2 }}>Showing videos without {filterEmptyPlatform} URL</Alert>}
      {showBookmarkedOnly && <Alert severity="info" sx={{ mb: 2 }}>Showing only bookmarked videos</Alert>}
      {shopeeWeekFilter && <Alert severity="info" sx={{ mb: 2 }}>Showing Shopee videos uploaded this week (Wed-Tue)</Alert>}
      {shopeeWeekDateRange && <Alert severity="info" sx={{ mb: 2 }}>Showing Shopee videos for selected week</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}><CircularProgress /></Box>
      ) : displayedVideos.length === 0 ? (
        <Typography color="text.secondary" align="center" sx={{ py: 6 }}>{showBookmarkedOnly ? 'No bookmarked videos found. Click the bookmark icon on videos to bookmark them.' : searchQuery || dateFilter ? 'No videos found matching your criteria' : 'No videos yet. Click "Add Video" to create one!'}</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {displayedVideos.map((video) => {
            const videoId = video.youtube_url ? getYouTubeVideoId(video.youtube_url) : null
            return (
              <Card key={video.id}>
                <CardContent sx={{ py: 2, px: { xs: 2, md: 2.5 } }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    {videoId ? (
                      <Box component="img" src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} alt={video.title} onClick={() => openVideoPlayer(video.youtube_url!)}
                        onError={(e) => { const t = e.target as HTMLImageElement; if (t.src.includes('mqdefault')) t.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`; else if (t.src.includes('hqdefault')) t.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`; else t.style.display = 'none' }}
                        sx={{ width: 120, height: 160, objectFit: 'cover', borderRadius: 1, cursor: 'pointer', flexShrink: 0, '&:hover': { opacity: 0.8 } }} />
                    ) : (
                      <Box sx={{ width: 120, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1, bgcolor: 'grey.200', flexShrink: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>No Video</Typography>
                      </Box>
                    )}
                    <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', flex: 1 }}>{video.title}</Typography>
                        {video.description && (<IconButton size="small" onClick={() => { setSelectedDescription(video.description || ''); setSelectedDescriptionVideo(video); setDescriptionOpen(true) }} sx={{ p: 0.5 }} title="View description"><Info fontSize="small" /></IconButton>)}
                        <IconButton 
                          size="small" 
                          onClick={() => toggleBookmark(video.id)} 
                          sx={{ p: 0.5, color: bookmarkedVideoIds.has(video.id) ? 'primary.main' : 'text.secondary' }} 
                          title={bookmarkedVideoIds.has(video.id) ? 'Remove bookmark' : 'Bookmark this video'}
                        >
                          {bookmarkedVideoIds.has(video.id) ? <Bookmark fontSize="small" /> : <BookmarkBorder fontSize="small" />}
                        </IconButton>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>{new Date(video.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>Platforms</Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, auto)' }, gap: 0.5, mb: 1.5, width: '100%' }}>
                            {platforms.map((p) => {
                              const has = !!video[`${p.key}_url` as keyof Video]; const ic = platformIcons[p.key]; const dm = isPlatformDateMatch(p.key, video); const rm = isPlatformReuploadMatch(p.key, video.id)
                              return (<Chip key={p.key} icon={ic || undefined} label={p.label} size="small" onClick={() => has && copyToClipboard(video[`${p.key}_url` as keyof Video] as string, p.label)}
                                sx={{ cursor: has ? 'pointer' : 'default', opacity: has ? 1 : 0.4, fontWeight: 500, fontSize: 12, height: 28, '&:hover': has ? { opacity: 0.8 } : {}, '& .MuiChip-icon': { fontSize: 16 }, ...(dm && !rm && { border: '1px solid', borderColor: '#81c784' }), ...(rm && { border: '1px solid', borderColor: '#ffb74d', color: '#ff9800', '& .MuiChip-icon': { color: '#ff9800', fontSize: 16 } }) }}
                                variant={has ? 'filled' : 'outlined'} color={has ? 'default' : 'default'} />)
                            })}
                          </Box>
                          <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>Google Drive</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                            {isMobileDevice() ? (<Chip icon={<GoogleDriveIcon />} label="Drive" size="small" onClick={() => searchGoogleDriveAll(video.title)} sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 }, height: 28 }} title="Search in Google Drive" />)
                              : (<><Chip icon={<GoogleDriveIcon />} label="Drive" size="small" onClick={() => searchGoogleDriveLatest(video.title)} sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 }, height: 28 }} title="Latest" /><Chip icon={<GoogleDriveIcon />} label="Arc" size="small" onClick={() => searchGoogleDriveArchive(video.title)} sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 }, height: 28 }} title="Archive" /></>)}
                          </Box>
                          {(video.tiktok_product_url || video.shopee_product_url) && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.25 }}>
                              {video.tiktok_product_url && <Chip icon={<TikTokIcon />} label="TikTok Shop" size="small" onClick={() => copyToClipboard(video.tiktok_product_url!, 'TikTok Shop')} sx={{ cursor: 'pointer', bgcolor: '#000', color: 'white', '&:hover': { bgcolor: '#333' }, height: 28 }} />}
                              {video.shopee_product_url && <Chip icon={<Shop />} label="Shopee" size="small" onClick={() => copyToClipboard(video.shopee_product_url!, 'Shopee')} sx={{ cursor: 'pointer', bgcolor: '#EE4D2D', color: 'white', '&:hover': { bgcolor: '#D43D1F' }, height: 28 }} />}
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flexShrink: 0 }}>
                          <IconButton size="small" onClick={() => openUploadInfo(video)} title="Upload Info"><Upload fontSize="small" /></IconButton>
                          <IconButton size="small" onClick={() => openEditDialog(video)} title="Edit"><Edit fontSize="small" /></IconButton>
                          <IconButton size="small" onClick={() => handleDeleteVideo(video.id)} title="Delete"><Delete fontSize="small" /></IconButton>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )
          })}
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            {loadingMore ? (<CircularProgress size={28} />) : hasMore ? (<Button variant="outlined" onClick={handleLoadMore} startIcon={<ReplayIcon />} size="medium">Load More</Button>) : videos.length >= ITEMS_PER_PAGE ? (<Typography color="text.secondary" variant="body2">All videos loaded</Typography>) : null}
          </Box>
        </Box>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ pb: 1 }}><Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">{editingVideo ? 'Edit Video' : 'Add Video'}</Typography>
          {isMobile && <IconButton onClick={() => setOpen(false)} size="small"><CloseIcon /></IconButton>}</Box></DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth margin="normal" required size={isMobile ? 'small' : 'medium'} />
          <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth margin="normal" multiline
            minRows={isMobile ? (descriptionFocused ? undefined : 3) : 6} maxRows={isMobile ? (descriptionFocused ? undefined : 3) : undefined}
            size={isMobile ? 'small' : 'medium'} onFocus={() => isMobile && setDescriptionFocused(true)} onBlur={() => isMobile && setDescriptionFocused(false)}
            sx={isMobile && descriptionFocused ? { '& .MuiInputBase-root': { minHeight: '75vh', alignItems: 'flex-start' } } : {}} />
          {editingVideo && <TextField label="Created At" type="date" value={createdAt} onChange={(e) => setCreatedAt(e.target.value)} fullWidth margin="normal" size={isMobile ? 'small' : 'medium'} slotProps={{ inputLabel: { shrink: true } }} />}
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>Platform Links</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {(['tiktok', 'youtube', 'facebook', 'instagram', 'shopee', 'threads'] as const).map((p) => {
              const urlVal = p === 'tiktok' ? tiktokUrl : p === 'youtube' ? youtubeUrl : p === 'facebook' ? facebookUrl : p === 'instagram' ? instagramUrl : p === 'shopee' ? shopeeUrl : threadsUrl
              const dateVal = p === 'tiktok' ? tiktokUploadDate : p === 'youtube' ? youtubeUploadDate : p === 'facebook' ? facebookUploadDate : p === 'instagram' ? instagramUploadDate : p === 'shopee' ? shopeeUploadDate : threadsUploadDate
              const setUrl = p === 'tiktok' ? setTiktokUrl : p === 'youtube' ? setYoutubeUrl : p === 'facebook' ? setFacebookUrl : p === 'instagram' ? setInstagramUrl : p === 'shopee' ? setShopeeUrl : setThreadsUrl
              const setDate = p === 'tiktok' ? setTiktokUploadDate : p === 'youtube' ? setYoutubeUploadDate : p === 'facebook' ? setFacebookUploadDate : p === 'instagram' ? setInstagramUploadDate : p === 'shopee' ? setShopeeUploadDate : setThreadsUploadDate
              return (<Box key={p} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField label="Upload Date" type="date" value={dateVal || ''} onChange={(e) => setDate(e.target.value || null)} sx={{ flex: 1 }} size="small" slotProps={{ inputLabel: { shrink: true } }} key={`${p}-date-${urlVal ? 'has-url' : 'no-url'}`} />
                <TextField label={`${p.charAt(0).toUpperCase() + p.slice(1)} URL`} value={urlVal} onChange={(e) => setUrl(e.target.value)} sx={{ flex: 2 }} size="small" placeholder="https://..." />
                {editingVideo && <IconButton size="small" onClick={() => openReuploadDialog(p)} title={`Reupload ${p}`} color="warning" sx={{ flexShrink: 0 }}><ReplayIcon fontSize="small" /></IconButton>}
              </Box>)
            })}
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Product Links</Typography>
          <TextField label="TikTok Product URL" value={tiktokProductUrl} onChange={(e) => setTiktokProductUrl(e.target.value)} fullWidth size="small" placeholder="https://..." sx={{ mb: 1.5 }} />
          <TextField label="Shopee Product URL" value={shopeeProductUrl} onChange={(e) => setShopeeProductUrl(e.target.value)} fullWidth size="small" placeholder="https://..." />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          {!isMobile && <Button onClick={() => setOpen(false)}>Cancel</Button>}
          <Button onClick={editingVideo ? handleUpdateVideo : handleAddVideo} variant="contained" fullWidth={isMobile}>{editingVideo ? 'Update' : 'Add'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={reuploadDialogOpen} onClose={() => setReuploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle><Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Reupload - {reuploadPlatform.charAt(0).toUpperCase() + reuploadPlatform.slice(1)}</Typography>
          <IconButton onClick={() => setReuploadDialogOpen(false)} size="small"><CloseIcon /></IconButton></Box></DialogTitle>
        <DialogContent><Box sx={{ mt: 1 }}>
          <TextField label="Platform" value={reuploadPlatform.charAt(0).toUpperCase() + reuploadPlatform.slice(1)} fullWidth margin="normal" size="small" disabled />
          <TextField label="URL" value={reuploadUrl} onChange={(e) => setReuploadUrl(e.target.value)} fullWidth margin="normal" size="small" placeholder="https://..." />
          <TextField label="Upload Date" type="date" value={reuploadUploadDate} onChange={(e) => setReuploadUploadDate(e.target.value)} fullWidth margin="normal" size="small" slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="Notes (optional)" value={reuploadNotes} onChange={(e) => setReuploadNotes(e.target.value)} fullWidth margin="normal" size="small" multiline rows={3} placeholder="e.g. Reupload sebab video expired" />
        </Box></DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={() => setReuploadDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveReupload} variant="contained" color="warning" startIcon={<ReplayIcon />}>Save Reupload</Button></DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>

      <Dialog open={descriptionOpen} onClose={() => setDescriptionOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle><Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>Description</span><IconButton onClick={() => setDescriptionOpen(false)} size="small"><CloseIcon /></IconButton></Box></DialogTitle>
        <DialogContent>
          {parseDescription(selectedDescription).map((s, i) => (<Box key={i} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>{s.title}</Typography>
              {s.content && <IconButton size="small" onClick={() => copyToClipboard(s.content, s.title)} title="Copy content"><CopyIcon fontSize="small" /></IconButton>}</Box>
            {s.content && <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}><Typography variant="body2" sx={{ whiteSpace: 'pre-line', fontSize: 13 }}>{s.content}</Typography></Box>}
          </Box>))}
          {(selectedDescriptionVideo?.shopee_product_url || selectedDescriptionVideo?.tiktok_product_url) && (
            <><Divider sx={{ my: 2 }} /><Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Product Links</Typography>
              {selectedDescriptionVideo?.shopee_product_url && (
                <Box sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Shop sx={{ fontSize: 18, color: '#EE4D2D' }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#EE4D2D' }}>Shopee Product URL</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => copyToClipboard(selectedDescriptionVideo.shopee_product_url!, 'Shopee Product')} title="Copy URL">
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                    <Typography variant="body2" sx={{ fontSize: 13, wordBreak: 'break-all' }}>{selectedDescriptionVideo.shopee_product_url}</Typography>
                  </Box>
                </Box>
              )}
              {selectedDescriptionVideo?.tiktok_product_url && (
                <Box sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TikTokIcon sx={{ fontSize: 18 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>TikTok Product URL</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => copyToClipboard(selectedDescriptionVideo.tiktok_product_url!, 'TikTok Product')} title="Copy URL">
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                    <Typography variant="body2" sx={{ fontSize: 13, wordBreak: 'break-all' }}>{selectedDescriptionVideo.tiktok_product_url}</Typography>
                  </Box>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        {!isMobile && <DialogActions><Button onClick={() => setDescriptionOpen(false)}>Close</Button></DialogActions>}
      </Dialog>

      <Dialog open={videoPlayerOpen} onClose={() => setVideoPlayerOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ pb: 0 }}><Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>Video Player</span><IconButton onClick={() => setVideoPlayerOpen(false)} size="small"><CloseIcon /></IconButton></Box></DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {selectedVideoUrl && getYouTubeVideoId(selectedVideoUrl) && (
            <>
              {videoLoading && <Box sx={{ width: '100%', height: isMobile ? '85vh' : '80vh', maxWidth: 450, mx: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}><CircularProgress color="primary" /></Box>}
              <Box sx={{ position: 'relative', width: '100%', height: isMobile ? '85vh' : '80vh', maxWidth: 450, mx: 'auto', overflow: 'hidden', display: videoLoading ? 'none' : 'block' }}>
                <iframe src={`https://www.youtube.com/embed/${getYouTubeVideoId(selectedVideoUrl)}?autoplay=1`} title="YouTube video player"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen onLoad={handleVideoLoad} />
              </Box>
            </>
          )}
          <Box sx={{ mt: 2, px: 2, pb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Available Platforms:</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {(() => {
                const cv = videos.find(v => v.youtube_url === selectedVideoUrl || v.facebook_url === selectedVideoUrl || v.instagram_url === selectedVideoUrl || v.tiktok_url === selectedVideoUrl || v.threads_url === selectedVideoUrl || v.shopee_url === selectedVideoUrl)
                if (!cv) return null
                return getAvailablePlatforms(cv).map(p => {
                  const u = cv[`${p.key}_url` as keyof Video] as string
                  return <Button key={p.key} href={u} target="_blank" rel="noopener noreferrer" variant={p.key === 'youtube' ? 'contained' : 'outlined'} startIcon={platformIcons[p.key] || undefined} size="small">{p.label}</Button>
                })
              })()}
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadInfoOpen} onClose={() => setUploadInfoOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle><Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>Upload Info - {selectedVideoForInfo?.title}</span><IconButton onClick={() => setUploadInfoOpen(false)} size="small"><CloseIcon /></IconButton></Box></DialogTitle>
        <DialogContent>
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table size={isMobile ? 'small' : 'medium'}>
              <TableHead><TableRow><TableCell><strong>Platform</strong></TableCell><TableCell><strong>Upload Date</strong></TableCell><TableCell><strong>URL</strong></TableCell><TableCell><strong>Reuploads</strong></TableCell></TableRow></TableHead>
              <TableBody>
                {selectedVideoForInfo && platforms.map((p) => {
                  const url = selectedVideoForInfo[`${p.key}_url` as keyof Video] as string | null
                  const ud = selectedVideoForInfo[`${p.key}_upload_date` as keyof Video] as string | null
                  const isUp = !!url
                  return (
                    <TableRow key={p.key} hover>
                      <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{platformIcons[p.key]}{p.label}</Box></TableCell>
                      <TableCell>{isUp ? (ud || '-') : <Chip label="Not Uploaded" size="small" color="warning" variant="outlined" />}</TableCell>
                      <TableCell>{isUp ? <Button href={url} target="_blank" rel="noopener noreferrer" size="small" variant="text">Open Link</Button> : <Typography color="text.secondary" variant="body2">-</Typography>}</TableCell>
                      <TableCell>
                        {(() => {
                          const vr = reuploads.filter(r => r.video_id === selectedVideoForInfo.id && r.platform === p.key)
                          if (vr.length === 0) return <Typography color="text.secondary" variant="body2">-</Typography>
                          return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>{vr.map(r => <Chip key={r.id} label={r.upload_date || 'No date'} size="small" color="warning" variant="outlined" sx={{ fontSize: 11, height: 20, fontWeight: 500 }} />)}</Box>
                        })()}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>

      <WeeklyHistoryDialog />
    </Box>
  )
}
