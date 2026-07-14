import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  YouTube,
  Facebook,
  Instagram,
  MusicNote as TikTokIcon,
  Shop,
  Forum as ThreadsIcon,
} from '@mui/icons-material'
import { supabase } from '../lib/supabase'

interface Reupload {
  id: string
  video_id: string
  platform: string
  url: string | null
  upload_date: string | null
  notes: string | null
  created_at: string
}

interface Video {
  id: string
  title: string
  created_at: string
}

interface GroupedReuploads {
  video: Video
  reuploads: Reupload[]
}

const platformIcons: Record<string, React.ReactElement | null> = {
  youtube: <YouTube />,
  tiktok: <TikTokIcon />,
  facebook: <Facebook />,
  instagram: <Instagram />,
  threads: <ThreadsIcon />,
  shopee: <Shop />,
}

const platformColors: Record<string, string> = {
  youtube: '#FF0000',
  tiktok: '#000000',
  facebook: '#1877F2',
  instagram: '#E4405F',
  shopee: '#EE4D2D',
  threads: '#000000',
}

export default function Reuploads() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [reuploads, setReuploads] = useState<Reupload[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [groupedReuploads, setGroupedReuploads] = useState<GroupedReuploads[]>([])
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingReupload, setEditingReupload] = useState<Reupload | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [editUploadDate, setEditUploadDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    // Group reuploads by video
    const grouped: GroupedReuploads[] = videos.map(video => ({
      video,
      reuploads: reuploads.filter(r => r.video_id === video.id),
    })).filter(g => g.reuploads.length > 0)
      .sort((a, b) => {
        // Sort by latest reupload date
        const aLatest = a.reuploads.reduce((latest, r) => r.created_at > latest ? r.created_at : latest, '')
        const bLatest = b.reuploads.reduce((latest, r) => r.created_at > latest ? r.created_at : latest, '')
        return bLatest.localeCompare(aLatest)
      })

    setGroupedReuploads(grouped)
  }, [reuploads, videos])

  const fetchData = async () => {
    const [reuploadsData, videosData] = await Promise.all([
      supabase.from('reuploads').select('*').order('created_at', { ascending: false }),
      supabase.from('videos').select('id, title, created_at'),
    ])

    setReuploads(reuploadsData.data || [])
    setVideos(videosData.data || [])
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reupload record?')) return

    const { error } = await supabase.from('reuploads').delete().eq('id', id)
    if (!error) {
      setSnackbar({ open: true, message: 'Reupload deleted', severity: 'success' })
      fetchData()
    } else {
      setSnackbar({ open: true, message: 'Failed to delete', severity: 'error' })
    }
  }

  const openEditDialog = (reupload: Reupload) => {
    setEditingReupload(reupload)
    setEditUrl(reupload.url || '')
    setEditUploadDate(reupload.upload_date || '')
    setEditNotes(reupload.notes || '')
    setEditDialogOpen(true)
  }

  const handleEditSave = async () => {
    if (!editingReupload) return

    const { error } = await supabase
      .from('reuploads')
      .update({
        url: editUrl || null,
        upload_date: editUploadDate || null,
        notes: editNotes || null,
      })
      .eq('id', editingReupload.id)

    if (!error) {
      setEditDialogOpen(false)
      setEditingReupload(null)
      setSnackbar({ open: true, message: 'Reupload updated', severity: 'success' })
      fetchData()
    } else {
      setSnackbar({ open: true, message: 'Failed to update', severity: 'error' })
    }
  }

  const getVideoTitle = (videoId: string): string => {
    return videos.find(v => v.id === videoId)?.title || 'Unknown Video'
  }

  const getVideoCreatedAt = (videoId: string): string => {
    const video = videos.find(v => v.id === videoId)
    if (!video?.created_at) return ''
    return new Date(video.created_at).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Reuploads
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track video reupload history across platforms.
          </Typography>
        </Box>
        <Chip
          label={`Total: ${reuploads.length} reupload${reuploads.length !== 1 ? 's' : ''}`}
          color="warning"
          variant="outlined"
        />
      </Box>

      {/* Empty state */}
      {reuploads.length === 0 ? (
        <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
          No reuploads yet. Click the reupload button in the video edit dialog to add one.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {groupedReuploads.map((group) => (
            <Card key={group.video.id}>
              <CardContent sx={{ py: 2, px: { xs: 2, md: 2.5 } }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {group.video.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  Original: {getVideoCreatedAt(group.video.id)}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {group.reuploads.map((reupload) => (
                    <Box
                      key={reupload.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'warning.50',
                        border: '1px solid',
                        borderColor: 'warning.200',
                      }}
                    >
                      {/* Platform Icon */}
                      <Box sx={{ color: platformColors[reupload.platform] || '#666', display: 'flex', flexShrink: 0 }}>
                        {platformIcons[reupload.platform] || null}
                      </Box>

                      {/* Details */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                          <Chip
                            label={reupload.platform.charAt(0).toUpperCase() + reupload.platform.slice(1)}
                            size="small"
                            color="warning"
                            variant="outlined"
                            sx={{ fontWeight: 600, fontSize: 11, height: 22 }}
                          />
                          {reupload.upload_date && (
                            <Typography variant="caption" color="text.secondary">
                              {new Date(reupload.upload_date + 'T00:00:00').toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            • Reuploaded: {new Date(reupload.created_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </Typography>
                        </Box>

                        {reupload.url && (
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: 12,
                              color: 'text.secondary',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: 400,
                              mt: 0.25,
                            }}
                          >
                            {reupload.url}
                          </Typography>
                        )}

                        {reupload.notes && (
                          <Typography
                            variant="body2"
                            sx={{ fontSize: 12, color: 'text.secondary', fontStyle: 'italic', mt: 0.25 }}
                          >
                            Note: {reupload.notes}
                          </Typography>
                        )}
                      </Box>

                      {/* Actions */}
                      <Box sx={{ display: 'flex', flexShrink: 0 }}>
                        <IconButton size="small" onClick={() => openEditDialog(reupload)} title="Edit">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(reupload.id)} title="Delete">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Edit Reupload</Typography>
            <IconButton onClick={() => setEditDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {editingReupload && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mt: 1 }}>
                <Box sx={{ color: platformColors[editingReupload.platform] }}>
                  {platformIcons[editingReupload.platform] || null}
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {editingReupload.platform.charAt(0).toUpperCase() + editingReupload.platform.slice(1)}
                </Typography>
                <Chip
                  label={getVideoTitle(editingReupload.video_id)}
                  size="small"
                  variant="outlined"
                  sx={{ ml: 'auto', maxWidth: 200 }}
                />
              </Box>

              <TextField
                label="URL"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                fullWidth
                margin="normal"
                size="small"
                placeholder="https://..."
              />
              <TextField
                label="Upload Date"
                type="date"
                value={editUploadDate}
                onChange={(e) => setEditUploadDate(e.target.value)}
                fullWidth
                margin="normal"
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                fullWidth
                margin="normal"
                size="small"
                multiline
                rows={3}
                placeholder="Why was this reuploaded?"
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained" color="warning">
            Save Changes
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
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}