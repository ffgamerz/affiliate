import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Button,
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

const platformConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
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

  useEffect(() => {
    const fetchData = async () => {
      const { data: videosData } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false })

      setVideos(videosData || [])
      setLoading(false)
    }

    fetchData()
  }, [])

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
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats.count}
                    <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                      /{stats.total}
                    </Typography>
                  </Typography>
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