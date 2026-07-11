import { useEffect, useState, useRef, useCallback } from 'react'
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
} from '@mui/material'
import { Add, Edit, Delete, YouTube, Facebook, Instagram, Info, Upload } from '@mui/icons-material'
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
  tiktok: null,
  facebook: <Facebook />,
  instagram: <Instagram />,
  threads: null,
  shopee: null,
}

export default function Videos() {
  const location = useLocation()
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
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [filterEmptyPlatform, setFilterEmptyPlatform] = useState<string | null>(null)
  
  // Pagination states
  const ITEMS_PER_PAGE = 10
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)
  const [loadingMore, setLoadingMore] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)
  
  // Copy to clipboard state
  const [snackbar, setSnackbar] = useState({ open: false, message: '' })
  
  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [youtubeUploadDate, setYoutubeUploadDate] = useState('')
  const [facebookUrl, setFacebookUrl] = useState('')
  const [facebookUploadDate, setFacebookUploadDate] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [instagramUploadDate, setInstagramUploadDate] = useState('')
  const [shopeeUrl, setShopeeUrl] = useState('')
  const [shopeeUploadDate, setShopeeUploadDate] = useState('')
  const [threadsUrl, setThreadsUrl] = useState('')
  const [threadsUploadDate, setThreadsUploadDate] = useState('')
  const [tiktokUrl, setTiktokUrl] = useState('')
  const [tiktokUploadDate, setTiktokUploadDate] = useState('')

  useEffect(() => {
    fetchData()
    
    // Check if navigated from Dashboard with platform filter
    if (location.state && (location.state as any).filterEmptyPlatform) {
      setFilterEmptyPlatform((location.state as any).filterEmptyPlatform)
    }
  }, [location])

  const fetchData = async () => {
    const { data: videosData } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false })
      // .order('id', { ascending: false })

    setVideos(videosData || [])
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
      threads_url: threadsUrl || null,
      threads_upload_date: threadsUploadDate || null,
      tiktok_url: tiktokUrl || null,
      tiktok_upload_date: tiktokUploadDate || null,
    })

    if (!error) {
      setOpen(false)
      resetForm()
      fetchData()
    }
  }

  const handleUpdateVideo = async () => {
    if (!editingVideo) return

    const { error } = await supabase
      .from('videos')
      .update({
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
        threads_url: threadsUrl || null,
        threads_upload_date: threadsUploadDate || null,
        tiktok_url: tiktokUrl || null,
        tiktok_upload_date: tiktokUploadDate || null,
      })
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
    setYoutubeUrl('')
    setYoutubeUploadDate('')
    setFacebookUrl('')
    setFacebookUploadDate('')
    setInstagramUrl('')
    setInstagramUploadDate('')
    setShopeeUrl('')
    setShopeeUploadDate('')
    setThreadsUrl('')
    setThreadsUploadDate('')
    setTiktokUrl('')
    setTiktokUploadDate('')
  }

  const openEditDialog = (video: Video) => {
    setEditingVideo(video)
    setTitle(video.title)
    setDescription(video.description || '')
    setYoutubeUrl(video.youtube_url || '')
    setYoutubeUploadDate(video.youtube_upload_date || '')
    setFacebookUrl(video.facebook_url || '')
    setFacebookUploadDate(video.facebook_upload_date || '')
    setInstagramUrl(video.instagram_url || '')
    setInstagramUploadDate(video.instagram_upload_date || '')
    setShopeeUrl(video.shopee_url || '')
    setShopeeUploadDate(video.shopee_upload_date || '')
    setThreadsUrl(video.threads_url || '')
    setThreadsUploadDate(video.threads_upload_date || '')
    setTiktokUrl(video.tiktok_url || '')
    setTiktokUploadDate(video.tiktok_upload_date || '')
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
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to copy URL' })
    }
  }

  const openAddDialog = () => {
    setEditingVideo(null)
    resetForm()
    // Set upload dates to today by default
    setYoutubeUploadDate(getTodayDate())
    setFacebookUploadDate(getTodayDate())
    setInstagramUploadDate(getTodayDate())
    setShopeeUploadDate(getTodayDate())
    setThreadsUploadDate(getTodayDate())
    setTiktokUploadDate(getTodayDate())
    setOpen(true)
  }

  // Helper function to extract YouTube video ID
  const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null
    
    // Match various YouTube URL formats including Shorts
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

  // Search video in Google Drive - Latest folder
  const searchGoogleDriveLatest = (videoTitle: string) => {
    const latestFolderId = '1-1cXk5CecrMqVFN0krVA3JUf-SrCJejY'
    // On mobile, don't use parent: filter to avoid showing folder ID in the search bar
    const searchQuery = isMobileDevice()
      ? encodeURIComponent(videoTitle)
      : encodeURIComponent(`${videoTitle} parent:${latestFolderId}`)
    window.open(`https://drive.google.com/drive/u/0/search?q=${searchQuery}`, '_blank')
  }

  // Search video in Google Drive - Archive folder
  const searchGoogleDriveArchive = (videoTitle: string) => {
    const archiveFolderId = '1DYoHgOxk3UAB6FQgWgbUhbgx9Xg74vDR'
    // On mobile, don't use parent: filter to avoid showing folder ID in the search bar
    const searchQuery = isMobileDevice()
      ? encodeURIComponent(videoTitle)
      : encodeURIComponent(`${videoTitle} parent:${archiveFolderId}`)
    window.open(`https://drive.google.com/drive/u/0/search?q=${searchQuery}`, '_blank')
  }

  // Search video in all Google Drive (mobile - no folder filter)
  const searchGoogleDriveAll = (videoTitle: string) => {
    const searchQuery = encodeURIComponent(videoTitle)
    window.open(`https://drive.google.com/drive/u/0/search?q=${searchQuery}`, '_blank')
  }

  // Handle iframe load
  const handleVideoLoad = () => {
    setVideoLoading(false)
  }

  // Filter videos based on search query, date, and empty platform filter
  const filteredVideos = videos.filter((video) => {
    const matchesSearch = searchQuery === '' || 
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (video.description && video.description.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesDate = dateFilter === '' || 
      video.created_at.split('T')[0] === dateFilter
    
    const matchesEmptyPlatform = filterEmptyPlatform === null || 
      !video[`${filterEmptyPlatform}_url` as keyof Video]
    
    return matchesSearch && matchesDate && matchesEmptyPlatform
  })

  // Infinite scroll observer - load more when scrolled to bottom
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Videos</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openAddDialog}>
          Add Video
        </Button>
      </Box>

      {/* Search and Filter */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          label="Search Videos"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flex: 1, minWidth: 250 }}
          placeholder="Search by title or description..."
        />
        <TextField
          label="Filter by Date"
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          sx={{ minWidth: 180 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        {(searchQuery || dateFilter || filterEmptyPlatform) && (
          <Button 
            variant="outlined" 
            onClick={() => {
              setSearchQuery('')
              setDateFilter('')
              setFilterEmptyPlatform(null)
            }}
          >
            Clear Filters
          </Button>
        )}
      </Box>
      
      {filterEmptyPlatform && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Showing videos without {filterEmptyPlatform} URL
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredVideos.length === 0 ? (
        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
          {searchQuery || dateFilter ? 'No videos found matching your criteria' : 'No videos yet. Click "Add Video" to create one!'}
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredVideos.slice(0, visibleCount).map((video) => (
            <Card key={video.id}>
              <CardContent>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'start' }}>
                  {/* YouTube Thumbnail */}
                  {video.youtube_url && (() => {
                    const videoId = getYouTubeVideoId(video.youtube_url)
                    if (videoId) {
                      return (
                        <Box
                          component="img"
                          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                          alt={video.title}
                          onClick={() => openVideoPlayer(video.youtube_url!)}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            // Try hqdefault first
                            if (target.src.includes('mqdefault')) {
                              target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                            } 
                            // If hqdefault also fails, try maxresdefault
                            else if (target.src.includes('hqdefault')) {
                              target.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
                            }
                            // If all fail, hide the image
                            else {
                              target.style.display = 'none'
                            }
                          }}
                          sx={{
                            width: 90,
                            height: 160,
                            objectFit: 'cover',
                            borderRadius: 1,
                            cursor: 'pointer',
                            flexShrink: 0,
                            '&:hover': {
                              opacity: 0.8,
                              transition: 'opacity 0.2s'
                            }
                          }}
                        />
                      )
                    }
                    return null
                  })()}
                  
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Typography variant="h6">{video.title}</Typography>
                      {video.description && (
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedDescription(video.description || '')
                            setDescriptionOpen(true)
                          }}
                          sx={{ p: 0.5 }}
                          title="View description"
                        >
                          <Info fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {platforms.map((platform) => {
                        const platformData = video[`${platform.key}_url` as keyof Video] as string | null
                        const hasUrl = !!platformData
                        const icon = platformIcons[platform.key]
                        
                        return (
                          <Chip
                            key={platform.key}
                            icon={icon || undefined}
                            label={platform.label}
                            size="small"
                            onClick={() => hasUrl && copyToClipboard(platformData!, platform.label)}
                            sx={{ 
                              cursor: hasUrl ? 'pointer' : 'default',
                              opacity: hasUrl ? 1 : 0.5,
                              '&:hover': hasUrl ? { opacity: 0.8 } : {}
                            }}
                          />
                        )
                      })}
                      
                      {/* Google Drive Search Buttons */}
                      {isMobileDevice() ? (
                        <Chip
                          icon={<GoogleDriveIcon />}
                          label="Drive"
                          size="small"
                          onClick={() => searchGoogleDriveAll(video.title)}
                          sx={{ 
                            cursor: 'pointer',
                            '&:hover': { opacity: 0.8 }
                          }}
                          title="Search in Google Drive"
                        />
                      ) : (
                        <>
                          <Chip
                            icon={<GoogleDriveIcon />}
                            label="Drive"
                            size="small"
                            onClick={() => searchGoogleDriveLatest(video.title)}
                            sx={{ 
                              cursor: 'pointer',
                              '&:hover': { opacity: 0.8 }
                            }}
                            title="Search in Google Drive (Latest)"
                          />
                          <Chip
                            icon={<GoogleDriveIcon />}
                            label="Archive"
                            size="small"
                            onClick={() => searchGoogleDriveArchive(video.title)}
                            sx={{ 
                              cursor: 'pointer',
                              '&:hover': { opacity: 0.8 }
                            }}
                            title="Search in Google Drive (Archive)"
                          />
                        </>
                      )}
                    </Box>
                  </Box>
                  
                  <Box>
                    <IconButton 
                      onClick={() => openUploadInfo(video)}
                      title="Upload Info"
                    >
                      <Upload />
                    </IconButton>
                    <IconButton onClick={() => openEditDialog(video)}>
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteVideo(video.id)}>
                      <Delete />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
          
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

      {/* Video Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingVideo ? 'Edit Video' : 'Add Video'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            margin="normal"
            multiline
            rows={6}
          />
          
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            Platform Links
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                label="Upload Date"
                type="date"
                value={youtubeUploadDate}
                onChange={(e) => setYoutubeUploadDate(e.target.value)}
                sx={{ flex: 1 }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="YouTube URL"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                sx={{ flex: 2 }}
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
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Facebook URL"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                sx={{ flex: 2 }}
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
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Instagram URL"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                sx={{ flex: 2 }}
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
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Shopee URL"
                value={shopeeUrl}
                onChange={(e) => setShopeeUrl(e.target.value)}
                sx={{ flex: 2 }}
                placeholder="https://..."
              />
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                label="Upload Date"
                type="date"
                value={threadsUploadDate}
                onChange={(e) => setThreadsUploadDate(e.target.value)}
                sx={{ flex: 1 }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Threads URL"
                value={threadsUrl}
                onChange={(e) => setThreadsUrl(e.target.value)}
                sx={{ flex: 2 }}
                placeholder="https://..."
              />
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                label="Upload Date"
                type="date"
                value={tiktokUploadDate}
                onChange={(e) => setTiktokUploadDate(e.target.value)}
                sx={{ flex: 1 }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="TikTok URL"
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                sx={{ flex: 2 }}
                placeholder="https://..."
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={editingVideo ? handleUpdateVideo : handleAddVideo} variant="contained">
            {editingVideo ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for copy notification */}
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
      <Dialog open={descriptionOpen} onClose={() => setDescriptionOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Description</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 2 }}>
            {selectedDescription}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDescriptionOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Video Player Dialog */}
      <Dialog open={videoPlayerOpen} onClose={() => setVideoPlayerOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Video Player</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {/* YouTube Embed Player - Vertical 9:16 aspect ratio, full height */}
          {selectedVideoUrl && getYouTubeVideoId(selectedVideoUrl) && (
            <>
              {videoLoading && (
                <Box sx={{ 
                  width: '100%',
                  height: '80vh',
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
                height: '80vh',
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
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Available Platforms:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {(() => {
                // Find the current video to get all platforms
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
        <DialogActions>
          <Button onClick={() => setVideoPlayerOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Upload Info Dialog */}
      <Dialog open={uploadInfoOpen} onClose={() => setUploadInfoOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Upload Info - {selectedVideoForInfo?.title}</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
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
        <DialogActions>
          <Button onClick={() => setUploadInfoOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}