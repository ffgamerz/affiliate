import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import {
  Box, Typography, Card, CardContent, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, Chip, Snackbar, Alert, CircularProgress,
  useTheme, useMediaQuery,
} from '@mui/material'
import {
  Edit, Delete, Facebook, Info,
  Search as SearchIcon, Close as CloseIcon, ContentCopy as CopyIcon, Shop,
} from '@mui/icons-material'
import { supabase } from '../lib/supabase'

const GoogleDriveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 87.3 76.6" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M63.7 28.1l-11.9-6.8c-.1 0-.2-.1-.3-.1l-11.9-6.8c-.1 0-.2 0-.3.1L21.9 28c-.1.1-.2.1-.3.1L6.1 34.9c-.1 0-.2.1-.1.2v12.3c0 .1.1.2.2.2l15.6 9.1c.1 0 .2 0 .3-.1l11.9 6.8c.1 0 .2.1.3.1l11.9 6.8c.1 0 .2 0 .3-.1l11.9-6.8c.1 0-.2-.1-.3-.1l11.9-6.8c.1 0 .2 0 .3.1l15.6-9.1c.1 0 .2-.1.2-.2V35c0-.1-.1-.2-.2-.2l-15.6-9.1c-.1 0-.2-.1-.3-.1z" fill="#0066CC"/>
    <path d="M63.7 28.1L44.2 4.2c-.1-.1-.2-.1-.3 0L21.9 28c-.1.1-.2.1-.3.1-.3.1 0-.1L6.1 34.9c-.1 0-.2.1-.1.2v12.3c0 .1.1.2.2.2l15.6 9.1c.1 0 .2 0 .3-.1l11.9 6.8c.1 0 .2.1.3.1l11.9 6.8c.1 0 .2 0 .3-.1l11.9-6.8c.1 0-.2-.1-.3-.1l11.9-6.8c.1 0 .2 0 .3.1l15.6-9.1c.1 0 .2-.1.2-.2V35c0-.1-.1-.2-.2-.2l-15.6-9.1c-.1 0-.2-.1-.3-.1z" fill="#00AC47"/>
  </svg>
)

interface BolReviewRecord {
  id: string;
  created_at: string;
  upload_date: string | null;
  facebook_url: string | null;
}

interface Video {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  youtube_url: string | null;
  shopee_product_url: string | null;
  bolreview_uploads: BolReviewRecord[];
}

interface VideoRaw {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  youtube_url: string | null;
  shopee_product_url: string | null;
  bolreview_uploads: {
    id: string;
    created_at: string;
    upload_date: string | null;
    facebook_url: string | null;
  }[] | {
    id: string;
    created_at: string;
    upload_date: string | null;
    facebook_url: string | null;
  } | null;
}

const transformVideoData = (raw: VideoRaw): Video => {
  // Handle both null, empty array, and single object cases
  // Supabase !inner join may return a single object instead of array
  let uploads: BolReviewRecord[] = []
  if (raw.bolreview_uploads) {
    if (Array.isArray(raw.bolreview_uploads)) {
      uploads = raw.bolreview_uploads.map(u => ({
        id: u.id,
        created_at: u.created_at,
        upload_date: u.upload_date,
        facebook_url: u.facebook_url
      }))
    } else {
      uploads = [{
        id: raw.bolreview_uploads.id,
        created_at: raw.bolreview_uploads.created_at,
        upload_date: raw.bolreview_uploads.upload_date,
        facebook_url: raw.bolreview_uploads.facebook_url
      }]
    }
  }
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    created_at: raw.created_at,
    youtube_url: raw.youtube_url,
    shopee_product_url: raw.shopee_product_url,
    bolreview_uploads: uploads,
  }
}

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

const StatCard = ({ filterKey, title, count, uploadDateFilter, onFilterClick }: {
  filterKey: 'today' | 'yesterday' | 'range-3-9';
  title: string;
  count: number;
  uploadDateFilter: 'today' | 'yesterday' | 'range-3-9' | ''
  onFilterClick: (filterKey: 'today' | 'yesterday' | 'range-3-9') => void
}) => (
  <Card sx={{
    bgcolor: 'background.paper',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: uploadDateFilter === filterKey ? '1px solid' : '1px solid #f0f0f0',
    borderColor: uploadDateFilter === filterKey ? 'primary.main' : '#f0f0f0',
    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
  }}
    onClick={() => onFilterClick(filterKey)}>
    <CardContent sx={{ p: 2.5 }}>
      <Typography variant="caption" sx={{ fontSize: 12, fontWeight: 500, color: 'text.secondary', letterSpacing: 0.5, display: 'block', mb: 1 }}>{title}</Typography>
      <Typography variant="h4" sx={{ fontWeight: 700, fontSize: 32, color: 'text.primary', mb: 0.5 }}>{count}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>BolReview uploads</Typography>
    </CardContent>
  </Card>
)

export default function BolReviewUpload() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const ITEMS_PER_PAGE = 10
  const [open, setOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [descriptionOpen, setDescriptionOpen] = useState(false)
  const [selectedDescription, setSelectedDescription] = useState('')
  const [selectedDescriptionVideo, setSelectedDescriptionVideo] = useState<Video | null>(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedVideoForUpload, setSelectedVideoForUpload] = useState<Video | null>(null)
  const [facebookUrl, setFacebookUrl] = useState('')
  const [uploadDate, setUploadDate] = useState('')
  const [editUploadDialogOpen, setEditUploadDialogOpen] = useState(false)
  const [editingUpload, setEditingUpload] = useState<BolReviewRecord | null>(null)
  const [editUploadDate, setEditUploadDate] = useState('')
  const [editFacebookUrl, setEditFacebookUrl] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSearchQuery, setActiveSearchQuery] = useState('')
  const [uploadDateFilter, setUploadDateFilter] = useState<'today' | 'yesterday' | 'range-3-9' | ''>('')
  const [showUploadedOnly, setShowUploadedOnly] = useState(false)
  const [showNotUploadedOnly, setShowNotUploadedOnly] = useState(true)
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false)
  const [selectedVideoUrl, setSelectedVideoUrl] = useState('')
  const [videoLoading, setVideoLoading] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '' })
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const [shopeeProductUrl, setShopeeProductUrl] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const todayDate = useMemo(() => getTodayDate(), [])
  const yesterdayDate = useMemo(() => getDateDaysAgo(1), [])
  const dates3to9 = useMemo(() => Array.from({ length: 7 }, (_, i) => getDateDaysAgo(i + 3)), [])

  const [todayStats, setTodayStats] = useState({ count: 0 })
  const [yesterdayStats, setYesterdayStats] = useState({ count: 0 })
  const [range3to9Stats, setRange3to9Stats] = useState({ count: 0 })

  const fetchStats = useCallback(async () => {
    // Query bolreview_uploads directly to count upload records
    const { data: todayUploads } = await supabase.from('bolreview_uploads')
      .select('id')
      .eq('upload_date', todayDate)
    
    const { data: yesterdayUploads } = await supabase.from('bolreview_uploads')
      .select('id')
      .eq('upload_date', yesterdayDate)
    
    const { data: rangeUploads } = await supabase.from('bolreview_uploads')
      .select('id')
      .in('upload_date', dates3to9)

    setTodayStats({ count: todayUploads?.length || 0 })
    setYesterdayStats({ count: yesterdayUploads?.length || 0 })
    setRange3to9Stats({ count: rangeUploads?.length || 0 })
  }, [todayDate, yesterdayDate, dates3to9])

  const fetchData = useCallback(async (page: number = 0, reset: boolean = false) => {
    if (page === 0) setLoading(true); else setLoadingMore(true)
    
    // Build select query - use !inner when filtering by upload date to only return matching videos
    // Use !left otherwise to get all videos with their upload records
    const joinType = uploadDateFilter ? 'inner' : 'left'
    const selectQuery = `id, title, description, created_at, youtube_url, shopee_product_url, bolreview_uploads!${joinType}(id, created_at, upload_date, facebook_url)`
    
    let q = supabase.from('videos')
      .select(selectQuery, { count: 'exact' })
      
    
    if (showNotUploadedOnly) {
      q = q.is('bolreview_uploads', null)
      q = q.order('created_at', { ascending: true })
    } else if (showUploadedOnly) {
      q = q.not('bolreview_uploads', 'is', null)
      .order('upload_date', { ascending: true, foreignTable: 'bolreview_uploads' })
    } else {
      q = q.order('created_at', { ascending: true })
    }
    
    // Add upload_date filter when a date filter is active
    if (uploadDateFilter === 'today') {
      q = q.eq('bolreview_uploads.upload_date', todayDate)
    } else if (uploadDateFilter === 'yesterday') {
      q = q.eq('bolreview_uploads.upload_date', yesterdayDate)
    } else if (uploadDateFilter === 'range-3-9') {
      q = q.in('bolreview_uploads.upload_date', dates3to9)
    }
    
    if (activeSearchQuery) q = q.or(`title.ilike.%${activeSearchQuery}%`)
    q = q.range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1)
    
    const { data: vData } = await q

    const transformedData = ((vData as VideoRaw[] | null) || []).map(transformVideoData)

    if (reset || page === 0) {
      setVideos(transformedData)
    } else {
      setVideos(prev => [...prev, ...transformedData])
    }
    
    setHasMore((vData?.length || 0) === ITEMS_PER_PAGE)
    setLoading(false); setLoadingMore(false)
    fetchStats()
  }, [activeSearchQuery, showNotUploadedOnly, showUploadedOnly, uploadDateFilter, todayDate, yesterdayDate, dates3to9, fetchStats])

  useEffect(() => {
    fetchData(0, true)
  }, [fetchData])

  const handleStatCardClick = (filterKey: 'today' | 'yesterday' | 'range-3-9') => {
    if (uploadDateFilter === filterKey) {
      setUploadDateFilter('')
      setSearchQuery('')
      setActiveSearchQuery('')
      setShowUploadedOnly(false)
      setShowNotUploadedOnly(false)
      setCurrentPage(0)
      setVideos([])
      setHasMore(true)
    } else {
      setUploadDateFilter(filterKey)
      setSearchQuery('')
      setActiveSearchQuery('')
      setShowUploadedOnly(false)
      setShowNotUploadedOnly(false)
      setCurrentPage(0)
      setVideos([])
      setHasMore(true)
    }
  }

  const handleSearch = () => {
    setActiveSearchQuery(searchQuery)
    setCurrentPage(0)
    setVideos([])
    setHasMore(true)
  }

  const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ]
    for (const p of patterns) {
      const m = url.match(p)
      if (m) return m[1]
    }
    return null
  }

  const getAvailablePlatforms = (video: Video) => {
    return [{ key: 'youtube', label: 'YouTube' }].filter(p => !!(video[`${p.key}_url` as keyof Video] as string | null))
  }

  const platformIcons: Record<string, React.ReactElement | null> = {
    youtube: <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF0000"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>,
  }

  const openVideoPlayer = (url: string) => {
    setSelectedVideoUrl(url)
    setVideoPlayerOpen(true)
    setVideoLoading(true)
  }

  const handleVideoLoad = () => setVideoLoading(false)

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setSnackbar({ open: true, message: `${label} copied to clipboard!` })
    } catch {
      setSnackbar({ open: true, message: 'Failed to copy' })
    }
  }

  const isMobileDevice = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  const searchGoogleDriveLatest = (t: string) => {
    const f = '1-1cXk5CecrMqVFN0krVA3JUf-SrCJejY'
    window.open(`https://drive.google.com/drive/u/0/search?q=${isMobileDevice() ? encodeURIComponent(t) : encodeURIComponent(`${t} parent:${f}`)}`, '_blank')
  }

  const searchGoogleDriveArchive = (t: string) => {
    const f = '1DYoHgOxk3UAB6FQgWgbUhbgx9Xg74vDR'
    window.open(`https://drive.google.com/drive/u/0/search?q=${isMobileDevice() ? encodeURIComponent(t) : encodeURIComponent(`${t} parent:${f}`)}`, '_blank')
  }

  const searchGoogleDriveAll = (t: string) => {
    window.open(`https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(t)}`, '_blank')
  }

  const handleLoadMore = () => {
    const np = currentPage + 1
    setCurrentPage(np)
    fetchData(np, false)
  }

  const openEditDialog = (video: Video) => {
    setEditingVideo(video)
    setTitle(video.title)
    setDescription(video.description || '')
    setCreatedAt(video.created_at ? video.created_at.split('T')[0] : '')
    setShopeeProductUrl(video.shopee_product_url || '')
    setOpen(true)
  }

  const openUploadDialog = (video: Video) => {
    setSelectedVideoForUpload(video)
    setFacebookUrl('')
    setUploadDate(todayDate)
    setUploadDialogOpen(true)
  }

  const handleUpdateVideo = async () => {
    if (!editingVideo) return
    const { error } = await supabase.from('videos').update({
      title,
      description,
      created_at: createdAt ? new Date(createdAt).toISOString() : null,
      shopee_product_url: shopeeProductUrl || null
    }).eq('id', editingVideo.id)

    if (!error) {
      setOpen(false)
      setEditingVideo(null)
      fetchData(0, true)
      setSnackbar({ open: true, message: 'Video updated!' })
    }
  }

  const handleMarkUploaded = async () => {
    if (!selectedVideoForUpload) return
    const { error } = await supabase.from('bolreview_uploads').insert({
      video_id: selectedVideoForUpload.id,
      facebook_url: facebookUrl || null,
      upload_date: uploadDate || null
    })

    if (!error) {
      setUploadDialogOpen(false)
      setSelectedVideoForUpload(null)
      fetchData(0, true)
      setSnackbar({ open: true, message: 'Marked as uploaded to BolReview!' })
    }
  }

  const handleRemoveUpload = async (uploadId: string) => {
    if (!confirm('Remove this upload record from BolReview?')) return
    const { error } = await supabase.from('bolreview_uploads')
      .delete()
      .eq('id', uploadId)

    if (!error) {
      fetchData(0, true)
      setSnackbar({ open: true, message: 'Upload record removed!' })
    }
  }

  const openEditUploadDialog = (upload: BolReviewRecord) => {
    setEditingUpload(upload)
    setEditUploadDate(upload.upload_date || '')
    setEditFacebookUrl(upload.facebook_url || '')
    setEditUploadDialogOpen(true)
  }

  const handleUpdateUpload = async () => {
    if (!editingUpload) return
    const { error } = await supabase.from('bolreview_uploads').update({
      upload_date: editUploadDate || null,
      facebook_url: editFacebookUrl || null
    }).eq('id', editingUpload.id)

    if (!error) {
      setEditUploadDialogOpen(false)
      setEditingUpload(null)
      fetchData(0, true)
      setSnackbar({ open: true, message: 'Upload record updated!' })
    }
  }

  const openDescription = (video: Video) => {
    setSelectedDescription(video.description || '')
    setSelectedDescriptionVideo(video)
    setDescriptionOpen(true)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>BolReview Upload</Typography>
          <Typography variant="body2" color="text.secondary">Track video uploads to BolReview Facebook page.</Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2, mb: 2 }}>
        <StatCard filterKey="today" title="Uploaded Today" count={todayStats.count} uploadDateFilter={uploadDateFilter} onFilterClick={handleStatCardClick} />
        <StatCard filterKey="yesterday" title="Uploaded Yesterday" count={yesterdayStats.count} uploadDateFilter={uploadDateFilter} onFilterClick={handleStatCardClick} />
        <StatCard filterKey="range-3-9" title="Days 3-9 Uploads" count={range3to9Stats.count} uploadDateFilter={uploadDateFilter} onFilterClick={handleStatCardClick} />
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

        <TextField
          size="small"
          select
          value={showUploadedOnly ? 'uploaded' : showNotUploadedOnly ? 'not-uploaded' : ''}
          onChange={(e) => {
            const val = e.target.value
            setShowUploadedOnly(val === 'uploaded')
            setShowNotUploadedOnly(val === 'not-uploaded')
          }}
          sx={{ minWidth: { xs: '100%', sm: 150 } }}
          slotProps={{ select: { native: true, displayEmpty: true } }}
        >
          <option value="">All Status</option>
          <option value="uploaded">Uploaded</option>
          <option value="not-uploaded">Not Uploaded</option>
        </TextField>

        {(searchQuery || showUploadedOnly || showNotUploadedOnly || uploadDateFilter) && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setSearchQuery('')
              setActiveSearchQuery('')
              setShowUploadedOnly(false)
              setShowNotUploadedOnly(false)
              setUploadDateFilter('')
              setCurrentPage(0)
              setVideos([])
              setHasMore(true)
            }}
            startIcon={<CloseIcon />}
          >
            Clear
          </Button>
        )}
      </Box>

      {uploadDateFilter && <Alert severity="info" sx={{ mb: 2 }}>Showing videos uploaded on {uploadDateFilter === 'today' ? 'today' : uploadDateFilter === 'yesterday' ? 'yesterday' : 'days 3-9'}</Alert>}
      {showUploadedOnly && <Alert severity="info" sx={{ mb: 2 }}>Showing uploaded videos only</Alert>}
      {showNotUploadedOnly && <Alert severity="info" sx={{ mb: 2 }}>Showing not uploaded videos only</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : videos.length === 0 ? (
        <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
          {searchQuery || showUploadedOnly || showNotUploadedOnly || uploadDateFilter
            ? 'No videos found matching your criteria'
            : 'No videos yet. Add videos from the Videos page.'}
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {videos.map((video) => {
            const videoId = video.youtube_url ? getYouTubeVideoId(video.youtube_url) : null
            const isUploaded = video.bolreview_uploads.length > 0
            const uploadCount = video.bolreview_uploads.length
            
            return (
              <Card key={video.id}>
                <CardContent sx={{ py: 2, px: { xs: 2, md: 2.5 } }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    {videoId ? (
                      <Box
                        component="img"
                        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                        alt={video.title}
                        onClick={() => openVideoPlayer(video.youtube_url!)}
                        onError={(e) => {
                          const t = e.target as HTMLImageElement
                          if (t.src.includes('mqdefault')) t.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                          else if (t.src.includes('hqdefault')) t.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
                          else t.style.display = 'none'
                        }}
                        sx={{
                          width: 120,
                          height: 160,
                          objectFit: 'cover',
                          borderRadius: 1,
                          cursor: 'pointer',
                          flexShrink: 0,
                          '&:hover': { opacity: 0.8 }
                        }}
                      />
                    ) : (
                      <Box sx={{ width: 120, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1, bgcolor: 'grey.200', flexShrink: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>No Video</Typography>
                      </Box>
                    )}

                    <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', flex: 1 }}>
                          {video.title}
                        </Typography>
                        {video.description && (
                          <IconButton size="small" onClick={() => openDescription(video)} sx={{ p: 0.5 }} title="View description">
                            <Info fontSize="small" />
                          </IconButton>
                        )}
                      </Box>

                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12, display: 'block', mb: 1 }}>
                        {new Date(video.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Typography>

                      <Box sx={{ mb: 1.5 }}>
                        {isUploaded ? (
                          <Chip
                            label={uploadCount > 1 ? `Uploaded (${uploadCount})` : 'Uploaded'}
                            size="small"
                            sx={{
                              bgcolor: '#e8f5e9',
                              color: '#2e7d32',
                              fontWeight: 600,
                              fontSize: 11,
                              height: 22
                            }}
                          />
                        ) : (
                          <Chip
                            label="Not Uploaded"
                            size="small"
                            variant="outlined"
                            sx={{
                              color: 'text.secondary',
                              fontWeight: 500,
                              fontSize: 11,
                              height: 22
                            }}
                          />
                        )}
                      </Box>

                      {isUploaded && (
                        <Box sx={{ mb: 1.5 }}>
                          <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                            Upload Records
                          </Typography>
                          {video.bolreview_uploads.map((upload) => (
                            <Box key={upload.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, flexWrap: 'wrap' }}>
                              <Chip
                                label={upload.upload_date ? new Date(upload.upload_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date'}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: 10, height: 20 }}
                              />
                              {upload.facebook_url && (
                                <>
                                  <Facebook sx={{ fontSize: 14, color: '#1877F2' }} />
                                  <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {upload.facebook_url}
                                  </Typography>
                                  <IconButton size="small" onClick={() => copyToClipboard(upload.facebook_url!, 'Facebook')} sx={{ p: 0.25 }}>
                                    <CopyIcon fontSize="small" />
                                  </IconButton>
                                </>
                              )}
                              <IconButton size="small" onClick={() => openEditUploadDialog(upload)} title="Edit upload" sx={{ p: 0.25, color: 'primary.main' }}>
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleRemoveUpload(upload.id)} title="Remove this upload" sx={{ p: 0.25, color: 'warning.main' }}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Box>
                          ))}
                        </Box>
                      )}

                      {video.shopee_product_url && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                          <Chip
                            icon={<Shop />}
                            label="Shopee"
                            size="small"
                            onClick={() => copyToClipboard(video.shopee_product_url!, 'Shopee')}
                            sx={{
                              cursor: 'pointer',
                              bgcolor: '#EE4D2D',
                              color: 'white',
                              '&:hover': { bgcolor: '#D43F1F' },
                              height: 28
                            }}
                          />
                        </Box>
                      )}

                      <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                        Google Drive
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                        {isMobileDevice() ? (
                          <Chip
                            icon={<GoogleDriveIcon />}
                            label="Drive"
                            size="small"
                            onClick={() => searchGoogleDriveAll(video.title)}
                            sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 }, height: 28 }}
                            title="Search in Google Drive"
                          />
                        ) : (
                          <>
                            <Chip
                              icon={<GoogleDriveIcon />}
                              label="Drive"
                              size="small"
                              onClick={() => searchGoogleDriveLatest(video.title)}
                              sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 }, height: 28 }}
                              title="Latest"
                            />
                            <Chip
                              icon={<GoogleDriveIcon />}
                              label="Arc"
                              size="small"
                              onClick={() => searchGoogleDriveArchive(video.title)}
                              sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 }, height: 28 }}
                              title="Archive"
                            />
                          </>
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flexShrink: 0 }}>
                      <IconButton size="small" onClick={() => openEditDialog(video)} title="Edit">
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => openUploadDialog(video)} title="Mark as Uploaded" sx={{ color: 'success.main' }}>
                        <Facebook fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )
          })}
          
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            {loadingMore ? (
              <CircularProgress size={28} />
            ) : hasMore ? (
              <Button variant="outlined" onClick={handleLoadMore} startIcon={<Shop />}>
                Load More
              </Button>
            ) : null}
          </Box>
        </Box>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Edit Video</Typography>
            {isMobile && (
              <IconButton onClick={() => setOpen(false)} size="small">
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            margin="normal"
            required
            size={isMobile ? 'small' : 'medium'}
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            margin="normal"
            multiline
            minRows={3}
            size={isMobile ? 'small' : 'medium'}
          />
          <TextField
            label="Created At"
            type="date"
            value={createdAt}
            onChange={(e) => setCreatedAt(e.target.value)}
            fullWidth
            margin="normal"
            size={isMobile ? 'small' : 'medium'}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Shopee Product URL"
            value={shopeeProductUrl}
            onChange={(e) => setShopeeProductUrl(e.target.value)}
            fullWidth
            margin="normal"
            size="small"
            placeholder="https://..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          {!isMobile && <Button onClick={() => setOpen(false)}>Cancel</Button>}
          <Button onClick={handleUpdateVideo} variant="contained" fullWidth={isMobile}>
            Update
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Mark as Uploaded - BolReview</Typography>
            <IconButton onClick={() => setUploadDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              Video: {selectedVideoForUpload?.title}
            </Typography>
            <TextField
              label="Upload Date"
              type="date"
              value={uploadDate}
              onChange={(e) => setUploadDate(e.target.value)}
              fullWidth
              margin="normal"
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Facebook URL (optional)"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              fullWidth
              margin="normal"
              size="small"
              placeholder="https://facebook.com/..."
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleMarkUploaded} variant="contained" color="success" startIcon={<Facebook />}>
            Mark as Uploaded
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editUploadDialogOpen} onClose={() => setEditUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Edit Upload Record</Typography>
            <IconButton onClick={() => setEditUploadDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              label="Upload Date"
              type="date"
              value={editUploadDate}
              onChange={(e) => setEditUploadDate(e.target.value)}
              fullWidth
              margin="normal"
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Facebook URL"
              value={editFacebookUrl}
              onChange={(e) => setEditFacebookUrl(e.target.value)}
              fullWidth
              margin="normal"
              size="small"
              placeholder="https://facebook.com/..."
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditUploadDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateUpload} variant="contained" startIcon={<Edit />}>
            Update
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={videoPlayerOpen} onClose={() => setVideoPlayerOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ pb: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Video Player</span>
            <IconButton onClick={() => setVideoPlayerOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {selectedVideoUrl && (() => {
            const vid = selectedVideoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/)?.[1] ||
              selectedVideoUrl.match(/youtube\.com\/watch\?.*v=([^&\n?#]+)/)?.[1]
            if (!vid) return null
            return (
              <>
                {videoLoading && (
                  <Box sx={{ width: '100%', height: isMobile ? '85vh' : '80vh', maxWidth: 450, mx: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                    <CircularProgress color="primary" />
                  </Box>
                )}
                <Box sx={{ position: 'relative', width: '100%', height: isMobile ? '85vh' : '80vh', maxWidth: 450, mx: 'auto', overflow: 'hidden', display: videoLoading ? 'none' : 'block' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${vid}?autoplay=1`}
                    title="YouTube video player"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    onLoad={handleVideoLoad}
                  />
                </Box>
              </>
            )
          })()}
          <Box sx={{ mt: 2, px: 2, pb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Available Platforms:</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {(() => {
                const cv = videos.find(v => v.youtube_url === selectedVideoUrl)
                if (!cv) return null
                return getAvailablePlatforms(cv).map(p => {
                  const u = cv[`${p.key}_url` as keyof Video] as string
                  return (
                    <Button
                      key={p.key}
                      href={u}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant={p.key === 'youtube' ? 'contained' : 'outlined'}
                      startIcon={platformIcons[p.key] || undefined}
                      size="small"
                    >
                      {p.label}
                    </Button>
                  )
                })
              })()}
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={descriptionOpen} onClose={() => setDescriptionOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Description</span>
            <IconButton onClick={() => setDescriptionOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {parseDescription(selectedDescription).map((s, i) => (
            <Box key={i} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>{s.title}</Typography>
                {s.content && (
                  <IconButton size="small" onClick={() => copyToClipboard(s.content, s.title)} title="Copy content">
                    <CopyIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
              {s.content && (
                <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line', fontSize: 13 }}>{s.content}</Typography>
                </Box>
              )}
            </Box>
          ))}
          {selectedDescriptionVideo?.shopee_product_url && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Product Links</Typography>
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
            </Box>
          )}
        </DialogContent>
        {!isMobile && (
          <DialogActions>
            <Button onClick={() => setDescriptionOpen(false)}>Close</Button>
          </DialogActions>
        )}
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}