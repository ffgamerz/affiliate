import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
} from '@mui/material'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.tsx'

interface Video {
  id: string
  title: string
  description: string | null
  created_at: string
}

interface VideoPlatform {
  id: string
  video_id: string
  platform: string
  video_url: string | null
  status: string
}

export default function Dashboard() {
  const { user } = useAuth()
  const [videos, setVideos] = useState<Video[]>([])
  const [platforms, setPlatforms] = useState<VideoPlatform[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      const { data: videosData } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const { data: platformsData } = await supabase
        .from('video_platforms')
        .select('*')

      setVideos(videosData || [])
      setPlatforms(platformsData || [])
      setLoading(false)
    }

    fetchData()
  }, [user])

  const getPlatformStats = () => {
    const stats: Record<string, { total: number; published: number }> = {}
    platforms.forEach((p) => {
      if (!stats[p.platform]) stats[p.platform] = { total: 0, published: 0 }
      stats[p.platform].total += 1
      if (p.status === 'published') stats[p.platform].published += 1
    })
    return stats
  }

  const platformStats = getPlatformStats()

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Videos
              </Typography>
              <Typography variant="h3">{videos.length}</Typography>
            </CardContent>
          </Card>
        </Box>
        
        {Object.entries(platformStats).map(([platform, stats]) => (
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }} key={platform}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </Typography>
                <Typography variant="h3">{stats.published}/{stats.total}</Typography>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      <Typography variant="h5" gutterBottom>
        Recent Videos
      </Typography>
      
      {loading ? (
        <Typography>Loading...</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {videos.slice(0, 4).map((video) => (
            <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 8px)' } }} key={video.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{video.title}</Typography>
                  <Typography color="text.secondary" sx={{ mb: 1 }}>
                    {video.description || 'No description'}
                  </Typography>
                  <Button size="small" color="primary">
                    View Details
                  </Button>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}