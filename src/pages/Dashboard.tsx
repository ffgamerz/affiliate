import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Button,
  Chip,
} from '@mui/material'
import {
  Add as AddIcon,
  YouTube,
  MusicNote as TikTokIcon,
  Facebook,
  Instagram,
  Shop,
  Forum as ThreadsIcon,
} from '@mui/icons-material'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.tsx'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

interface Video {
  id: string
  title: string
  description: string | null
  created_at: string
  youtube_url: string | null
  facebook_url: string | null
  instagram_url: string | null
  shopee_url: string | null
  threads_url: string | null
  tiktok_url: string | null
  youtube_upload_date: string | null
  tiktok_upload_date: string | null
  facebook_upload_date: string | null
  instagram_upload_date: string | null
  shopee_upload_date: string | null
  threads_upload_date: string | null
}

const platforms = ['youtube', 'tiktok', 'facebook', 'instagram', 'threads', 'shopee']

const platformConfig: Record<string, { label: string; color: string; icon: React.ReactElement }> = {
  youtube: { label: 'YouTube', color: '#FF0000', icon: <YouTube /> },
  tiktok: { label: 'TikTok', color: '#000000', icon: <TikTokIcon /> },
  facebook: { label: 'Facebook', color: '#1877F2', icon: <Facebook /> },
  instagram: { label: 'Instagram', color: '#E4405F', icon: <Instagram /> },
  shopee: { label: 'Shopee', color: '#EE4D2D', icon: <Shop /> },
  threads: { label: 'Threads', color: '#000000', icon: <ThreadsIcon /> },
}

export default function Dashboard() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    // Wait for auth session to restore before fetching, otherwise RLS returns 0 rows
    if (authLoading) return
    if (!user) {
      navigate('/login')
      return
    }

    const fetchData = async () => {
      const { data: videosData } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false })

      setVideos(videosData || [])
      setLoading(false)
    }

    fetchData()
  }, [authLoading, user, navigate])

  const getPlatformStats = () => {
    const totalVideos = videos.length
    const stats: Record<string, { count: number; total: number }> = {}

    platforms.forEach((platform) => {
      const count = videos.filter((video) => {
        const url = video[`${platform}_url` as keyof Video] as string | null
        return !!url
      }).length

      stats[platform] = { count, total: totalVideos }
    })

    return stats
  }

  // Get upload trend data per platform per month
  const getUploadTrend = () => {
    const monthMap: Record<string, Record<string, number>> = {}
    
    videos.forEach((video) => {
      platforms.forEach((platform) => {
        const uploadDate = video[`${platform}_upload_date` as keyof Video] as string | null
        if (uploadDate) {
          const month = uploadDate.substring(0, 7) // "YYYY-MM"
          if (!monthMap[month]) {
            monthMap[month] = {}
            platforms.forEach((p) => { monthMap[month][p] = 0 })
          }
          monthMap[month][platform]++
        }
      })
    })

    // Convert to array and sort by month
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, counts]) => ({
        month,
        ...counts,
      }))
  }

  const platformStats = getPlatformStats()
  const uploadTrend = getUploadTrend()

  // Heatmap data: content gap analysis per video per platform
  // Determine available years for filtering
  const allYears = [...new Set(videos.map(v => new Date(v.created_at).getFullYear()))].sort((a, b) => b - a)
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all')

  // Custom hover tooltip state (fast, follows cursor)
  const [tip, setTip] = useState<{ show: boolean; x: number; y: number; text: string }>({
    show: false,
    x: 0,
    y: 0,
    text: '',
  })

  // Filter videos by selected year
  const filteredVideos = selectedYear === 'all' 
    ? videos 
    : videos.filter(v => new Date(v.created_at).getFullYear() === selectedYear)

  const handlePlatformClick = (platform: string) => {
    if (platform === 'total') {
      navigate('/videos')
    } else {
      navigate('/videos', { state: { filterEmptyPlatform: platform } })
    }
  }

  // Helper to extract YouTube thumbnail
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
      const url = video[`${p}_url` as keyof Video] as string | null
      return !!url
    })
  }

  // Gap Finder: videos uploaded to >=1 platform but missing others (cross-post opportunities)
  const gapVideos = videos
    .map((video) => {
      const available = getAvailablePlatforms(video)
      const missing = platforms.filter((p) => !available.includes(p))
      return { video, available, missing }
    })
    .filter(({ available, missing }) => available.length > 0 && missing.length > 0)
    .sort((a, b) => {
      // most complete first, then oldest first (longest waiting)
      if (a.available.length !== b.available.length) return b.available.length - a.available.length
      return (a.video.created_at || '').localeCompare(b.video.created_at || '')
    })

  const missingCounts = platforms
    .map((p) => ({ platform: p, count: gapVideos.filter(({ missing }) => missing.includes(p)).length }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count)

  // Cross-Post: selected platform toggle + shuffled (random) result list
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [shuffled, setShuffled] = useState<Video[]>([])
  useEffect(() => {
    if (!selectedPlatform) { setShuffled([]); return }
    const pool = videos.filter((v) => {
      const url = v[`${selectedPlatform}_url` as keyof Video] as string | null
      return !url || url === ''
    })
    // Fisher-Yates shuffle so results are random, not in creation order
    const arr = [...pool]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    setShuffled(arr.slice(0, 5))
  }, [selectedPlatform, videos])

  // Focus a video on the Videos page (uses existing focus feature)
  const focusVideo = (videoId: string) => {
    localStorage.setItem('videos_focused_video_id', videoId)
    navigate('/videos', { state: { focusVideoId: videoId } })
  }

  if (loading || authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Dashboard
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/videos', { state: { openAddDialog: true } })}>
          Add Video
        </Button>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        {/* Total Videos Card */}
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(33.333% - 11px)', md: '1 1 calc(25% - 12px)' } }}>
          <Card
            sx={{ cursor: 'pointer', bgcolor: 'primary.main', color: 'white' }}
            onClick={() => handlePlatformClick('total')}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {videos.length}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                Total Videos
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Platform Cards */}
        {platforms.map((platform) => {
          const stats = platformStats[platform]
          const config = platformConfig[platform]
          const percentage = stats.total > 0 ? Math.round((stats.count / stats.total) * 100) : 0
          
          return (
            <Box key={platform} sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(33.333% - 11px)', md: '1 1 calc(25% - 12px)' } }}>
              <Card
                sx={{ cursor: 'pointer' }}
                onClick={() => handlePlatformClick(platform)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Box sx={{ color: config.color, display: 'flex' }}>
                      {config.icon}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {config.label}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {stats.count}
                      <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                        /{stats.total}
                      </Typography>
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      ({percentage}%)
                    </Typography>
                  </Box>
                  <Box sx={{ mt: 1, width: '100%', bgcolor: 'grey.200', borderRadius: 1, height: 6, overflow: 'hidden' }}>
                    <Box sx={{ width: `${percentage}%`, bgcolor: config.color, height: '100%', borderRadius: 1, transition: 'width 0.5s ease' }} />
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )
        })}
      </Box>

      {/* Upload Trend Chart */}
      {uploadTrend.length > 0 && (
        <Card sx={{ mb: 4, p: { xs: 2, md: 3 } }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            📈 Upload Trend
          </Typography>
          <Box sx={{ width: '100%', height: { xs: 250, md: 300 } }}>
            <ResponsiveContainer>
              <BarChart data={uploadTrend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => {
                    const [y, m] = val.split('-')
                    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                    return `${months[parseInt(m)-1]} ${y.slice(2)}`
                  }}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 12 }}
                  labelFormatter={(val) => {
                    const [y, m] = val.split('-')
                    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                    return `${months[parseInt(m)-1]} ${y}`
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {platforms.map((p) => (
                  <Bar
                    key={p}
                    dataKey={p}
                    name={platformConfig[p].label}
                    fill={platformConfig[p].color}
                    radius={[3, 3, 0, 0]}
                    stackId="a"
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Card>
      )}:

      {/* Content Gap Heatmap */}

      {filteredVideos.length > 0 && (
        <Card sx={{ mb: 4, p: { xs: 2, md: 3 } }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            📉 Content Gap Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Heatmap menunjukkan status upload setiap video ke setiap platform. Hijau = sudah di-upload, Merah = belum di-upload.
          </Typography>

          {/* Year selector - only show if more than 1 year of data */}
          {allYears.length > 1 && (
            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                Filter by year:
              </Typography>
              <Chip
                label="All Years"
                size="small"
                color={selectedYear === 'all' ? 'primary' : 'default'}
                onClick={() => setSelectedYear('all')}
                variant={selectedYear === 'all' ? 'filled' : 'outlined'}
              />
              {allYears.map((year) => (
                <Chip
                  key={year}
                  label={year.toString()}
                  size="small"
                  color={selectedYear === year ? 'primary' : 'default'}
                  onClick={() => setSelectedYear(year)}
                  variant={selectedYear === year ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          )}

          {/* CSS-grid heatmap - proper cell alignment, scrollable for many videos */}
          {/* grid 90px 1fr: the 1fr track gets a definite width so overflow-x:auto scrolls on mobile too (flex min-width:0 fails on mobile Safari/Chrome) */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 1, alignItems: 'flex-start', width: '100%', maxWidth: '100%' }}>
            {/* Y-axis: platform labels (sticky, NOT inside scroll area) */}
            <Box sx={{ display: 'grid', gridTemplateRows: `repeat(${platforms.length}, 22px)`, gap: '2px', width: 90, overflow: 'hidden' }}>
              {platforms.map((p) => (
                <Box
                  key={p}
                  sx={{
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#333',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {platformConfig[p].label}
                </Box>
              ))}
            </Box>

            {/* Scrollable heatmap grid: one column per video (1fr = definite width → scrolls on mobile) */}
            <Box sx={{ overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x', overscrollBehaviorX: 'contain', pb: 1, minWidth: 0, width: '100%', maxWidth: '100%' }}>
              <Box
                onMouseMove={(e) => {
                  const t = e.target as HTMLElement
                  if (t.dataset && t.dataset.p) {
                    setTip({
                      show: true,
                      x: e.clientX,
                      y: e.clientY,
                      text: `${t.dataset.title} — ${platformConfig[t.dataset.p as keyof typeof platformConfig]?.label}: ${t.dataset.uploaded === '1' ? 'Uploaded' : 'Gap'}`,
                    })
                  }
                }}
                onMouseLeave={() => setTip((s) => ({ ...s, show: false }))}
                sx={{
                  display: 'grid',
                  gridTemplateRows: `repeat(${platforms.length}, 22px)`,
                  gridAutoFlow: 'column',
                  gridAutoColumns: '10px',
                  gap: '2px',
                  width: 'max-content',
                }}
              >
                {filteredVideos.map((video) =>
                  platforms.map((platform) => {
                    const url = video[`${platform}_url` as keyof Video] as string | null
                    const uploaded = !!url
                    return (
                      <Box
                        key={`${video.id}-${platform}`}
                        data-v={video.id}
                        data-p={platform}
                        data-title={video.title}
                        data-uploaded={uploaded ? '1' : '0'}
                        sx={{
                          width: 10,
                          height: 22,
                          borderRadius: '2px',
                          bgcolor: uploaded ? '#4CAF50' : '#F44336',
                          cursor: 'pointer',
                        }}
                      />
                    )
                  })
                )}
              </Box>
            </Box>
          </Box>

          {tip.show && (
            <Box
              sx={{
                position: 'fixed',
                left: tip.x,
                top: tip.y + 14,
                transform: 'translateX(-50%)',
                bgcolor: 'rgba(0,0,0,0.85)',
                color: '#fff',
                fontSize: 11,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                zIndex: 9999,
              }}
            >
              {tip.text}
            </Box>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {filteredVideos.length} video · kotak hijau = di-upload, merah = belum. Tarik ke kanan untuk lihat lebih.
          </Typography>
        </Card>
      )}

      {/* Cross-Post Opportunities (Gap Finder) */}
      {gapVideos.length > 0 && (
        <Card sx={{ mb: 4, p: { xs: 2, md: 3 } }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 0.5 }}>
            🔍 Cross-Post Opportunities
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {gapVideos.length} video{gapVideos.length !== 1 ? 's' : ''} uploaded to at least one platform but still missing others. Tap a platform to filter videos that need it.
          </Typography>

          {/* Platform toggle — pick a platform to see shuffled cross-post candidates */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
            {missingCounts.map(({ platform, count }) => {
              const selected = selectedPlatform === platform
              return (
                <Chip
                  key={platform}
                  icon={platformConfig[platform].icon}
                  label={`${platformConfig[platform].label} · ${count}`}
                  color={selected ? 'primary' : 'default'}
                  variant={selected ? 'filled' : 'outlined'}
                  size="small"
                  onClick={() => setSelectedPlatform(selected ? null : platform)}
                  sx={{ '& .MuiChip-icon': { color: selected ? undefined : platformConfig[platform].color } }}
                />
              )
            })}
          </Box>

          {/* Shuffled candidate videos for the selected platform */}
          {selectedPlatform ? (
            shuffled.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {shuffled.length} cadangan rawak untuk {platformConfig[selectedPlatform].label} — klik untuk fokus
                </Typography>
                {shuffled.map((video) => {
                  const videoId = video.youtube_url ? getYouTubeVideoId(video.youtube_url) : null
                  const available = getAvailablePlatforms(video)
                  return (
                    <Box
                      key={video.id}
                      sx={{
                        display: 'flex',
                        gap: 1.5,
                        alignItems: 'center',
                        cursor: 'pointer',
                        p: 1,
                        borderRadius: 1.5,
                        transition: 'background-color 0.2s',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                      onClick={() => focusVideo(video.id)}
                    >
                      {videoId && (
                        <Box
                          component="img"
                          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                          alt={video.title}
                          sx={{ width: 48, height: 84, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }}
                        />
                      )}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, lineHeight: 1.2 }} noWrap>
                          {video.title}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                            posted →
                          </Typography>
                          {available.map((p) => (
                            <Box key={p} sx={{ color: platformConfig[p].color, display: 'flex' }}>
                              {platformConfig[p].icon}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                ✅ Semua video dah ada di {platformConfig[selectedPlatform].label}.
              </Typography>
            )
          ) : (
            <Typography variant="body2" color="text.secondary">
              Pilih platform di atas untuk lihat cadangan cross-post secara rawak.
            </Typography>
          )}
        </Card>
      )}

      {/* Recent Videos */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
          Recent Videos
        </Typography>

        {videos.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            No videos yet. Click "Add Video" to create one!
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {videos.slice(0, 5).map((video) => {
              const videoId = video.youtube_url ? getYouTubeVideoId(video.youtube_url) : null
              const availablePlatforms = getAvailablePlatforms(video)
              return (
                <Card key={video.id} sx={{ cursor: 'pointer' }} onClick={() => navigate('/videos')}>
                  <CardContent sx={{ py: 2, px: { xs: 2, md: 2.5 } }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      {videoId && (
                        <Box
                          component="img"
                          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                          alt={video.title}
                          sx={{
                            width: 68,
                            height: 120,
                            objectFit: 'cover',
                            borderRadius: 1.5,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5, lineHeight: 1.2 }}>
                          {video.title}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                          {availablePlatforms.map((p) => (
                            <Box key={p} sx={{ color: platformConfig[p].color, display: 'flex', alignItems: 'center', mr: 0.5 }}>
                              {platformConfig[p].icon}
                            </Box>
                          ))}
                          {video.created_at && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                              {new Date(video.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )
            })}
          </Box>
        )}
      </Box>
    </Box>
  )
}