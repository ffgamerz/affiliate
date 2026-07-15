import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  ChevronLeft,
  ChevronRight,
  YouTube,
  MusicNote as TikTokIcon,
  Facebook,
  Instagram,
  Shop,
  Forum as ThreadsIcon,
  Today as TodayIcon,
  Search as SearchIcon,
} from '@mui/icons-material'
import { supabase } from '../lib/supabase'

interface Video {
  id: string
  title: string
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

interface Reupload {
  id: string
  video_id: string
  platform: string
  url: string | null
  upload_date: string | null
  notes: string | null
  created_at: string
}

interface UploadEntry {
  videoId: string
  videoTitle: string
  platform: string
  isReupload: boolean
  url: string | null
}

interface PlatformEntry {
  platform: string
  isReupload: boolean
  url: string | null
}

const platforms = [
  { key: 'youtube', label: 'YouTube', icon: <YouTube sx={{ fontSize: 14 }} />, color: '#FF0000' },
  { key: 'tiktok', label: 'TikTok', icon: <TikTokIcon sx={{ fontSize: 14 }} />, color: '#000000' },
  { key: 'facebook', label: 'Facebook', icon: <Facebook sx={{ fontSize: 14 }} />, color: '#1877F2' },
  { key: 'instagram', label: 'Instagram', icon: <Instagram sx={{ fontSize: 14 }} />, color: '#E4405F' },
  { key: 'threads', label: 'Threads', icon: <ThreadsIcon sx={{ fontSize: 14 }} />, color: '#000000' },
  { key: 'shopee', label: 'Shopee', icon: <Shop sx={{ fontSize: 14 }} />, color: '#EE4D2D' },
]

const platformIconMap: Record<string, React.ReactNode> = {}
platforms.forEach(p => { platformIconMap[p.key] = p.icon })

const platformColorMap: Record<string, string> = {}
platforms.forEach(p => { platformColorMap[p.key] = p.color })

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function UploadCalendar() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const navigate = useNavigate()

  const [videos, setVideos] = useState<Video[]>([])
  const [reuploads, setReuploads] = useState<Reupload[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return now.getMonth()
  })
  const [currentYear, setCurrentYear] = useState(() => {
    const now = new Date()
    return now.getFullYear()
  })

  // Details dialog state
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedDateStr, setSelectedDateStr] = useState('')
  const [selectedDateGrouped, setSelectedDateGrouped] = useState<{ videoId: string; videoTitle: string; platforms: PlatformEntry[] }[]>([])

  useEffect(() => {
    fetchData()
  }, [])

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

  // Build upload map: date -> UploadEntry[]
  const buildUploadMap = (): Record<string, UploadEntry[]> => {
    const map: Record<string, UploadEntry[]> = {}

    // Add original uploads from videos table
    videos.forEach((video) => {
      platforms.forEach((platform) => {
        const uploadDate = video[`${platform.key}_upload_date` as keyof Video] as string | null
        if (uploadDate) {
          if (!map[uploadDate]) {
            map[uploadDate] = []
          }
          // Avoid duplicate entries for same video+platform
          const exists = map[uploadDate].some(
            (entry) => entry.videoId === video.id && entry.platform === platform.key && !entry.isReupload
          )
          if (!exists) {
            const url = video[`${platform.key}_url` as keyof Video] as string | null
            map[uploadDate].push({
              videoId: video.id,
              videoTitle: video.title,
              platform: platform.key,
              isReupload: false,
              url: url,
            })
          }
        }
      })
    })

    // Add reuploads from reuploads table
    reuploads.forEach((reupload) => {
      if (reupload.upload_date) {
        if (!map[reupload.upload_date]) {
          map[reupload.upload_date] = []
        }
        // Find the video title for this reupload
        const video = videos.find(v => v.id === reupload.video_id)
        const videoTitle = video?.title || 'Unknown Video'
        
        map[reupload.upload_date].push({
          videoId: reupload.video_id,
          videoTitle: videoTitle,
          platform: reupload.platform,
          isReupload: true,
          url: reupload.url,
        })
      }
    })

    return map
  }

  const uploadMap = buildUploadMap()

  // Get today's date in Asia/Kuala_Lumpur timezone for consistent "today" highlighting
  const getTodayDate = () => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    return formatter.format(new Date())
  }

  // Calendar grid calculations
  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number): number => {
    // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    // We want Monday = 0, so shift
    const day = new Date(year, month, 1).getDay()
    return day === 0 ? 6 : day - 1 // Monday = 0
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDayOffset = getFirstDayOfMonth(currentYear, currentMonth)

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const goToToday = () => {
    const now = new Date()
    setCurrentMonth(now.getMonth())
    setCurrentYear(now.getFullYear())
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const getDateStr = (year: number, month: number, day: number): string => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const handleVideoClick = (dateStr: string) => {
    navigate('/videos', {
      state: { calendarUploadDate: dateStr }
    })
  }

  const openDetailsDialog = (dateStr: string, uploads: UploadEntry[]) => {
    setSelectedDateStr(dateStr)
    setSelectedDateGrouped(groupEntriesByVideo(uploads))
    setDetailsDialogOpen(true)
  }

  const handleDayCellClick = (dateStr: string, totalUploads: number, dayUploads: UploadEntry[]) => {
    if (totalUploads === 0) return
    openDetailsDialog(dateStr, dayUploads)
  }

  const formatDateDisplay = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  // Group entries by video for display
  const groupEntriesByVideo = (entries: UploadEntry[]): { videoId: string; videoTitle: string; platforms: PlatformEntry[] }[] => {
    const grouped: Record<string, { videoId: string; videoTitle: string; platforms: PlatformEntry[] }> = {}
    
    entries.forEach((entry) => {
      if (!grouped[entry.videoId]) {
        grouped[entry.videoId] = {
          videoId: entry.videoId,
          videoTitle: entry.videoTitle,
          platforms: [],
        }
      }
      // Add platform with its reupload status and URL
      const exists = grouped[entry.videoId].platforms.find(p => p.platform === entry.platform)
      if (!exists) {
        grouped[entry.videoId].platforms.push({
          platform: entry.platform,
          isReupload: entry.isReupload,
          url: entry.url,
        })
      }
    })

    return Object.values(grouped)
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Upload Calendar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View video uploads across platforms by date.
          </Typography>
        </Box>
      </Box>

      {/* Month Navigation */}
      <Card sx={{ mb: 2, overflow: 'visible' }}>
        <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={prevMonth} size="small">
                <ChevronLeft />
              </IconButton>
              <Typography variant="h5" sx={{ fontWeight: 600, minWidth: 200, textAlign: 'center' }}>
                {monthNames[currentMonth]} {currentYear}
              </Typography>
              <IconButton onClick={nextMonth} size="small">
                <ChevronRight />
              </IconButton>
            </Box>
            <IconButton onClick={goToToday} size="small" title="Go to today">
              <TodayIcon />
            </IconButton>
          </Box>

          {/* Day headers */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: { xs: 0.5, md: 1 }, mb: 1 }}>
            {DAYS_OF_WEEK.map((day) => (
              <Box
                key={day}
                sx={{
                  textAlign: 'center',
                  py: 0.5,
                  fontWeight: 600,
                  fontSize: { xs: 11, md: 13 },
                  color: 'text.secondary',
                }}
              >
                {isMobile ? day.charAt(0) : day}
              </Box>
            ))}
          </Box>

          {/* Calendar Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: { xs: 0.5, md: 1 } }}>
            {/* Empty cells for offset */}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <Box key={`empty-${i}`} sx={{ minHeight: { xs: 60, md: 100 } }} />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = getDateStr(currentYear, currentMonth, day)
              const todayStr = getTodayDate()
              const isToday = dateStr === todayStr
              const dayUploads = uploadMap[dateStr] || []
              const groupedVideos = groupEntriesByVideo(dayUploads)
              
              // Count original uploads and reuploads separately
              const originalUploads = dayUploads.filter(u => !u.isReupload).length
              const reuploadCount = dayUploads.filter(u => u.isReupload).length
              const totalUploads = dayUploads.length

              return (
                <Box
                  key={day}
                  onClick={() => handleDayCellClick(dateStr, totalUploads, dayUploads)}
                  sx={{
                    minHeight: { xs: 60, md: 100 },
                    border: '1px solid',
                    borderColor: isToday ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    p: { xs: 0.3, md: 0.5 },
                    bgcolor: isToday ? 'rgba(229, 57, 53, 0.04)' : 'background.paper',
                    overflow: 'hidden',
                    position: 'relative',
                    ...(isToday && {
                      boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
                    }),
                    ...(totalUploads > 0 && {
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }),
                  }}
                >
                  {/* Date number */}
                  <Typography
                    sx={{
                      fontSize: { xs: 11, md: 13 },
                      fontWeight: isToday ? 700 : 500,
                      color: isToday ? 'primary.main' : 'text.primary',
                      mb: 0.3,
                    }}
                  >
                    {day}
                  </Typography>

                  {/* Upload entries */}
                  {groupedVideos.length > 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.2, md: 0.3 } }}>
                      {groupedVideos.map((video) => (
                        <Box
                          key={video.videoId}
                          sx={{
                            borderRadius: 0.5,
                            p: 0.2,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: { xs: 9, md: 11 },
                              fontWeight: 600,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              lineHeight: 1.2,
                              mb: 0.1,
                            }}
                          >
                            {video.videoTitle}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.2, flexWrap: 'wrap' }}>
                            {video.platforms.map((p) => (
                              <Box
                                key={p.platform}
                                onClick={() => p.url && window.open(p.url, '_blank')}
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  color: p.isReupload ? 'warning.main' : 'success.main',
                                  fontSize: { xs: 9, md: 11 },
                                  lineHeight: 1,
                                  ...(p.url && {
                                    cursor: 'pointer',
                                    '&:hover': {
                                      opacity: 0.7,
                                    },
                                  }),
                                }}
                                title={`${p.platform}${p.isReupload ? ' (reupload)' : ''}`}
                              >
                                {platformIconMap[p.platform]}
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}

                  {/* Upload count badges - two badges for original and reupload */}
                  {(originalUploads > 0 || reuploadCount > 0) && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: { xs: 1, md: 2 },
                        right: { xs: 1, md: 2 },
                        display: 'flex',
                        gap: 0.3,
                        alignItems: 'center',
                      }}
                    >
                      {originalUploads > 0 && (
                        <Box
                          sx={{
                            bgcolor: 'success.main',
                            color: 'white',
                            borderRadius: '50%',
                            width: { xs: 16, md: 20 },
                            height: { xs: 16, md: 20 },
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: { xs: 9, md: 11 },
                            fontWeight: 700,
                          }}
                        >
                          {originalUploads}
                        </Box>
                      )}
                      {reuploadCount > 0 && (
                        <Box
                          sx={{
                            bgcolor: 'warning.main',
                            color: 'white',
                            borderRadius: '50%',
                            width: { xs: 16, md: 20 },
                            height: { xs: 16, md: 20 },
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: { xs: 9, md: 11 },
                            fontWeight: 700,
                          }}
                        >
                          {reuploadCount}
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              )
            })}
          </Box>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Uploads - {formatDateDisplay(selectedDateStr)}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {selectedDateGrouped.length === 0 ? (
            <Typography color="text.secondary">No uploads on this date.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {selectedDateGrouped.map((video) => (
                <Box
                  key={video.videoId}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'grey.50',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 600,
                      fontSize: 14,
                      mb: 0.5,
                    }}
                  >
                    {video.videoTitle}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {video.platforms.map((p) => (
                      <Chip
                        key={p.platform}
                        icon={platformIconMap[p.platform] as React.ReactElement}
                        label={platforms.find(pl => pl.key === p.platform)?.label || p.platform}
                        size="small"
                        variant="outlined"
                        clickable={!!p.url}
                        onClick={() => p.url && window.open(p.url, '_blank')}
                        sx={{
                          fontSize: 11,
                          borderColor: p.isReupload ? 'warning.main' : 'success.main',
                          color: p.isReupload ? 'warning.main' : 'success.main',
                          '& .MuiChip-icon': { 
                            color: p.isReupload ? 'warning.main' : 'success.main',
                            fontSize: 14 
                          },
                          ...(p.url && {
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: 'action.hover',
                            },
                          }),
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDetailsDialogOpen(false)} color="inherit">
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={() => {
              setDetailsDialogOpen(false)
              handleVideoClick(selectedDateStr)
            }}
          >
            Go To Videos
          </Button>
        </DialogActions>
      </Dialog>

      {/* Legend */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          Platform Legend:
        </Typography>
        {platforms.map((p) => (
          <Chip
            key={p.key}
            icon={p.icon as React.ReactElement}
            label={p.label}
            size="small"
            variant="outlined"
            sx={{
              fontSize: 11,
              '& .MuiChip-icon': { fontSize: 14 },
              borderColor: p.color,
              color: p.color,
            }}
          />
        ))}
        <Chip
          icon={<TodayIcon sx={{ fontSize: 14 }} />}
          label="Today"
          size="small"
          color="primary"
          variant="outlined"
          sx={{ fontSize: 11 }}
        />
      </Box>
    </Box>
  )
}