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
  Tooltip,
  IconButton,
} from '@mui/material'
import {
  Add as AddIcon,
  YouTube,
  MusicNote as TikTokIcon,
  Facebook,
  Instagram,
  Shop,
  Forum as ThreadsIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import { supabase } from '../lib/supabase'

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

const platformConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  youtube: { label: 'YouTube', color: '#FF0000', bg: '#FF000020', icon: <YouTube /> },
  tiktok: { label: 'TikTok', color: '#000000', bg: '#00000020', icon: <TikTokIcon /> },
  facebook: { label: 'Facebook', color: '#1877F2', bg: '#1877F220', icon: <Facebook /> },
  instagram: { label: 'Instagram', color: '#E4405F', bg: '#E4405F20', icon: <Instagram /> },
  shopee: { label: 'Shopee', color: '#EE4D2D', bg: '#EE4D2D20', icon: <Shop /> },
  threads: { label: 'Threads', color: '#000000', bg: '#00000020', icon: <ThreadsIcon /> },
}

export default function UnsyncedDashboard() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      const { data: videosData } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false })

      // Filter videos that haven't been uploaded to ANY platform
      const unsyncedVideos = (videosData || [])
        .filter(video => {
          const hasAnyUrl = platforms.some(platform => 
            video[`${platform}_url` as keyof Video] as string
          )
          return !hasAnyUrl
        })
      
      setVideos(unsyncedVideos)
      setLoading(false)
    }

    fetchData()
  }, [])

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Unsynced Videos
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/videos', { state: { openAddDialog: true } })}>
          Add Video
        </Button>
      </Box>

      {/* Count Summary */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Chip 
          label={`Total Unsynced: ${videos.length}`} 
          color="warning"
          icon={<AddIcon />}
          sx={{ fontSize: 16, fontWeight: 600 }}
        />
      </Box>

      {/* Video Cards */}
      {videos.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No unsynced videos found!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              All videos have been uploaded to at least one platform.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {videos.map((video) => {
            const isExpanded = expandedVideoId === video.id
            
            return (
              <Card key={video.id} sx={{ 
                '&:hover': {
                  boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s ease'
                }
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {video.title}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => setExpandedVideoId(isExpanded ? null : video.id)}
                    >
                      {isExpanded ? <CloseIcon /> : <AddIcon />}
                    </IconButton>
                  </Box>
                  
                  {video.description && !isExpanded && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {video.description.length > 100 
                        ? video.description.substring(0, 100) + '...' 
                        : video.description
                      }
                    </Typography>
                  )}
                  
                  {isExpanded && video.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {video.description}
                    </Typography>
                  )}
                  
                  {/* All platforms with status badges - using Box instead of Chip icon */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {platforms.map((platform) => {
                      const config = platformConfig[platform]
                      const url = video[`${platform}_url` as keyof Video] as string | null
                      const isUnsynced = !url
                      
                      return (
                        <Tooltip 
                          key={platform} 
                          title={isUnsynced ? `${config.label}: Not uploaded` : `${config.label}: Uploaded`}
                        >
                          <Box 
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 2,
                              fontSize: '0.875rem',
                              fontWeight: isUnsynced ? 600 : 400,
                              backgroundColor: isUnsynced ? `${config.color}20` : config.bg,
                              border: `1px solid ${isUnsynced ? config.color : 'divider'}`,
                              color: isUnsynced ? config.color : 'text.secondary',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                transform: 'scale(1.05)'
                              }
                            }}
                          >
                            {config.icon}
                            <span>{config.label}</span>
                          </Box>
                        </Tooltip>
                      )
                    })}
                  </Box>
                  
                  <Typography variant="caption" color="text.secondary">
                    Created: {new Date(video.created_at).toLocaleDateString('en-GB', { 
                      day: 'numeric', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </Typography>
                </CardContent>
              </Card>
            )
          })}
        </Box>
      )}
    </Box>
  )
}