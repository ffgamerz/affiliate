import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Snackbar,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  YouTube,
  Facebook,
  Instagram,
  Info,
  Upload,
  MusicNote as TikTokIcon,
  Shop,
  Forum as ThreadsIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Replay as ReplayIcon,
} from '@mui/icons-material'
import { supabase } from '../lib/supabase'
import { useDebounce } from '../hooks/useDebounce'

// Google Drive Icon SVG component
const GoogleDriveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 87.3 76.6" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M63.7 28.1l-11.9-6.8c-.1 0-.2-.1-.3-.1l-11.9-6.8c-.1 0-.2 0-.3.1L21.9 28c-.1.1-.2.1-.3.1L6.1 34.9c-.1 0-.2.1-.1.2v12.3c0 .1.1.2.2.2l15.6 9.1c.1 0 .2 0 .3-.1l11.9 6.8c.1 0 .2.1.3.1l11.9 6.8c.1 0 .2 0 .3-.1l11.9-6.8c.1 0-.2-.1-.3-.1l11.9-6.8c.1 0 .2 0 .3.1l11.9 6.8c.1 0 .2.1.3.1l15.6-9.1c.1 0 .2-.1.2-.2V35c0-.1-.1-.2-.2-.2l-15.6-9.1c-.1 0-.2-.1-.3-.1z" fill="#0066CC"/>
    <path d="M63.7 28.1L44.2 4.2c-.1-.1-.2-.1-.3 0L21.9 28c-.1.1-.2.1-.3.1-.1L6.1 34.9c-.1 0-.2.1-.1.2v12.3c0 .1.1.2.2.2l15.6 9.1c.1 0 .2 0 .3-.1l11.9 6.8c.1 0 .2.1.3.1l11.9 6.8c.1 0 .2 0 .3-.1l11.9-6.8c.1 0-.2-.1-.3-.1l11.9-6.8c.1 0 .2 0 .3.1l11.9 6.8c.1 0 .2.1.3.1l15.6-9.1c.1 0 .2-.1.2-.2V35c0-.1-.1-.2-.2-.2l-15.6-9.1c-.1 0-.2-.1-.3-.1z" fill="#00AC47"/>
  </svg>
)

interface Video {
  id: string
  title: string
  description: string | null
  created_at: string
  youtube_url: string | null
  youtube_upload_date: string | null
  facebook_url: string | null
  facebook_upload_date: string | null
  instagram_url: string | null
  instagram_upload_date: string | null
  shopee_url: string | null
  shopee_upload_date: string | null
  threads_url: string | null
  threads_upload_date: string | null
  tiktok_url: string | null
  tiktok_upload_date: string | null
  tiktok_product_url: string | null
  shopee_product_url: string | null
}

interface Reupload {
  id: string
  video_id: string
  platform: string
  url: string | null
  upload_date: string | null
  notes: string | null
  created_at: string
}

const platforms = [
  { key: 'youtube', label: 'YouTube' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'threads', label: 'Threads' },
  { key: 'shopee', label: 'Shopee' },
]

// Description section interface
interface DescriptionSection {
  title: string
  content: string
}

// Parse description into sections based on -- headers
const parseDescription = (text: string): DescriptionSection[] => {
  if (!text) return []
  
  const sections: DescriptionSection[] = []
  const lines = text.split('\n')
  
  // Find all line indices that start with -- and end with -- (these are section headers)
  const sectionStartIndices: number[] = []
  
  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('--') && trimmed.endsWith('--')) {
      sectionStartIndices.push(index)
    }
  })
  
  // If no headers found, return original text as single section
  if (sectionStartIndices.length === 0) {
    sections.push({
      title: 'Content',
      content: text
    })
    return sections
  }
  
  // Extract sections - each -- line is a title, content is until next -- line
  for (let i = 0; i < sectionStartIndices.length; i++) {
    const currentStart = sectionStartIndices[i]
    const nextStart = sectionStartIndices[i + 1]
    
    // Title is the -- line (remove the -- prefix and suffix)
    const title = lines[currentStart].trim().replace(/^--\s*/, '').replace(/\s*--$/, '')
    
    // Content is all lines until next -- line (or end)
    const contentLines = nextStart 
      ? lines.slice(currentStart + 1, nextStart)
      : lines.slice(currentStart + 1)
    const content = contentLines.join('\n').trim()
    
    sections.push({
      title,
      content
    })
  }
  
  return sections
}

const platformIcons: Record<string, React.ReactElement | null> = {
  youtube: <YouTube />,
  tiktok: <TikTokIcon />,
  facebook: <Facebook />,
  instagram: <Instagram />,
  threads: <ThreadsIcon />,
  shopee: <Shop />,
}

// Helper function to get platform color
const getPlatformColor = (platformKey: string): string => {
  const colors: Record<string, string> = {
    youtube: '#FF0000',
    tiktok: '#000000',
    facebook: '#1877F2',
    instagram: '#E4405F',
    threads: '#000000',
    shopee: '#EE4D2D',
  }
  return colors[platformKey] || '#666666'
}

// StatCard component to reduce code duplication
const StatCard = ({ 
  filterKey, 
  title, 
  videoCount, 
  platformUploadCount, 
  targetDate,
  uploadDateFilter,
  setUploadDateFilter,
  videos,
  reuploads,
  platforms
}: {
  filterKey: 'today' | 'yesterday' | 'range-3-9'
  title: string
  videoCount: number
  platformUploadCount: number
  targetDate: string | string[]
  uploadDateFilter: 'today' | 'yesterday' | 'range-3-9' | ''
  setUploadDateFilter: (val: 'today' | 'yesterday' | 'range-3-9' | '') => void
  videos: Video[]
  reuploads: Reupload[]
  platforms: { key: string; label: string }[]
}) => {
  const dates = Array.isArray(targetDate) ? targetDate : [targetDate]
  
  // Get platform breakdown for the date
  const breakdown = useMemo(() => {
    const counts: Record<string, { original: number; reupload: number }> = {}
    platforms.forEach((p) => {
      const original = videos.reduce((total, video) => {
        const uploadDate = video[`${p.key}_upload_date` as keyof Video] as string | null
        return total + (uploadDate && dates.includes(uploadDate) ? 1 : 0)
      }, 0)
      const reupload = reuploads.filter(r => r.platform === p.key && r.upload_date && dates.includes(r.upload_date)).length
      counts[p.key] = { original, reupload }
    })
    return counts
  }, [videos, reuploads, platforms, targetDate])

  return (
    <Card 
      sx={{ 
        bgcolor: 'background.paper',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: uploadDateFilter === filterKey ? '1px solid' : '1px solid #f0f0f0',
        borderColor: uploadDateFilter === filterKey ? 'primary.main' : '#f0f0f0',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }
      }}
      onClick={() => {
        setUploadDateFilter(uploadDateFilter === filterKey ? '' : filterKey)
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="caption" sx={{ fontSize: 12, fontWeight: 500, color: 'text.secondary', textTransform: 'none', letterSpacing: 0.5, display: 'block', mb: 1 }}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, fontSize: 32, color: 'text.primary', mb: 0.5 }}>
          {videoCount}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
          Total platform uploads: <Typography component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>{platformUploadCount}</Typography>
        </Typography>
        {Object.entries(breakdown).some(([_, v]) => v.original + v.reupload > 0) && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
            {platforms.map((p) => {
              const { original, reupload } = breakdown[p.key]
              const count = original + reupload
              if (count === 0) return null
              
              if (original > 0 && reupload > 0) {
                return (
                  <Box key={p.key} sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2, 
                      px: 1, 
                      py: 0.5, 
                      bgcolor: '#f5f5f5',
                      borderRadius: 0.5,
                      border: '1px solid',
                      borderColor: '#81c784'
                    }}>
                      <Box sx={{ width: 12, height: 12, display: 'flex', alignItems: 'center', color: getPlatformColor(p.key) }}>
                        {platformIcons[p.key]}
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', fontSize: 12 }}>
                        {original}
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2, 
                      px: 1, 
                      py: 0.5, 
                      bgcolor: '#f5f5f5',
                      borderRadius: 0.5,
                      border: '1px solid',
                      borderColor: '#ffb74d'
                    }}>
                      <Box sx={{ width: 12, height: 12, display: 'flex', alignItems: 'center', color: getPlatformColor(p.key) }}>
                        {platformIcons[p.key]}
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', fontSize: 12 }}>
                        {reupload}
                      </Typography>
                    </Box>
                  </Box>
                )
              }
              
              const isReupload = reupload > 0 && original === 0
              return (
                <Box key={p.key} sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2, 
                  px: 1, 
                  py: 0.5, 
                  bgcolor: '#f5f5f5',
                  borderRadius: 0.5,
                  border: '1px solid',
                  borderColor: isReupload ? '#ffb74d' : '#81c784'
                }}>
                  <Box sx={{ width: 12, height: 12, display: 'flex', alignItems: 'center', color: getPlatformColor(p.key) }}>
                    {platformIcons[p.key]}
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', fontSize: 12 }}>
                    {count}
                  </Typography>
                </Box>
              )
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default function Videos() {
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [videos, setVideos] = useState<Video[]>([])
  const [reuploads, setReuploads] = useState<Reupload[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [descriptionOpen, setDescriptionOpen] = useState(false)
  const [selectedDescription, setSelectedDescription] = useState('')
  const [selectedDescriptionVideo, setSelectedDescriptionVideo] = useState<Video | null>(null)
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false)
  const [selectedVideoUrl, setSelectedVideoUrl] = useState('')
  const [videoLoading, setVideoLoading] = useState(false)
  const [uploadInfoOpen, setUploadInfoOpen] = useState(false)
  const [selectedVideoForInfo, setSelectedVideoForInfo] = useState<Video | null>(null)

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300) // Debounce search for performance
  const [dateFilter, setDateFilter] = useState('')
  const [filterEmptyPlatform, setFilterEmptyPlatform] = useState<string | null>(null)
  const [platformFilter, setPlatformFilter] = useState<string>('')
  const [uploadDateFilter, setUploadDateFilter] = useState<'today' | 'yesterday' | 'range-3-9' | ''>('')
  const [customUploadDateFilter, setCustomUploadDateFilter] = useState('')

  // Reupload popup states
  const [reuploadDialogOpen, setReuploadDialogOpen] = useState(false)
  const [reuploadPlatform, setReuploadPlatform] = useState('')
  const [reuploadUrl, setReuploadUrl] = useState('')
  const [reuploadUploadDate, setReuploadUploadDate] = useState('')
  const [reuploadNotes, setReuploadNotes] = useState('')

  // Search input ref for auto-focus
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Pagination states
  const ITEMS_PER_PAGE = 10
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)
  const [loadingMore, setLoadingMore] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)

  // Auto-focus search input when navigated from search icon click
  useEffect(() => {
    if ((location.state as any)?.focusSearch && searchInputRef.current) {
      searchInputRef.current.focus()
    }

    // Handle navigation from Upload Calendar
    if ((location.state as any)?.calendarUploadDate) {
      setCustomUploadDateFilter((location.state as any).calendarUploadDate)
      setUploadDateFilter('')
    }

    // Handle navigation from Random Picker with search query
    if ((location.state as any)?.searchQuery) {
      setSearchQuery((location.state as any).searchQuery)
    }
  }, [location])

  // Copy to clipboard state
  const [snackbar, setSnackbar] = useState({ open: false, message: '' })

  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionFocused, setDescriptionFocused] = useState(false)
  const [createdAt, setCreatedAt] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [youtubeUploadDate, setYoutubeUploadDate] = useState('')
  const [facebookUrl, setFacebookUrl] = useState('')
  const [facebookUploadDate, setFacebookUploadDate] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [instagramUploadDate, setInstagramUploadDate] = useState('')
  const [shopeeUrl, setShopeeUrl] = useState('')
  const [shopeeUploadDate, setShopeeUploadDate] = useState('')
  const [shopeeProductUrl, setShopeeProductUrl] = useState('')
  const [threadsUrl, setThreadsUrl] = useState('')
  const [threadsUploadDate, setThreadsUploadDate] = useState('')
  const [tiktokUrl, setTiktokUrl] = useState('')
  const [tiktokUploadDate, setTiktokUploadDate] = useState('')
  const [tiktokProductUrl, setTiktokProductUrl] = useState('')

  useEffect(() => {
    fetchData()

    // Check if navigated from Dashboard with platform filter
    if (location.state && (location.state as any).filterEmptyPlatform) {
      setFilterEmptyPlatform((location.state as any).filterEmptyPlatform)
    }

    // Auto-open add dialog if navigated from Dashboard
    if (location.state && (location.state as any).openAddDialog) {
      openAddDialog()
    }
  }, [location])

  const fetchData = async () => {
    const [videosResult, reuploadsResult] = await Promise.all([
      supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('reuploads')
        .select('*'),
    ])

    setVideos((videosResult.data as Video[]) || [])
    setReuploads((reuploadsResult.data as Reupload[]) || [])
    setLoading(false)
  }

  const handleAddVideo = async () => {
    if (!title) return

    const { error } = await supabase.from('videos').insert({
      title,
      description,
      youtube_url: youtubeUrl || null,
      youtube_upload_date: youtubeUploadDate || null,
      facebook_url: facebookUrl || null,
      facebook_upload_date: facebookUploadDate || null,
      instagram_url: instagramUrl || null,
      instagram_upload_date: instagramUploadDate || null,
      shopee_url: shopeeUrl || null,
      shopee_upload_date: shopeeUploadDate || null,
      shopee_product_url: shopeeProductUrl || null,
      threads_url: threadsUrl || null,
      threads_upload_date: threadsUploadDate || null,
      tiktok_url: tiktokUrl || null,
      tiktok_upload_date: tiktokUploadDate || null,
      tiktok_product_url: tiktokProductUrl || null,
    })

    if (!error) {
      setOpen(false)
      resetForm()
      fetchData()
    }
  }

  const handleUpdateVideo = async () => {
    if (!editingVideo) return

    const updateData: any = {
      title,
      description,
      youtube_url: youtubeUrl || null,
      youtube_upload_date: youtubeUploadDate || null,
      facebook_url: facebookUrl || null,
      facebook_upload_date: facebookUploadDate || null,
      instagram_url: instagramUrl || null,
      instagram_upload_date: instagramUploadDate || null,
      shopee_url: shopeeUrl || null,
      shopee_upload_date: shopeeUploadDate || null,
      shopee_product_url: shopeeProductUrl || null,
      threads_url: threadsUrl || null,
      threads_upload_date: threadsUploadDate || null,
      tiktok_url: tiktokUrl || null,
      tiktok_upload_date: tiktokUploadDate || null,
      tiktok_product_url: tiktokProductUrl || null,
    }

    // Only update created_at if it's changed
    if (createdAt) {
      updateData.created_at = new Date(createdAt).toISOString()
    }

    const { error } = await supabase
      .from('videos')
      .update(updateData)
      .eq('id', editingVideo.id)

    if (!error) {
      setOpen(false)
      setEditingVideo(null)
      resetForm()
      fetchData()
    }
  }

  const handleDeleteVideo = async (id: string) => {
    if (confirm('Are you sure you want to delete this video?')) {
      await supabase.from('videos').delete().eq('id', id)
      fetchData()
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setCreatedAt('')
    setYoutubeUrl('')
    setYoutubeUploadDate('')
    setFacebookUrl('')
    setFacebookUploadDate('')
    setInstagramUrl('')
    setInstagramUploadDate('')
    setShopeeUrl('')
    setShopeeUploadDate('')
    setShopeeProductUrl('')
    setThreadsUrl('')
    setThreadsUploadDate('')
    setTiktokUrl('')
    setTiktokUploadDate('')
    setTiktokProductUrl('')
  }

  const autoSetTodayDate = (setDate: (val: string) => void, currentDate: string, url: string) => {
    if (url && !currentDate) {
      setDate(getTodayDate())
    } else if (!url && currentDate) {
      setDate('')
    }
  }

  const openEditDialog = (video: Video) => {
    setEditingVideo(video)
    setTitle(video.title)
    setDescription(video.description || '')
    setDescriptionFocused(false)
    setCreatedAt(video.created_at ? video.created_at.split('T')[0] : '')
    setYoutubeUrl(video.youtube_url || '')
    setYoutubeUploadDate(video.youtube_upload_date || '')
    setFacebookUrl(video.facebook_url || '')
    setFacebookUploadDate(video.facebook_upload_date || '')
    setInstagramUrl(video.instagram_url || '')
    setInstagramUploadDate(video.instagram_upload_date || '')
    setShopeeUrl(video.shopee_url || '')
    setShopeeUploadDate(video.shopee_upload_date || '')
    setShopeeProductUrl(video.shopee_product_url || '')
    setThreadsUrl(video.threads_url || '')
    setThreadsUploadDate(video.threads_upload_date || '')
    setTiktokUrl(video.tiktok_url || '')
    setTiktokUploadDate(video.tiktok_upload_date || '')
    setTiktokProductUrl(video.tiktok_product_url || '')
    setOpen(true)
  }

  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  const copyToClipboard = async (text: string, platform: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setSnackbar({ open: true, message: `${platform} URL copied to clipboard!` })
    } catch {
      setSnackbar({ open: true, message: 'Failed to copy URL' })
    }
  }

  const openAddDialog = () => {
    setEditingVideo(null)
    setDescriptionFocused(false)
    resetForm()
    setOpen(true)
  }

  // Open reupload popup from edit dialog
  const openReuploadDialog = (platform: string) => {
    setReuploadPlatform(platform)
    setReuploadUrl('') // Empty - user will paste new link
    setReuploadUploadDate(getTodayDate())
    setReuploadNotes('')
    setReuploadDialogOpen(true)
  }

  // Handle save reupload
  const handleSaveReupload = async () => {
    if (!editingVideo) return

    const { error } = await supabase.from('reuploads').insert({
      video_id: editingVideo.id,
      platform: reuploadPlatform,
      url: reuploadUrl || null,
      upload_date: reuploadUploadDate || null,
      notes: reuploadNotes || null,
    })

    if (!error) {
      setReuploadDialogOpen(false)
      setOpen(false) // Close edit dialog too
      setEditingVideo(null)
      resetForm()
      setSnackbar({ open: true, message: 'Reupload saved successfully!' })
      fetchData() // Refresh to update stat counts
    } else {
      console.error('Reupload error:', error)
      setSnackbar({ open: true, message: `Failed: ${error.message || 'Unknown error'}` })
    }
  }

  // Helper function to extract YouTube video ID
  const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  // Get available platforms for a video
  const getAvailablePlatforms = (video: Video) => {
    return platforms.filter(p => {
      const url = video[`${p.key}_url` as keyof Video] as string | null
      return !!url
    })
  }

  // Open video player
  const openVideoPlayer = (url: string) => {
    setSelectedVideoUrl(url)
    setVideoPlayerOpen(true)
    setVideoLoading(true)
  }

  // Open upload info dialog
  const openUploadInfo = (video: Video) => {
    setSelectedVideoForInfo(video)
    setUploadInfoOpen(true)
  }

  // Detect if the device is mobile (likely has Google Drive app)
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

  // Search video in Google Drive
  const searchGoogleDriveLatest = (videoTitle: string) => {
    const latestFolderId = '1-1cXk5CecrMqVFN0krVA3JUf-SrCJejY'
    const searchQuery = isMobileDevice()
      ? encodeURIComponent(videoTitle)
      : encodeURIComponent(`${videoTitle} parent:${latestFolderId}`)
    window.open(`https://drive.google.com/drive/u/0/search?q=${searchQuery}`, '_blank')
  }

  const searchGoogleDriveArchive = (videoTitle: string) => {
    const archiveFolderId = '1DYoHgOxk3UAB6FQgWgbUhbgx9Xg74vDR'
    const searchQuery = isMobileDevice()
      ? encodeURIComponent(videoTitle)
      : encodeURIComponent(`${videoTitle} parent:${archiveFolderId}`)
    window.open(`https://drive.google.com/drive/u/0/search?q=${searchQuery}`, '_blank')
  }

  const searchGoogleDriveAll = (videoTitle: string) => {
    const searchQuery = encodeURIComponent(videoTitle)
    window.open(`https://drive.google.com/drive/u/0/search?q=${searchQuery}`, '_blank')
  }

  // Handle iframe load
  const handleVideoLoad = () => {
    setVideoLoading(false)
  }

  // Helper to get date string for N days ago
  const getDateDaysAgo = (days: number): string => {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date.toISOString().split('T')[0]
  }

  // Get today's date
  const todayDate = getTodayDate()

  // Get yesterday's date
  const yesterdayDate = getDateDaysAgo(1)

  // Get dates for days 3-9
  const dates3to9 = Array.from({ length: 7 }, (_, i) => getDateDaysAgo(i + 3))

  // Helper to count total platform uploads across all videos + reuploads for given date(s)
  const getTotalPlatformUploads = (dateOrDates: string | string[]): number => {
    const dates = Array.isArray(dateOrDates) ? dateOrDates : [dateOrDates]
    let total = 0
    
    // Count from videos table
    total += videos.reduce((total, video) => {
      return total + platforms.reduce((count, platform) => {
        const uploadDate = video[`${platform.key}_upload_date` as keyof Video] as string | null
        return count + (uploadDate && dates.includes(uploadDate) ? 1 : 0)
      }, 0)
    }, 0)

    // Count from reuploads table
    total += reuploads.reduce((total, r) => {
      return total + (r.upload_date && dates.includes(r.upload_date) ? 1 : 0)
    }, 0)

    return total
  }

  // Helper to get platform-specific upload counts for a given date(s) - includes reuploads
  const getPlatformUploadsByDate = (dateOrDates: string | string[]): Record<string, number> => {
    const dates = Array.isArray(dateOrDates) ? dateOrDates : [dateOrDates]
    const counts: Record<string, number> = {}
    platforms.forEach((platform) => {
      // Count from videos
      let count = videos.reduce((total, video) => {
        const uploadDate = video[`${platform.key}_upload_date` as keyof Video] as string | null
        return total + (uploadDate && dates.includes(uploadDate) ? 1 : 0)
      }, 0)

      // Count from reuploads
      count += reuploads.reduce((total, r) => {
        return total + (r.platform === platform.key && r.upload_date && dates.includes(r.upload_date) ? 1 : 0)
      }, 0)

      counts[platform.key] = count
    })
    return counts
  }

  // Check if video has upload on a specific date
  const hasUploadOnDate = (video: Video, date: string): boolean => {
    return platforms.some((platform) => {
      const uploadDate = video[`${platform.key}_upload_date` as keyof Video] as string | null
      return uploadDate === date
    })
  }

  // Check if video has upload on any of the dates in range
  const hasUploadOnAnyDateInRange = (video: Video, dates: string[]): boolean => {
    return platforms.some((platform) => {
      const uploadDate = video[`${platform.key}_upload_date` as keyof Video] as string | null
      return uploadDate && dates.includes(uploadDate)
    })
  }

  // Check if a specific platform's upload date matches the current date filter
  const isPlatformDateMatch = (platformKey: string, video: Video): boolean => {
    const uploadDate = video[`${platformKey}_upload_date` as keyof Video] as string | null
    if (!uploadDate) return false

    if (uploadDateFilter === 'today') return uploadDate === todayDate
    if (uploadDateFilter === 'yesterday') return uploadDate === yesterdayDate
    if (uploadDateFilter === 'range-3-9') return dates3to9.includes(uploadDate)
    if (customUploadDateFilter) return uploadDate === customUploadDateFilter
    
    return false
  }

  // Check if a specific video+platform has a reupload on a matching date filter
  const isPlatformReuploadMatch = (platformKey: string, videoId: string): boolean => {
    let targetDate: string | null = null

    if (uploadDateFilter === 'today') targetDate = todayDate
    else if (uploadDateFilter === 'yesterday') targetDate = yesterdayDate
    else if (uploadDateFilter === 'range-3-9') {
      return dates3to9.some(date => reuploads.some(r => r.video_id === videoId && r.platform === platformKey && r.upload_date === date))
    }
    else if (customUploadDateFilter) targetDate = customUploadDateFilter

    if (!targetDate) return false
    return reuploads.some(r => r.video_id === videoId && r.platform === platformKey && r.upload_date === targetDate)
  }

  // Check if a video has any reupload on a specific date
  const hasReuploadForVideoOnDate = (videoId: string, date: string): boolean => {
    return reuploads.some(r => r.video_id === videoId && r.upload_date === date)
  }

  // Check if a video has any reupload on any of the dates in range
  const hasReuploadForVideoOnAnyDateInRange = (videoId: string, dates: string[]): boolean => {
    return dates.some(date => reuploads.some(r => r.video_id === videoId && r.upload_date === date))
  }

  // Memoized expensive calculations
  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      const matchesSearch = debouncedSearchQuery === '' ||
        video.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        (video.description && video.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))

      // Date filter (created_at) - from the Date input field
      const matchesDate = dateFilter === '' || video.created_at.split('T')[0] === dateFilter

      // Upload date filter (platform upload dates) - from stat cards
      // Also check reuploads for this video
      const matchesUploadDate = uploadDateFilter === '' || (uploadDateFilter === 'today'
        ? hasUploadOnDate(video, todayDate) || hasReuploadForVideoOnDate(video.id, todayDate)
        : uploadDateFilter === 'yesterday'
          ? hasUploadOnDate(video, yesterdayDate) || hasReuploadForVideoOnDate(video.id, yesterdayDate)
          : uploadDateFilter === 'range-3-9'
            ? hasUploadOnAnyDateInRange(video, dates3to9) || hasReuploadForVideoOnAnyDateInRange(video.id, dates3to9)
            : true)

      // Custom upload date filter - check if any platform has upload on the selected date
      const matchesCustomUploadDate = customUploadDateFilter === '' ||
        hasUploadOnDate(video, customUploadDateFilter) || hasReuploadForVideoOnDate(video.id, customUploadDateFilter)

      const matchesEmptyPlatform = filterEmptyPlatform === null ||
        !video[`${filterEmptyPlatform}_url` as keyof Video]

      const matchesPlatform = platformFilter === '' ||
        !!video[`${platformFilter}_url` as keyof Video]

      return matchesSearch && matchesDate && matchesUploadDate && matchesCustomUploadDate && matchesEmptyPlatform && matchesPlatform
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos, debouncedSearchQuery, dateFilter, uploadDateFilter, customUploadDateFilter, filterEmptyPlatform, platformFilter, todayDate, yesterdayDate, dates3to9, reuploads, platforms])

  // Count videos uploaded today (any platform)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const videosUploadedToday = useMemo(() => {
    return videos.filter((video) =>
      hasUploadOnDate(video, todayDate) || hasReuploadForVideoOnDate(video.id, todayDate)
    ).length
  }, [videos, todayDate])

  // Count videos uploaded yesterday
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const videosUploadedYesterday = useMemo(() => {
    return videos.filter((video) =>
      hasUploadOnDate(video, yesterdayDate) || hasReuploadForVideoOnDate(video.id, yesterdayDate)
    ).length
  }, [videos, yesterdayDate])

  // Count videos uploaded days 3-9
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const videosUploaded3to9 = useMemo(() => {
    return videos.filter((video) =>
      hasUploadOnAnyDateInRange(video, dates3to9) || hasReuploadForVideoOnAnyDateInRange(video.id, dates3to9)
    ).length
  }, [videos, dates3to9])

  // Total platform uploads count (sum of all platform uploads across all videos + reuploads)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const totalPlatformUploadsToday = useMemo(() => getTotalPlatformUploads(todayDate), [videos, reuploads, platforms, todayDate])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const totalPlatformUploadsYesterday = useMemo(() => getTotalPlatformUploads(yesterdayDate), [videos, reuploads, platforms, yesterdayDate])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const totalPlatformUploads3to9 = useMemo(() => getTotalPlatformUploads(dates3to9), [videos, reuploads, platforms, dates3to9])

  // Infinite scroll observer
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0]
    if (target.isIntersecting && !loadingMore && visibleCount < filteredVideos.length) {
      setLoadingMore(true)
      setTimeout(() => {
        setVisibleCount((prev) => prev + ITEMS_PER_PAGE)
        setLoadingMore(false)
      }, 800)
    }
  }, [loadingMore, visibleCount, filteredVideos.length])

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '20px',
      threshold: 0
    })

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [handleObserver])

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Videos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track video uploads across platforms with quick search and smart filters.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openAddDialog} size="medium">
          Add Video
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 2, mb: 2 }}>
        <StatCard
          filterKey="today"
          title="Total videos uploaded today"
          videoCount={videosUploadedToday}
          platformUploadCount={totalPlatformUploadsToday}
          targetDate={todayDate}
          uploadDateFilter={uploadDateFilter}
          setUploadDateFilter={setUploadDateFilter}
          videos={videos}
          reuploads={reuploads}
          platforms={platforms}
        />
        <StatCard
          filterKey="yesterday"
          title="Total videos uploaded yesterday"
          videoCount={videosUploadedYesterday}
          platformUploadCount={totalPlatformUploadsYesterday}
          targetDate={yesterdayDate}
          uploadDateFilter={uploadDateFilter}
          setUploadDateFilter={setUploadDateFilter}
          videos={videos}
          reuploads={reuploads}
          platforms={platforms}
        />
        <StatCard
          filterKey="range-3-9"
          title="Days 3-9 uploads"
          videoCount={videosUploaded3to9}
          platformUploadCount={totalPlatformUploads3to9}
          targetDate={dates3to9}
          uploadDateFilter={uploadDateFilter}
          setUploadDateFilter={setUploadDateFilter}
          videos={videos}
          reuploads={reuploads}
          platforms={platforms}
        />
      </Box>

      {/* Search and Filters */}
      <Box sx={{ 
        bgcolor: 'background.paper',
        p: 2,
        borderRadius: 1,
        mb: 2,
        display: 'flex',
        gap: 1.5,
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <Box sx={{ 
          flex: 1, 
          minWidth: 200,
          position: 'relative'
        }}>
          <SearchIcon sx={{ 
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'text.secondary',
            fontSize: 20,
            zIndex: 1
          }} />
          <TextField
            inputRef={searchInputRef}
            size="small"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ 
              width: '100%',
              '& .MuiOutlinedInput-root': {
                pl: 4
              }
            }}
          />
        </Box>
        <TextField
          size="small"
          label="Date"
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          sx={{ minWidth: { xs: '100%', sm: 160 } }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          label="Upload Date"
          type="date"
          value={customUploadDateFilter}
          onChange={(e) => setCustomUploadDateFilter(e.target.value)}
          sx={{ minWidth: { xs: '100%', sm: 160 } }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          sx={{ minWidth: { xs: '100%', sm: 150 } }}
          slotProps={{
            select: { 
              native: true,
              displayEmpty: true,
            } 
          }}
        >
          <option value="">Platform</option>
          {platforms.map((opt) => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </TextField>
        {(searchQuery || dateFilter || customUploadDateFilter || filterEmptyPlatform || platformFilter || uploadDateFilter) && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setSearchQuery('')
              setDateFilter('')
              setCustomUploadDateFilter('')
              setFilterEmptyPlatform(null)
              setPlatformFilter('')
              setUploadDateFilter('')
            }}
            startIcon={<CloseIcon />}
          >
            Clear
          </Button>
        )}
      </Box>

      {filterEmptyPlatform && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Showing videos without {filterEmptyPlatform} URL
        </Alert>
      )}

      {(searchQuery || dateFilter || customUploadDateFilter || filterEmptyPlatform || platformFilter) && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {filteredVideos.length} result{filteredVideos.length !== 1 ? 's' : ''} found
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredVideos.length === 0 ? (
        <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
          {searchQuery || dateFilter ? 'No videos found matching your criteria' : 'No videos yet. Click "Add Video" to create one!'}
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredVideos.slice(0, visibleCount).map((video) => {
            const videoId = video.youtube_url ? getYouTubeVideoId(video.youtube_url) : null
            return (
              <Card key={video.id}>
                <CardContent sx={{ py: 2, px: { xs: 2, md: 2.5 } }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    {/* YouTube Thumbnail */}
                    {videoId ? (
                      <Box
                        component="img"
                        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                        alt={video.title}
                        onClick={() => openVideoPlayer(video.youtube_url!)}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          if (target.src.includes('mqdefault')) {
                            target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                          } else if (target.src.includes('hqdefault')) {
                            target.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
                          } else {
                            target.style.display = 'none'
                          }
                        }}
                        sx={{
                          width: 120,
                          height: 160,
                          objectFit: 'cover',
                          borderRadius: 1,
                          cursor: 'pointer',
                          flexShrink: 0,
                          '&:hover': { opacity: 0.8, transition: 'opacity 0.2s' }
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 120,
                          height: 160,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 1,
                          bgcolor: 'grey.200',
                          flexShrink: 0,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                          No Video
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      {/* Title Row */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.5 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            flex: 1,
                          }}
                        >
                          {video.title}
                        </Typography>
                        {video.description && (
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedDescription(video.description || '')
                              setSelectedDescriptionVideo(video)
                              setDescriptionOpen(true)
                            }}
                            sx={{ p: 0.5 }}
                            title="View description"
                          >
                            <Info fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                      {/* Created At Date */}
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                        {new Date(video.created_at).toLocaleDateString('en-GB', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </Typography>

                      {/* Content with Action Buttons */}
                      <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          {/* Platforms Section */}
                          <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, textTransform: 'none', color: 'text.secondary', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                            Platforms
                          </Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, auto)' }, gap: 0.5, mb: 1.5, width: '100%' }}>
                            {platforms.map((platform) => {
                              const hasUrl = !!video[`${platform.key}_url` as keyof Video]
                              const icon = platformIcons[platform.key]
                              const isDateMatch = isPlatformDateMatch(platform.key, video)
                              const isReuploadMatch = isPlatformReuploadMatch(platform.key, video.id)

                              return (
                                <Chip
                                  key={platform.key}
                                  icon={icon || undefined}
                                  label={platform.label}
                                  size="small"
                                  onClick={() => hasUrl && copyToClipboard(video[`${platform.key}_url` as keyof Video] as string, platform.label)}
                                  sx={{
                                    cursor: hasUrl ? 'pointer' : 'default',
                                    opacity: hasUrl ? 1 : 0.4,
                                    fontWeight: 500,
                                    fontSize: 12,
                                    height: 28,
                                    '&:hover': hasUrl ? { opacity: 0.8 } : {},
                                    '& .MuiChip-icon': { fontSize: 16 },
                                    ...(isDateMatch && !isReuploadMatch && {
                                      border: '1px solid',
                                      borderColor: '#81c784',
                                    }),
                                    ...(isReuploadMatch && {
                                      border: '1px solid',
                                      borderColor: '#ffb74d',
                                      color: '#ff9800',
                                      '& .MuiChip-icon': { color: '#ff9800', fontSize: 16 },
                                    }),
                                  }}
                                  variant={hasUrl ? 'filled' : 'outlined'}
                                  color={hasUrl ? 'default' : 'default'}
                                />
                              )
                            })}
                          </Box>

                          {/* Google Drive Section */}
                          <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, textTransform: 'none', color: 'text.secondary', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
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
                                  title="Search in Google Drive (Latest)"
                                />
                                <Chip
                                  icon={<GoogleDriveIcon />}
                                  label="Arc"
                                  size="small"
                                  onClick={() => searchGoogleDriveArchive(video.title)}
                                  sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 }, height: 28 }}
                                  title="Search in Google Drive (Archive)"
                                />
                              </>
                            )}
                          </Box>

                          {/* Product Links */}
                          {(video.tiktok_product_url || video.shopee_product_url) && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.25, maxHeight: 30, overflow: 'hidden' }}>
                              {video.tiktok_product_url && (
                                <Chip
                                  icon={<TikTokIcon />}
                                  label="TikTok Shop"
                                  size="small"
                                  onClick={() => copyToClipboard(video.tiktok_product_url!, 'TikTok Shop')}
                                  sx={{ cursor: 'pointer', bgcolor: '#000', color: 'white', '&:hover': { bgcolor: '#333' }, height: 28 }}
                                />
                              )}
                              {video.shopee_product_url && (
                                <Chip
                                  icon={<Shop />}
                                  label="Shopee"
                                  size="small"
                                  onClick={() => copyToClipboard(video.shopee_product_url!, 'Shopee')}
                                  sx={{ cursor: 'pointer', bgcolor: '#EE4D2D', color: 'white', '&:hover': { bgcolor: '#D43D1F' }, height: 28 }}
                                />
                              )}
                            </Box>
                          )}
                        </Box>

                        {/* Action Buttons */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flexShrink: 0 }}>
                          <IconButton size="small" onClick={() => openUploadInfo(video)} title="Upload Info">
                            <Upload fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => openEditDialog(video)} title="Edit">
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteVideo(video.id)} title="Delete">
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )
          })}

          {/* Infinite scroll trigger */}
          <Box ref={observerTarget} sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            py: 2,
            minHeight: 60
          }}>
            {loadingMore && <CircularProgress size={24} />}
            {visibleCount >= filteredVideos.length && filteredVideos.length > ITEMS_PER_PAGE && (
              <Typography color="text.secondary" variant="body2">
                No more videos to load
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* Add/Edit Video Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">{editingVideo ? 'Edit Video' : 'Add Video'}</Typography>
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
            minRows={isMobile ? (descriptionFocused ? undefined : 3) : 6}
            maxRows={isMobile ? (descriptionFocused ? undefined : 3) : undefined}
            size={isMobile ? 'small' : 'medium'}
            onFocus={() => isMobile && setDescriptionFocused(true)}
            onBlur={() => isMobile && setDescriptionFocused(false)}
            sx={isMobile && descriptionFocused ? {
              '& .MuiInputBase-root': {
                minHeight: '75vh',
                alignItems: 'flex-start',
              }
            } : {}}
          />
          {editingVideo && (
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
          )}

          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
            Platform Links
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* TikTok */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                label="Upload Date"
                type="date"
                value={tiktokUploadDate}
                onChange={(e) => setTiktokUploadDate(e.target.value)}
                sx={{ flex: 1 }}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="TikTok URL"
                value={tiktokUrl}
                onChange={(e) => {
                  setTiktokUrl(e.target.value)
                  autoSetTodayDate(setTiktokUploadDate, tiktokUploadDate, e.target.value)
                }}
                sx={{ flex: 2 }}
                size="small"
                placeholder="https://..."
              />
              {editingVideo && (
                <IconButton
                  size="small"
                  onClick={() => openReuploadDialog('tiktok')}
                  title="Reupload TikTok"
                  color="warning"
                  sx={{ flexShrink: 0 }}
                >
                  <ReplayIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
            <TextField
              label="TikTok Product URL"
              value={tiktokProductUrl}
              onChange={(e) => setTiktokProductUrl(e.target.value)}
              fullWidth
              size="small"
              placeholder="https://..."
            />

            {/* YouTube */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                label="Upload Date"
                type="date"
                value={youtubeUploadDate}
                onChange={(e) => setYoutubeUploadDate(e.target.value)}
                sx={{ flex: 1 }}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="YouTube URL"
                value={youtubeUrl}
                onChange={(e) => {
                  setYoutubeUrl(e.target.value)
                  autoSetTodayDate(setYoutubeUploadDate, youtubeUploadDate, e.target.value)
                }}
                sx={{ flex: 2 }}
                size="small"
                placeholder="https://..."
              />
              {editingVideo && (
                <IconButton
                  size="small"
                  onClick={() => openReuploadDialog('youtube')}
                  title="Reupload YouTube"
                  color="warning"
                  sx={{ flexShrink: 0 }}
                >
                  <ReplayIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            {/* Facebook */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                label="Upload Date"
                type="date"
                value={facebookUploadDate}
                onChange={(e) => setFacebookUploadDate(e.target.value)}
                sx={{ flex: 1 }}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Facebook URL"
                value={facebookUrl}
                onChange={(e) => {
                  setFacebookUrl(e.target.value)
                  autoSetTodayDate(setFacebookUploadDate, facebookUploadDate, e.target.value)
                }}
                sx={{ flex: 2 }}
                size="small"
                placeholder="https://..."
              />
              {editingVideo && (
                <IconButton
                  size="small"
                  onClick={() => openReuploadDialog('facebook')}
                  title="Reupload Facebook"
                  color="warning"
                  sx={{ flexShrink: 0 }}
                >
                  <ReplayIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            {/* Instagram */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                label="Upload Date"
                type="date"
                value={instagramUploadDate}
                onChange={(e) => setInstagramUploadDate(e.target.value)}
                sx={{ flex: 1 }}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Instagram URL"
                value={instagramUrl}
                onChange={(e) => {
                  setInstagramUrl(e.target.value)
                  autoSetTodayDate(setInstagramUploadDate, instagramUploadDate, e.target.value)
                }}
                sx={{ flex: 2 }}
                size="small"
                placeholder="https://..."
              />
              {editingVideo && (
                <IconButton
                  size="small"
                  onClick={() => openReuploadDialog('instagram')}
                  title="Reupload Instagram"
                  color="warning"
                  sx={{ flexShrink: 0 }}
                >
                  <ReplayIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            {/* Shopee */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                label="Upload Date"
                type="date"
                value={shopeeUploadDate}
                onChange={(e) => setShopeeUploadDate(e.target.value)}
                sx={{ flex: 1 }}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Shopee URL"
                value={shopeeUrl}
                onChange={(e) => {
                  setShopeeUrl(e.target.value)
                  autoSetTodayDate(setShopeeUploadDate, shopeeUploadDate, e.target.value)
                }}
                sx={{ flex: 2 }}
                size="small"
                placeholder="https://..."
              />
              {editingVideo && (
                <IconButton
                  size="small"
                  onClick={() => openReuploadDialog('shopee')}
                  title="Reupload Shopee"
                  color="warning"
                  sx={{ flexShrink: 0 }}
                >
                  <ReplayIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
            <TextField
              label="Shopee Product URL"
              value={shopeeProductUrl}
              onChange={(e) => setShopeeProductUrl(e.target.value)}
              fullWidth
              size="small"
              placeholder="https://..."
            />

            {/* Threads */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                label="Upload Date"
                type="date"
                value={threadsUploadDate}
                onChange={(e) => setThreadsUploadDate(e.target.value)}
                sx={{ flex: 1 }}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Threads URL"
                value={threadsUrl}
                onChange={(e) => {
                  setThreadsUrl(e.target.value)
                  autoSetTodayDate(setThreadsUploadDate, threadsUploadDate, e.target.value)
                }}
                sx={{ flex: 2 }}
                size="small"
                placeholder="https://..."
              />
              {editingVideo && (
                <IconButton
                  size="small"
                  onClick={() => openReuploadDialog('threads')}
                  title="Reupload Threads"
                  color="warning"
                  sx={{ flexShrink: 0 }}
                >
                  <ReplayIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          {!isMobile && <Button onClick={() => setOpen(false)}>Cancel</Button>}
          <Button onClick={editingVideo ? handleUpdateVideo : handleAddVideo} variant="contained" fullWidth={isMobile}>
            {editingVideo ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reupload Popup (nested inside Edit Dialog) */}
      <Dialog
        open={reuploadDialogOpen}
        onClose={() => setReuploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              Reupload - {reuploadPlatform.charAt(0).toUpperCase() + reuploadPlatform.slice(1)}
            </Typography>
            <IconButton onClick={() => setReuploadDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              label="Platform"
              value={reuploadPlatform.charAt(0).toUpperCase() + reuploadPlatform.slice(1)}
              fullWidth
              margin="normal"
              size="small"
              disabled
            />
            <TextField
              label="URL"
              value={reuploadUrl}
              onChange={(e) => setReuploadUrl(e.target.value)}
              fullWidth
              margin="normal"
              size="small"
              placeholder="https://..."
            />
            <TextField
              label="Upload Date"
              type="date"
              value={reuploadUploadDate}
              onChange={(e) => setReuploadUploadDate(e.target.value)}
              fullWidth
              margin="normal"
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Notes (optional)"
              value={reuploadNotes}
              onChange={(e) => setReuploadNotes(e.target.value)}
              fullWidth
              margin="normal"
              size="small"
              multiline
              rows={3}
              placeholder="e.g. Reupload sebab video expired"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setReuploadDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveReupload} variant="contained" color="warning" startIcon={<ReplayIcon />}>
            Save Reupload
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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

      {/* Description Dialog */}
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
          {parseDescription(selectedDescription).map((section, index) => (
            <Box key={index} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {section.title}
                </Typography>
                {section.content && (
                  <IconButton 
                    size="small" 
                    onClick={() => copyToClipboard(section.content, section.title)}
                    title="Copy content"
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
              {section.content && (
                <Box 
                  sx={{ 
                    p: 1.5, 
                    bgcolor: 'grey.50', 
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'grey.200'
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line', fontSize: 13 }}>
                    {section.content}
                  </Typography>
                </Box>
              )}
            </Box>
          ))}

          {/* Product URLs Section */}
          {(selectedDescriptionVideo?.shopee_product_url || selectedDescriptionVideo?.tiktok_product_url) && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                Product Links
              </Typography>
              {selectedDescriptionVideo?.shopee_product_url && (
                <Box sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Shop sx={{ fontSize: 18, color: '#EE4D2D' }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#EE4D2D' }}>
                        Shopee Product URL
                      </Typography>
                    </Box>
                    <IconButton 
                      size="small" 
                      onClick={() => copyToClipboard(selectedDescriptionVideo.shopee_product_url!, 'Shopee Product')}
                      title="Copy URL"
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box 
                    sx={{ 
                      p: 1.5, 
                      bgcolor: 'grey.50', 
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'grey.200'
                    }}
                  >
                    <Typography variant="body2" sx={{ fontSize: 13, wordBreak: 'break-all' }}>
                      {selectedDescriptionVideo.shopee_product_url}
                    </Typography>
                  </Box>
                </Box>
              )}
              {selectedDescriptionVideo?.tiktok_product_url && (
                <Box sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TikTokIcon sx={{ fontSize: 18 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        TikTok Product URL
                      </Typography>
                    </Box>
                    <IconButton 
                      size="small" 
                      onClick={() => copyToClipboard(selectedDescriptionVideo.tiktok_product_url!, 'TikTok Product')}
                      title="Copy URL"
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box 
                    sx={{ 
                      p: 1.5, 
                      bgcolor: 'grey.50', 
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'grey.200'
                    }}
                  >
                    <Typography variant="body2" sx={{ fontSize: 13, wordBreak: 'break-all' }}>
                      {selectedDescriptionVideo.tiktok_product_url}
                    </Typography>
                  </Box>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        {!isMobile && (
          <DialogActions>
            <Button onClick={() => setDescriptionOpen(false)}>Close</Button>
          </DialogActions>
        )}
      </Dialog>

      {/* Video Player Dialog */}
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
          {selectedVideoUrl && getYouTubeVideoId(selectedVideoUrl) && (
            <>
              {videoLoading && (
                <Box sx={{
                  width: '100%',
                  height: isMobile ? '85vh' : '80vh',
                  maxWidth: 450,
                  mx: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#000'
                }}>
                  <CircularProgress color="primary" />
                </Box>
              )}
              <Box sx={{
                position: 'relative',
                width: '100%',
                height: isMobile ? '85vh' : '80vh',
                maxWidth: 450,
                mx: 'auto',
                overflow: 'hidden',
                display: videoLoading ? 'none' : 'block'
              }}>
                <iframe
                  src={`https://www.youtube.com/embed/${getYouTubeVideoId(selectedVideoUrl)}?autoplay=1`}
                  title="YouTube video player"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none'
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  onLoad={handleVideoLoad}
                />
              </Box>
            </>
          )}

          {/* Available Platforms */}
          <Box sx={{ mt: 2, px: 2, pb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Available Platforms:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {(() => {
                const currentVideo = videos.find(v =>
                  v.youtube_url === selectedVideoUrl ||
                  v.facebook_url === selectedVideoUrl ||
                  v.instagram_url === selectedVideoUrl ||
                  v.tiktok_url === selectedVideoUrl ||
                  v.threads_url === selectedVideoUrl ||
                  v.shopee_url === selectedVideoUrl
                )

                if (!currentVideo) return null

                return getAvailablePlatforms(currentVideo).map(platform => {
                  const url = currentVideo[`${platform.key}_url` as keyof Video] as string
                  const isYouTube = platform.key === 'youtube'
                  const icon = platformIcons[platform.key]

                  return (
                    <Button
                      key={platform.key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant={isYouTube ? 'contained' : 'outlined'}
                      startIcon={icon || undefined}
                      size="small"
                    >
                      {platform.label}
                    </Button>
                  )
                })
              })()}
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Upload Info Dialog */}
      <Dialog open={uploadInfoOpen} onClose={() => setUploadInfoOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Upload Info - {selectedVideoForInfo?.title}</span>
            <IconButton onClick={() => setUploadInfoOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table size={isMobile ? 'small' : 'medium'}>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Platform</strong></TableCell>
                    <TableCell><strong>Upload Date</strong></TableCell>
                    <TableCell><strong>URL</strong></TableCell>
                    <TableCell><strong>Reuploads</strong></TableCell>
                  </TableRow>
                </TableHead>
              <TableBody>
                {selectedVideoForInfo && platforms.map((platform) => {
                  const url = selectedVideoForInfo[`${platform.key}_url` as keyof Video] as string | null
                  const uploadDate = selectedVideoForInfo[`${platform.key}_upload_date` as keyof Video] as string | null
                  const isUploaded = !!url

                  return (
                    <TableRow key={platform.key} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {platformIcons[platform.key]}
                          {platform.label}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {isUploaded ? (uploadDate || '-') : (
                          <Chip label="Not Uploaded" size="small" color="warning" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>
                        {isUploaded ? (
                          <Button
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="small"
                            variant="text"
                          >
                            Open Link
                          </Button>
                        ) : (
                          <Typography color="text.secondary" variant="body2">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const videoReuploads = reuploads.filter(r => r.video_id === selectedVideoForInfo.id && r.platform === platform.key)
                          if (videoReuploads.length === 0) {
                            return <Typography color="text.secondary" variant="body2">-</Typography>
                          }
                          return (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              {videoReuploads.map((r) => (
                                <Chip
                                  key={r.id}
                                  label={r.upload_date || 'No date'}
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                  sx={{ fontSize: 11, height: 20, fontWeight: 500 }}
                                />
                              ))}
                            </Box>
                          )
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
    </Box>
  )
}