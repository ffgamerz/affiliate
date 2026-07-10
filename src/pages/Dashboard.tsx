import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.tsx'

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
}

const platforms = ['youtube', 'tiktok', 'facebook', 'instagram', 'threads', 'shopee']

export default function Dashboard() {
  const { user } = useAuth()
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      const { data: videosData } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setVideos(videosData || [])
      setLoading(false)
    }

    fetchData()
  }, [user])

  const getPlatformStats = () => {
    const totalVideos = videos.length
    const stats: Record<string, { count: number; total: number }> = {}
    
    platforms.forEach((platform) => {
      const count = videos.filter((video) => {
        const url = video[`${platform}_url` as keyof Video] as string | null
        return !!url
      }).length
      
      stats[platform] = {
        count,
        total: totalVideos
      }
    })
    
    return stats
  }

  const platformStats = getPlatformStats()

  const handlePlatformClick = (platform: string) => {
    if (platform === 'total') {
      // Navigate to videos page without any filter
      navigate('/videos')
    } else {
      // Navigate to videos page with platform filter
      navigate('/videos', { state: { filterEmptyPlatform: platform } })
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' } }}>
          <Card 
            sx={{ cursor: 'pointer' }}
            onClick={() => handlePlatformClick('total')}
          >
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Videos
              </Typography>
              <Typography variant="h3">{videos.length}</Typography>
            </CardContent>
          </Card>
        </Box>
        
        {Object.entries(platformStats).map(([platform, stats]) => (
          <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' } }} key={platform}>
            <Card 
              sx={{ cursor: 'pointer' }}
              onClick={() => handlePlatformClick(platform)}
            >
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </Typography>
                <Typography variant="h3">{stats.count}/{stats.total}</Typography>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      <Typography variant="h5" gutterBottom>
        Recent Videos
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {videos.slice(0, 4).map((video) => {
            // Extract YouTube video ID for thumbnail
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

            const videoId = video.youtube_url ? getYouTubeVideoId(video.youtube_url) : null

            return (
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 8px)' } }} key={video.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      {videoId && (
                        <Box
                          component="img"
                          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                          alt={video.title}
                          sx={{
                            width: 120,
                            height: 68,
                            objectFit: 'cover',
                            borderRadius: 1,
                            flexShrink: 0
                          }}
                        />
                      )}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="h6" sx={{ 
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {video.title}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )
          })}
        </Box>
      )}
    </Box>
  )
}