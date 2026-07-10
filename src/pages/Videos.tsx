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
} from '@mui/material'
import { Add, Edit, Delete, Link as LinkIcon, YouTube, Facebook, Instagram, Videocam } from '@mui/icons-material'
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
  upload_date: string | null
  views: number | null
  likes: number | null
  status: string
}

const platformIcons: Record<string, React.ReactElement> = {
  youtube: <YouTube />,
  tiktok: <Videocam />,
  facebook: <Facebook />,
  instagram: <Instagram />,
  threads: <Typography variant="caption">T</Typography>,
  shopee: <Typography variant="caption">S</Typography>,
}

export default function Videos() {
  const { user } = useAuth()
  const [videos, setVideos] = useState<Video[]>([])
  const [platforms, setPlatforms] = useState<VideoPlatform[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    fetchData()
  }, [user])

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

  const getVideoPlatforms = (videoId: string) => {
    return platforms.filter((p) => p.video_id === videoId)
  }

  const handleAddVideo = async () => {
    if (!user || !title) return

    const { error } = await supabase.from('videos').insert({
      user_id: user.id,
      title,
      description,
    })

    if (!error) {
      setOpen(false)
      setTitle('')
      setDescription('')
      fetchData()
    }
  }

  const handleUpdateVideo = async () => {
    if (!editingVideo) return

    const { error } = await supabase
      .from('videos')
      .update({ title, description })
      .eq('id', editingVideo.id)

    if (!error) {
      setOpen(false)
      setEditingVideo(null)
      setTitle('')
      setDescription('')
      fetchData()
    }
  }

  const handleDeleteVideo = async (id: string) => {
    if (confirm('Are you sure you want to delete this video?')) {
      await supabase.from('videos').delete().eq('id', id)
      await supabase.from('video_platforms').delete().eq('video_id', id)
      fetchData()
    }
  }

  const openEditDialog = (video: Video) => {
    setEditingVideo(video)
    setTitle(video.title)
    setDescription(video.description || '')
    setOpen(true)
  }

  const openAddDialog = () => {
    setEditingVideo(null)
    setTitle('')
    setDescription('')
    setOpen(true)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Videos</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openAddDialog}>
          Add Video
        </Button>
      </Box>

      {loading ? (
        <Typography>Loading...</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {videos.map((video) => (
            <Card key={video.id}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <Box>
                    <Typography variant="h6">{video.title}</Typography>
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                      {video.description || 'No description'}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {getVideoPlatforms(video.id).map((platform) => (
                        <Chip
                          key={platform.id}
                          icon={platformIcons[platform.platform] || <LinkIcon />}
                          label={platform.platform}
                          color={platform.status === 'published' ? 'primary' : 'default'}
                          size="small"
                        />
                      ))}
                    </Box>
                  </Box>
                  
                  <Box>
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
        </Box>
      )}

      <Dialog open={open} onClose={() => setOpen(false)}>
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
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={editingVideo ? handleUpdateVideo : handleAddVideo} variant="contained">
            {editingVideo ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}