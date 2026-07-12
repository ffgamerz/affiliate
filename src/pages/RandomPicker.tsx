import { useEffect, useState } from 'react'
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
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  Edit,
  YouTube,
  Facebook,
  Instagram,
  Info,
  Upload,
  MusicNote as TikTokIcon,
  Shop,
  Forum as ThreadsIcon,
  Close as CloseIcon,
  Shuffle as ShuffleIcon,
} from '@mui/icons-material'
import { supabase } from '../lib/supabase'

// Google Drive Icon SVG component
const GoogleDriveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 87.3 76.6" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M63.7 28.1l-11.9-6.8c-.1 0-.2-.1-.3-.1l-11.9-6.8c-.1 0-.2 0-.3.1L21.9 28c-.1.1-.2.1-.3.1L6.1 34.9c-.1 0-.2.1-.1.2v12.3c0 .1.1.2.2.2l15.6 9.1c.1 0 .2 0 .3-.1l11.9 6.8c.1 0 .2.1.3.1l11.9 6.8c.1 0 .2 0 .3-.1l11.9-6.8c.1 0 .2-.1.3-.1l11.9-6.8c.1 0 .2 0 .3.1l11.9 6.8c.1 0 .2.1.3.1l15.6-9.1c.1 0 .2-.1.2-.2V35c0-.1-.1-.2-.2-.2l-15.6-9.1c-.1 0-.2-.1-.3-.1z" fill="#0066CC"/>
    <path d="M63.7 28.1L44.2 4.2c-.1-.1-.2-.1-.3 0L21.9 28c-.1.1-.2.1-.3.1-.1L6.1 34.9c-.1 0-.2.1-.1.2v12.3c0 .1.1.2.2.2l15.6 9.1c.1 0 .2 0 .3-.1l11.9 6.8c.1 0 .2.1.3.1l11.9 6.8c.1 0 .2 0 .3-.1l11.9-6.8c.1 0 .2-.1.3-.1l11.9-6.8c.1 0 .2 0 .3.1l11.9 6.8c.1 0 .2.1.3.1l15.6-9.1c.1 0 .2-.1.2-.2V35c0-.1-.1-.2-.2-.2l-15.6-9.1c-.1 0-.2-.1-.3-.1z" fill="#00AC47"/>
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

const platforms = [
  { key: 'youtube', label: 'YouTube' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'threads', label: 'Threads' },
  { key: 'shopee', label: 'Shopee' },
]

const platformIcons: Record<string, React.ReactElement | null> = {
  youtube: <YouTube />,
  tiktok: <TikTokIcon />,
  facebook: <Facebook />,
  instagram: <Instagram />,
  threads: <ThreadsIcon />,
  shopee: <Shop />,
}

export default function RandomPicker() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [descriptionOpen, setDescriptionOpen] = useState(false)
  const [selectedDescription, setSelectedDescription] = useState('')
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false)
  const [selectedVideoUrl, setSelectedVideoUrl] = useState('')
  const [videoLoading, setVideoLoading] = useState(false)
  const [uploadInfoOpen, setUploadInfoOpen] = useState(false)
  const [selectedVideoForInfo, setSelectedVideoForInfo] = useState<Video | null>(null)

  // Random picker state
  const [selectedRandomVideo, setSelectedRandomVideo] = useState<Video | null>(null)
  const [randomPickerPlatform, setRandomPickerPlatform] = useState<string>('')
  const [randomPickerDateFilter, setRandomPickerDateFilter] = useState<string>('')
  const [randomPickerMonth, setRandomPickerMonth] = useState<string>('')
  const [randomPickerYear, setRandomPickerYear] = useState<string>('')
  const [availableYears, setAvailableYears] = useState<string[]>([])

  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
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

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: videosData } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false })

    setVideos(videosData || [])
    setLoading(false)
  }

  // Extract available years from videos
  useEffect(() => {
    if (videos.length > 0) {
      const years = [...new Set(videos.map(v => v.created_at.substring(0, 4)))].sort((a, b) => b.localeCompare(a))
      setAvailableYears(years)
    }
  }, [videos])

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

    if (createdAt) {
      updateData.created_at = new Date(createdAt).toISOString()
    }

    const { error } = await supabase
      .from('videos')
      .update(updateData)
      .eq('id', editingVideo.id)

    if (!error) {
      if (selectedRandomVideo && selectedRandomVideo.id === editingVideo.id) {
        setSelectedRandomVideo({
          ...editingVideo,
          ...updateData,
          created_at: createdAt ? new Date(createdAt).toISOString() : editingVideo.created_at,
        })
      }
      setOpen(false)
      setEditingVideo(null)
      resetForm()
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

  const openEditDialog = (video: Video) => {
    setEditingVideo(video)
    setTitle(video.title)
    setDescription(video.description || '')
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

  const copyToClipboard = async (text: string, platform: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setSnackbar({ open: true, message: `${platform} URL copied to clipboard!` })
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to copy URL' })
    }
  }

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

  const openVideoPlayer = (url: string) => {
    setSelectedVideoUrl(url)
    setVideoPlayerOpen(true)
    setVideoLoading(true)
  }

  const openUploadInfo = (video: Video) => {
    setSelectedVideoForInfo(video)
    setUploadInfoOpen(true)
  }

  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

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

  const handleVideoLoad = () => {
    setVideoLoading(false)
  }

  // Pick random video from filtered list (optionally filtered by platform and date)
  const pickRandomVideo = () => {
    let videosToPick = videos
    
    if (randomPickerPlatform) {
      videosToPick = videosToPick.filter(video => {
        const url = video[`${randomPickerPlatform}_url` as keyof Video] as string | null
        return !!url
      })
    }
    
    if (randomPickerDateFilter === 'old') {
      videosToPick = videosToPick.filter(video => {
        const videoDate = new Date(video.created_at)
        const now = new Date()
        const diffDays = (now.getTime() - videoDate.getTime()) / (1000 * 60 * 60 * 24)
        return diffDays > 365
      })
    } else if (randomPickerDateFilter === 'latest') {
      videosToPick = videosToPick.filter(video => {
        const videoDate = new Date(video.created_at)
        const now = new Date()
        const diffDays = (now.getTime() - videoDate.getTime()) / (1000 * 60 * 60 * 24)
        return diffDays <= 365
      })
    } else if (randomPickerDateFilter === 'month' && randomPickerMonth) {
      videosToPick = videosToPick.filter(video => {
        const videoDate = video.created_at.substring(0, 7)
        return videoDate === randomPickerMonth
      })
    } else if (randomPickerDateFilter === 'year' && randomPickerYear) {
      videosToPick = videosToPick.filter(video => {
        const videoDate = video.created_at.substring(0, 4)
        return videoDate === randomPickerYear
      })
    }
    
    if (videosToPick.length === 0) return
    const randomIndex = Math.floor(Math.random() * videosToPick.length)
    setSelectedRandomVideo(videosToPick[randomIndex])
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Random Video Picker
        </Typography>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          select
          value={randomPickerPlatform}
          onChange={(e) => setRandomPickerPlatform(e.target.value)}
          sx={{ minWidth: 120 }}
          slotProps={{
            select: { 
              native: true,
              displayEmpty: true,
            } 
          }}
        >
          <option value="">All Platforms</option>
          {platforms.map((opt) => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </TextField>
        <TextField
          size="small"
          select
          value={randomPickerDateFilter}
          onChange={(e) => setRandomPickerDateFilter(e.target.value)}
          sx={{ minWidth: 120 }}
          slotProps={{
            select: { 
              native: true,
              displayEmpty: true,
            } 
          }}
        >
          <option value="">All Dates</option>
          <option value="old">Old (365+ days)</option>
          <option value="latest">Latest (365 days)</option>
          <option value="month">By Month</option>
          <option value="year">By Year</option>
        </TextField>
        {randomPickerDateFilter === 'month' && (
          <TextField
            size="small"
            type="month"
            label="Month"
            value={randomPickerMonth}
            onChange={(e) => setRandomPickerMonth(e.target.value)}
            sx={{ minWidth: 150 }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        )}
        {randomPickerDateFilter === 'year' && (
          <TextField
            size="small"
            select
            value={randomPickerYear}
            onChange={(e) => setRandomPickerYear(e.target.value)}
            sx={{ minWidth: 100 }}
            slotProps={{
              select: { 
                native: true,
                displayEmpty: true,
              } 
            }}
          >
            <option value="">Select Year</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </TextField>
        )}
      </Box>

      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<ShuffleIcon />}
          onClick={pickRandomVideo}
          size="medium"
          disabled={videos.length === 0}
        >
          Pick Random
        </Button>
      </Box>

      {/* Random Video Display - Direct on page (not popup) */}
      {selectedRandomVideo && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: 2, px: { xs: 2, md: 2.5 } }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              {selectedRandomVideo.youtube_url && getYouTubeVideoId(selectedRandomVideo.youtube_url) ? (
                <Box
                  component="img"
                  src={`https://img.youtube.com/vi/${getYouTubeVideoId(selectedRandomVideo.youtube_url) || ''}/mqdefault.jpg`}
                  alt={selectedRandomVideo.title}
                  onClick={() => openVideoPlayer(selectedRandomVideo.youtube_url!)}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    const videoId = getYouTubeVideoId(selectedRandomVideo.youtube_url!) || ''
                    if (target.src.includes('mqdefault')) {
                      target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                    } else if (target.src.includes('hqdefault')) {
                      target.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
                    } else {
                      target.style.display = 'none'
                    }
                  }}
                  sx={{
                    width: 68,
                    height: 120,
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
                    width: 68,
                    height: 120,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 1,
                    bgcolor: 'grey.200',
                    flexShrink: 0,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                    No Video
                  </Typography>
                </Box>
              )}

              <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
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
                    {selectedRandomVideo.title}
                  </Typography>
                  {selectedRandomVideo.description && (
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedDescription(selectedRandomVideo.description || '')
                        setDescriptionOpen(true)
                      }}
                      sx={{ p: 0.5 }}
                      title="View description"
                    >
                      <Info fontSize="small" />
                    </IconButton>
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                  {new Date(selectedRandomVideo.created_at).toLocaleDateString('en-GB', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, auto)' }, gap: 0.5, mb: 0.5, width: '100%' }}>
                      {platforms.map((platform) => {
                        const hasUrl = !!selectedRandomVideo[`${platform.key}_url` as keyof Video]
                        const icon = platformIcons[platform.key]

                        return (
                          <Chip
                            key={platform.key}
                            icon={icon || undefined}
                            label={platform.label}
                            size="small"
                            onClick={() => hasUrl && copyToClipboard(selectedRandomVideo[`${platform.key}_url` as keyof Video] as string, platform.label)}
                            sx={{
                              cursor: hasUrl ? 'pointer' : 'default',
                              opacity: hasUrl ? 1 : 0.4,
                              fontWeight: 500,
                              fontSize: 12,
                              '&:hover': hasUrl ? { opacity: 0.8 } : {},
                              '& .MuiChip-icon': { fontSize: 16 },
                            }}
                            variant={hasUrl ? 'filled' : 'outlined'}
                            color={hasUrl ? 'default' : 'default'}
                          />
                        )
                      })}
                    </Box>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                      {isMobileDevice() ? (
                        <Chip
                          icon={<GoogleDriveIcon />}
                          label="Drive"
                          size="small"
                          onClick={() => searchGoogleDriveAll(selectedRandomVideo.title)}
                          sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                          title="Search in Google Drive"
                        />
                      ) : (
                        <>
                          <Chip
                            icon={<GoogleDriveIcon />}
                            label="Drive"
                            size="small"
                            onClick={() => searchGoogleDriveLatest(selectedRandomVideo.title)}
                            sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                            title="Search in Google Drive (Latest)"
                          />
                          <Chip
                            icon={<GoogleDriveIcon />}
                            label="Arc"
                            size="small"
                            onClick={() => searchGoogleDriveArchive(selectedRandomVideo.title)}
                            sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                            title="Search in Google Drive (Archive)"
                          />
                        </>
                      )}
                    </Box>

                    {(selectedRandomVideo.tiktok_product_url || selectedRandomVideo.shopee_product_url) && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.25, maxHeight: 30, overflow: 'hidden' }}>
                        {selectedRandomVideo.tiktok_product_url && (
                          <Chip
                            icon={<TikTokIcon />}
                            label="TikTok Shop"
                            size="small"
                            onClick={() => copyToClipboard(selectedRandomVideo.tiktok_product_url!, 'TikTok Shop')}
                            sx={{ cursor: 'pointer', bgcolor: '#000', color: 'white', '&:hover': { bgcolor: '#333' } }}
                          />
                        )}
                        {selectedRandomVideo.shopee_product_url && (
                          <Chip
                            icon={<Shop />}
                            label="Shopee"
                            size="small"
                            onClick={() => copyToClipboard(selectedRandomVideo.shopee_product_url!, 'Shopee')}
                            sx={{ cursor: 'pointer', bgcolor: '#EE4D2D', color: 'white', '&:hover': { bgcolor: '#D43D1F' } }}
                          />
                        )}
                      </Box>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flexShrink: 0 }}>
                    <IconButton size="small" onClick={() => openUploadInfo(selectedRandomVideo)} title="Upload Info">
                      <Upload fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => openEditDialog(selectedRandomVideo)} title="Edit">
                      <Edit fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
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
            rows={isMobile ? 3 : 6}
            size={isMobile ? 'small' : 'medium'}
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
                onChange={(e) => setTiktokUrl(e.target.value)}
                sx={{ flex: 2 }}
                size="small"
                placeholder="https://..."
              />
            </Box>
            <TextField
              label="TikTok Product URL"
              value={tiktokProductUrl}
              onChange={(e) => setTiktokProductUrl(e.target.value)}
              fullWidth
              size="small"
              placeholder="https://..."
            />

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
                onChange={(e) => setYoutubeUrl(e.target.value)}
                sx={{ flex: 2 }}
                size="small"
                placeholder="https://..."
              />
            </Box>

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
                onChange={(e) => setFacebookUrl(e.target.value)}
                sx={{ flex: 2 }}
                size="small"
                placeholder="https://..."
              />
            </Box>

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
                onChange={(e) => setInstagramUrl(e.target.value)}
                sx={{ flex: 2 }}
                size="small"
                placeholder="https://..."
              />
            </Box>

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
                onChange={(e) => setShopeeUrl(e.target.value)}
                sx={{ flex: 2 }}
                size="small"
                placeholder="https://..."
              />
            </Box>
            <TextField
              label="Shopee Product URL"
              value={shopeeProductUrl}
              onChange={(e) => setShopeeProductUrl(e.target.value)}
              fullWidth
              size="small"
              placeholder="https://..."
            />

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
                onChange={(e) => setThreadsUrl(e.target.value)}
                sx={{ flex: 2 }}
                size="small"
                placeholder="https://..."
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          {!isMobile && <Button onClick={() => setOpen(false)}>Cancel</Button>}
          <Button onClick={editingVideo ? handleUpdateVideo : undefined} variant="contained" fullWidth={isMobile}>
            {editingVideo ? 'Update' : 'Add'}
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
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 2 }}>
            {selectedDescription}
          </Typography>
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

                return platforms.filter(p => {
                  const url = currentVideo[`${p.key}_url` as keyof Video] as string | null
                  return !!url
                }).map(platform => {
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