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
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material'
import {
  Edit as EditIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import { supabase } from '../lib/supabase'

interface Video {
  id: string
  title: string
  description: string | null
  created_at: string
}

interface DateMismatchVideo extends Video {
  extractedDate: string | null
  mismatch: boolean
}

// Function to extract date from title (supports DD-MM-YYYY and DD/MM/YYYY formats)
function extractDateFromTitle(title: string): string | null {
  // Match DD-MM-YYYY or DD/MM/YYYY format
  const datePattern = /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/
  const match = title.match(datePattern)
  
  if (match) {
    const [, day, month, year] = match
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  
  return null
}

// Function to format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export default function DateMismatchChecker() {
  const [videos, setVideos] = useState<DateMismatchVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<DateMismatchVideo | null>(null)
  const [newDate, setNewDate] = useState('')
  const [updating, setUpdating] = useState(false)

  const fetchVideos = async () => {
    setLoading(true)
    const { data: videosData } = await supabase
      .from('videos')
      .select('id, title, description, created_at')
      .order('created_at', { ascending: false })

    if (videosData) {
      const processedVideos: DateMismatchVideo[] = videosData.map(video => {
        const extractedDate = extractDateFromTitle(video.title)
        const createdAtDate = video.created_at ? video.created_at.split('T')[0] : null
        const mismatch = extractedDate !== null && extractedDate !== createdAtDate
        
        return {
          ...video,
          extractedDate,
          mismatch
        }
      })
      
      // Filter only videos with date in title and mismatch
      const mismatchedVideos = processedVideos.filter(v => v.mismatch)
      setVideos(mismatchedVideos)
    }
    
    setLoading(false)
  }

  useEffect(() => {
    fetchVideos()
  }, [])

  const handleEditClick = (video: DateMismatchVideo) => {
    setSelectedVideo(video)
    setNewDate(video.extractedDate || '')
    setEditDialogOpen(true)
  }

  const handleUpdateDate = async () => {
    if (!selectedVideo || !newDate) return
    
    setUpdating(true)
    const { error } = await supabase
      .from('videos')
      .update({ created_at: newDate })
      .eq('id', selectedVideo.id)

    if (!error) {
      setEditDialogOpen(false)
      setSelectedVideo(null)
      fetchVideos()
    }
    
    setUpdating(false)
  }

  const totalVideos = videos.length
  const videosWithDateInTitle = videos.filter(v => v.extractedDate).length

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Date Mismatch Checker
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Videos where created_at doesn't match the date in title.
          </Typography>
        </Box>
        <IconButton onClick={fetchVideos} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 2 }}>
        <Card>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Mismatched Videos
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {totalVideos}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Videos with Date in Title
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {videosWithDateInTitle}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : videos.length === 0 ? (
        <Alert severity="success" sx={{ mt: 2 }}>
          All videos have matching dates! No mismatches found.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Created At (DB)</TableCell>
                <TableCell>Extracted Date (Title)</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {videos.map((video) => (
                <TableRow key={video.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {video.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={formatDate(video.created_at)} 
                      color="error" 
                      size="small" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={video.extractedDate ? formatDate(video.extractedDate) : 'No date found'} 
                      color="primary" 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      size="small" 
                      onClick={() => handleEditClick(video)}
                      title="Edit created_at"
                    >
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarIcon />
            Edit Created At Date
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedVideo && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedVideo.title}
              </Typography>
              <TextField
                label="Created At"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                fullWidth
                size="medium"
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleUpdateDate} 
            variant="contained" 
            disabled={updating || !newDate}
          >
            {updating ? <CircularProgress size={20} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}