import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.tsx'
import {
  Box, Typography, Card, CardContent, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, Chip, Snackbar, Alert, CircularProgress, Collapse,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Divider, useTheme, useMediaQuery, InputAdornment,
} from '@mui/material'
import {
  Add, Edit, Delete, YouTube, Facebook, Instagram, Info, Upload,
  MusicNote as TikTokIcon, Shop, Forum as ThreadsIcon,
  Search as SearchIcon, Close as CloseIcon, ContentCopy as CopyIcon,
  Replay as ReplayIcon, Bookmark, BookmarkBorder,
  ContentPaste as PasteIcon, AutoAwesome as AutoAwesomeIcon,
  ExpandLess, ExpandMore,
  Cloud,
  Campaign as CampaignIcon,
  Star, StarOutlined
} from '@mui/icons-material'
import { supabase } from '../lib/supabase'
import {
  fetchCampaignsWithTiers,
  computePeriods,
  computeCurrentPeriod,
  computeUploadCount,
  resolveTier,
  maxTierTarget,
  periodLabel,
  todayStr,
  computeTierProgresses,
} from '../lib/campaigns'
import type { CampaignWithTiers, CampaignTier, TierProgress } from '../lib/campaigns'
import { CampaignTierGrid } from '../components/CampaignTierCard'

const GoogleDriveIcon = () => <Cloud fontSize="small" />

interface Video {
  id: string; title: string; description: string | null; srt: string | null; created_at: string
  youtube_url: string | null; youtube_upload_date: string | null
  facebook_url: string | null; facebook_upload_date: string | null
  instagram_url: string | null; instagram_upload_date: string | null
  shopee_url: string | null; shopee_upload_date: string | null
  threads_url: string | null; threads_upload_date: string | null
  tiktok_url: string | null; tiktok_upload_date: string | null
  tiktok_product_url: string | null; shopee_product_url: string | null
}

interface Reupload {
  id: string; video_id: string; platform: string; url: string | null
  upload_date: string | null; notes: string | null; created_at: string
}

const platforms = [
  { key: 'youtube', label: 'YouTube' }, { key: 'tiktok', label: 'TikTok' },
  { key: 'facebook', label: 'Facebook' }, { key: 'instagram', label: 'Instagram' },
  { key: 'threads', label: 'Threads' }, { key: 'shopee', label: 'Shopee' },
]

interface DescriptionSection { title: string; content: string }

const parseDescription = (text: string): DescriptionSection[] => {
  if (!text) return []
  const sections: DescriptionSection[] = []
  const lines = text.split('\n')
  const sectionStartIndices: number[] = []
  lines.forEach((line, index) => { const t = line.trim(); if (t.startsWith('--') && t.endsWith('--')) sectionStartIndices.push(index) })
  if (sectionStartIndices.length === 0) { sections.push({ title: 'Content', content: text }); return sections }
  for (let i = 0; i < sectionStartIndices.length; i++) {
    const currentStart = sectionStartIndices[i]; const nextStart = sectionStartIndices[i + 1]
    const title = lines[currentStart].trim().replace(/^--\s*/, '').replace(/\s*--$/, '')
    const content = (nextStart ? lines.slice(currentStart + 1, nextStart) : lines.slice(currentStart + 1)).join('\n').trim()
    sections.push({ title, content })
  }
  return sections
}

const platformIcons: Record<string, React.ReactElement | null> = {
  youtube: <YouTube />, tiktok: <TikTokIcon />, facebook: <Facebook />,
  instagram: <Instagram />, threads: <ThreadsIcon />, shopee: <Shop />,
}

const getPlatformColor = (p: string): string => {
  const c: Record<string, string> = { youtube: '#FF0000', tiktok: '#000000', facebook: '#1877F2', instagram: '#E4405F', threads: '#000000', shopee: '#EE4D2D' }
  return c[p] || '#666666'
}

const buildUploadDateOrFilter = (date: string): string => platforms.map(p => `${p.key}_upload_date.eq.${date}`).join(',')

const formatDateLabel = (s?: string | null): string => {
  if (!s) return 'Continuous'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

const StatCard = ({ filterKey, title, videoCount, platformUploadCount, uploadDateFilter, onFilterClick, platformBreakdown }: {
  filterKey: 'today' | 'yesterday' | 'range-3-9'; title: string; videoCount: number; platformUploadCount: number
  uploadDateFilter: 'today' | 'yesterday' | 'range-3-9' | ''
  onFilterClick: (filterKey: 'today' | 'yesterday' | 'range-3-9') => void
  platformBreakdown: { key: string; original: number; reupload: number }[]
}) => (
  <Card sx={{ bgcolor: 'background.paper', cursor: 'pointer', transition: 'all 0.2s ease', border: uploadDateFilter === filterKey ? '1px solid' : '1px solid #f0f0f0', borderColor: uploadDateFilter === filterKey ? 'primary.main' : '#f0f0f0', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } }}
    onClick={() => onFilterClick(filterKey)}>
    <CardContent sx={{ p: 2.5 }}>
      <Typography variant="caption" sx={{ fontSize: 12, fontWeight: 500, color: 'text.secondary', letterSpacing: 0.5, display: 'block', mb: 1 }}>{title}</Typography>
      <Typography variant="h4" sx={{ fontWeight: 700, fontSize: 32, color: 'text.primary', mb: 0.5 }}>{videoCount}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>Total platform uploads: <Typography component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>{platformUploadCount}</Typography></Typography>
      {platformBreakdown.some(p => p.original + p.reupload > 0) && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
          {platformBreakdown.map((p) => {
            const total = p.original + p.reupload
            if (total === 0) return null
            if (p.original > 0 && p.reupload > 0)
              return (<Box key={p.key} sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 1, py: 0.5, bgcolor: '#f5f5f5', borderRadius: 0.5, border: '1px solid', borderColor: '#81c784' }}>
                  <Box sx={{ width: 12, height: 12, display: 'flex', alignItems: 'center', color: getPlatformColor(p.key) }}>{platformIcons[p.key]}</Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', fontSize: 12 }}>{p.original}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 1, py: 0.5, bgcolor: '#f5f5f5', borderRadius: 0.5, border: '1px solid', borderColor: '#ffb74d' }}>
                  <Box sx={{ width: 12, height: 12, display: 'flex', alignItems: 'center', color: getPlatformColor(p.key) }}>{platformIcons[p.key]}</Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', fontSize: 12 }}>{p.reupload}</Typography>
                </Box>
              </Box>)
            const isReupload = p.reupload > 0 && p.original === 0
            return (<Box key={p.key} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 1, py: 0.5, bgcolor: '#f5f5f5', borderRadius: 0.5, border: '1px solid', borderColor: isReupload ? '#ffb74d' : '#81c784' }}>
              <Box sx={{ width: 12, height: 12, display: 'flex', alignItems: 'center', color: getPlatformColor(p.key) }}>{platformIcons[p.key]}</Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', fontSize: 12 }}>{total}</Typography>
            </Box>)
          })}
        </Box>
      )}
    </CardContent>
  </Card>
)

// Debug: parse Supabase REST URL into SQL + infer purpose
const getQueryPurpose = (url: string, method: string, table: string, params: URLSearchParams): string => {
  if (method === 'POST' && table === 'reuploads') return '💾 Save reupload'
  if (method === 'DELETE') return '🗑️ Delete video'
  if (method === 'PATCH') return '✏️ Update video'
  if (method === 'POST' && table === 'videos') return '➕ Add video'
  if (table === 'bookmarks') return '🔖 Fetch bookmarks'

  const select = params.get('select') || ''

  // RPC calls
  if (url.includes('/rest/v1/rpc/')) {
    if (url.includes('get_stats_single')) return '📊 Stat card: platform breakdown (today/yesterday)'
    if (url.includes('get_stats_range')) return '📊 Stat card: platform breakdown (range 3-9)'
    if (url.includes('get_video_count_single')) return '📊 Stat card: total video count (today/yesterday)'
    if (url.includes('get_video_count_range')) return '📊 Stat card: total video count (range 3-9)'
    return '⚡ RPC: ' + url.split('/rpc/')[1]?.split('?')[0]
  }

  const hasReuploadsJoin = select.includes('reuploads')
  const hasOr = url.includes('=or')

  // Detect which fetchData branch
  const hasUploadDateFilter = [...params.keys()].some(k => k.includes('_upload_date'))
  const hasTitleSearch = url.includes('.ilike.')
  const hasDateFilter = url.includes('created_at.eq')
  const hasPlatformFilter = url.includes('_url.not.')
  const hasIsNull = url.includes('.is.')
  const hasInId = url.includes('id=in.')

  if (hasReuploadsJoin && hasUploadDateFilter) {
    if (hasOr && url.includes('.in.')) return '📋 Today/Yesterday/Range-3-9 filter (videos + reuploads)'
    if (hasOr) return '📋 Upload date filter with reuploads'
    return '📋 Videos with reuploads'
  }
  if (hasTitleSearch || hasDateFilter || hasPlatformFilter) return '🔍 Search videos' + (hasTitleSearch ? '' : ' (filter)')
  if (hasIsNull && url.includes('_url')) return '📋 Dashboard card: videos without ' + (url.match(/(\w+)_url/) || ['', ''])[1] + ' URL'
  if (hasInId) return '📋 Load More / initial page'
  if (url.includes('reuploads') && url.includes('video_id')) return '📎 Fetch reuploads for chip highlighting'
  if (url.includes('reuploads') && (url.includes('upload_date.eq') || url.includes('upload_date.in'))) return '📎 Fetch reupload IDs for date'
  if (url.includes('reuploads') && url.includes('platform')) return '📊 Stat card: reuploads per platform'
  if (table === 'reuploads' && method === 'GET') return '📎 All reuploads (for chip highlighting)'
  if (select === 'id' && hasUploadDateFilter) return '📊 Stat card: video IDs for count'
  if (select === 'id' && hasOr) return '📊 Stat card: video IDs (range)'
  if (select === 'video_id' && table === 'reuploads') return '📊 Stat card: reupload IDs'
  if (url.includes('shopee_upload_date.gte')) return '📋 Shopee week filter'
  if (select.includes('_upload_date') && !select.includes('*')) return '📊 Creator stats: weekly breakdown'

  // Default
  if (table === 'videos' && !hasUploadDateFilter) return '📋 Default video list'
  return '📋 ' + (select.length > 30 ? select.substring(0, 30) + '...' : select) + ' FROM ' + table
}

const parseSupabaseUrlToSql = (url: string, method: string, body: string | null): { sql: string; purpose: string } => {
  try {
    const u = new URL(url)

    // Handle RPC calls
    if (url.includes('/rest/v1/rpc/')) {
      const rpcName = url.split('/rpc/')[1]?.split('?')[0] || 'unknown'
      return { sql: `SELECT * FROM ${rpcName}(${body || '...'})`, purpose: getQueryPurpose(url, method, '', u.searchParams) }
    }

    const path = u.pathname.split('/rest/v1/')[1] || u.pathname
    const table = path.split('?')[0]
    const params = u.searchParams

    let select = params.get('select') || '*'
    let sql = `SELECT ${select} FROM ${table}`

    const wheres: string[] = []
    for (const [key, val] of params.entries()) {
      if (key === 'select' || key === 'order' || key === 'limit' || key === 'offset' || key === 'offset' || key === '0') continue
      if (key.endsWith('=eq')) { wheres.push(`${key.replace('=eq', '')} = '${val}'`) }
      else if (key.endsWith('.eq')) { wheres.push(`${key.replace('.eq', '')} = '${val}'`) }
      else if (key.endsWith('.gte')) { wheres.push(`${key.replace('.gte', '')} >= '${val}'`) }
      else if (key.endsWith('.lte')) { wheres.push(`${key.replace('.lte', '')} <= '${val}'`) }
      else if (key.endsWith('.ilike')) { wheres.push(`${key.replace('.ilike', '')} ILIKE '%${val}%'`) }
      else if (key.endsWith('.is')) { wheres.push(`${key.replace('.is', '')} IS ${val}`) }
      else if (key.endsWith('.not')) { wheres.push(`${key.replace('.not', '')} IS NOT NULL`) }
      else if (key.endsWith('.in')) { wheres.push(`${key.replace('.in', '')} IN (${(val || '').split(',').map((v: string) => `'${v}'`).join(',')})`) }
      else if (key === 'or') {
        const parts = val.split(',')
        const ors = parts.map((p: string) => {
          const [, col, op, v] = p.match(/^(.+?)\.(.+?)\.(.+)$/) || []
          if (op === 'eq') return `${col} = '${v}'`
          if (op === 'is') return `${col} IS ${v}`
          return p
        })
        wheres.push(`(${ors.join(' OR ')})`)
      } else if (key.startsWith('order')) {
      } else {
        wheres.push(`${key} = '${val}'`)
      }
    }

    if (method === 'POST' && body) { try { sql = `INSERT INTO ${table} ${body}` } catch { } }
    if (method === 'DELETE') {
      sql = `DELETE FROM ${table}`
      try { const ids = JSON.parse(body || '{}'); if (ids?.id) wheres.push(`id = '${ids.id}'`) } catch { }
    }
    if (method === 'PATCH') {
      sql = `UPDATE ${table} SET ...`
      try { const filters = JSON.parse(body || '{}'); Object.entries(filters).forEach(([k, v]) => wheres.push(`${k} = '${v}'`)) } catch { }
    }

    if (wheres.length > 0) sql += ` WHERE ${wheres.join(' AND ')}`
    const order = params.get('order')
    if (order) sql += ` ORDER BY ${order}`
    const offset = params.get('offset')
    const limit = params.get('limit')
    if (offset) sql += ` OFFSET ${offset}`
    if (limit) sql += ` LIMIT ${limit}`

    return { sql, purpose: getQueryPurpose(url, method, table, params) }
  } catch {
    return { sql: `-- ${method} ${url}`, purpose: 'Unknown' }
  }
}

interface CampaignStatsEntry {
  count: number
  currentPeriod: { periodNumber: number; start: string; end: string } | null
  tier: CampaignTier | null
  maxTarget: number
  tierProgresses: TierProgress[]
}

type CampaignStatsMap = Record<string, CampaignStatsEntry>

interface CampaignSectionViewProps {
  campaigns: CampaignWithTiers[]
  campaignLoading: boolean
  campaignStats: CampaignStatsMap
  hideCampaigns: boolean
  onToggleHide: () => void
  isAdmin: boolean
  onManage: () => void
  onOpenHistory: (c: CampaignWithTiers) => void
  onOpenPastCampaigns: () => void
}

// Top-level component (NOT nested inside Videos) so React doesn't remount the
// subtree on every parent re-render — which would kill the Collapse animation.
const CampaignSectionView = ({
  campaigns, campaignLoading, campaignStats, hideCampaigns, onToggleHide,
  isAdmin, onManage, onOpenHistory, onOpenPastCampaigns,
}: CampaignSectionViewProps) => {
  const today = todayStr()
  const ongoing = campaigns.filter((c) => !c.end_date || c.end_date >= today)
  const ended = campaigns.filter((c) => c.end_date && c.end_date < today)

  return (
    <Box sx={{ mt: 1, mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Campaign
          </Typography>
          <IconButton size="small" onClick={onToggleHide} sx={{ color: 'text.secondary', p: 0.5 }} aria-label="Toggle campaigns">
            {hideCampaigns ? <ExpandMore /> : <ExpandLess />}
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isAdmin && (
            <Button size="small" variant="outlined" startIcon={<CampaignIcon />} onClick={onManage}>
              Manage Campaigns
            </Button>
          )}
        </Box>
      </Box>

      <Collapse in={!hideCampaigns}>
        {campaignLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={28} /></Box>
        ) : campaigns.length === 0 ? (
          <Card sx={{ bgcolor: 'background.paper' }}>
            <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No campaigns yet. {isAdmin ? 'Manage campaigns to set up a campaign day.' : 'Check back later.'}
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <>
            <CampaignTierGrid
              items={ongoing.map((c) => {
                const st = campaignStats[c.id]
                return {
                  campaign: c,
                  count: st?.count || 0,
                  period: st?.currentPeriod || null,
                  achievedTier: st?.tier || null,
                  tierProgresses: st?.tierProgresses || [],
                  platformIcon: platformIcons[c.platform],
                  platformColor: getPlatformColor(c.platform),
                }
              })}
              onOpenHistory={onOpenHistory}
            >

              {/* Past Campaign Card */}
              <Card
                sx={{
                  bgcolor: 'background.paper',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: '1px solid #f0f0f0',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
                }}
                onClick={onOpenPastCampaigns}
              >
                <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 140, textAlign: 'center' }}>
                  <CampaignIcon sx={{ fontSize: 32, color: '#9e9e9e', mb: 1 }} />
                  <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', letterSpacing: 0.5 }}>
                    Past Campaigns
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mt: 0.5 }}>
                    View History ({ended.length})
                  </Typography>
                </CardContent>
              </Card>
            </CampaignTierGrid>
          </>
        )}
      </Collapse>
    </Box>
  )
}

export default function Videos() {
  const location = useLocation(); const theme = useTheme(); const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const navigate = useNavigate(); const { isAdmin } = useAuth()
  const [debugQueries, setDebugQueries] = useState<{ sql: string; purpose: string; time: number; ts: number }[]>([])
  // Enable debug via: ?sql-debug in URL or localStorage set 'sql-debug' = '1'
  const debugEnabled = import.meta.env.DEV || new URLSearchParams(window.location.search).has('sql-debug') || localStorage.getItem('sql-debug') === '1'
  const debugStartRef = useRef(0)
  const debugQueryCountRef = useRef(0)

  // Debug: intercept Supabase fetch calls
  useEffect(() => {
    if (!debugEnabled) return
    const origFetch = window.fetch.bind(window)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    debugQueryCountRef.current = 0
    debugStartRef.current = Date.now()
    setDebugQueries([])

    const handler = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString()
      if (url.includes(supabaseUrl) && url.includes('/rest/v1/')) {
        const method = (init?.method || 'GET').toUpperCase()
        const body = init?.body?.toString() || null
        const parsed = parseSupabaseUrlToSql(url, method, body)
        const qIdx = ++debugQueryCountRef.current
        const start = performance.now()
        return origFetch(input, init).then(res => {
          const elapsed = performance.now() - start
          setDebugQueries(prev => [...prev, { sql: parsed.sql, purpose: parsed.purpose, time: Math.round(elapsed), ts: qIdx }])
          return res
        })
      }
      return origFetch(input, init)
    }
    window.fetch = handler as typeof window.fetch
    return () => { window.fetch = origFetch }
  }, [debugEnabled])
  const [videos, setVideos] = useState<Video[]>([]); const [reuploads, setReuploads] = useState<Reupload[]>([])
  const [loading, setLoading] = useState(true); const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true); const [currentPage, setCurrentPage] = useState(0)
  const [open, setOpen] = useState(false); const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [descriptionOpen, setDescriptionOpen] = useState(false); const [selectedDescription, setSelectedDescription] = useState('')
  const [selectedDescriptionVideo, setSelectedDescriptionVideo] = useState<Video | null>(null)
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false); const [selectedVideoUrl, setSelectedVideoUrl] = useState('')
  const [videoLoading, setVideoLoading] = useState(false); const [uploadInfoOpen, setUploadInfoOpen] = useState(false)
  const [selectedVideoForInfo, setSelectedVideoForInfo] = useState<Video | null>(null)
  const ITEMS_PER_PAGE = 10
  const [searchQuery, setSearchQuery] = useState(''); const [activeSearchQuery, setActiveSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState(''); const [filterEmptyPlatform, setFilterEmptyPlatform] = useState<string | null>(null)
  const [platformFilter, setPlatformFilter] = useState<string>('')
  const [uploadDateFilter, setUploadDateFilter] = useState<'today' | 'yesterday' | 'range-3-9' | ''>('')
  const [customUploadDateFilter, setCustomUploadDateFilter] = useState('')
  const dflt = () => platforms.map(p => ({ key: p.key, original: 0, reupload: 0 }))
  const [todayStats, setTodayStats] = useState({ videoCount: 0, reuploadCount: 0, platformBreakdown: dflt() })
  const [yesterdayStats, setYesterdayStats] = useState({ videoCount: 0, reuploadCount: 0, platformBreakdown: dflt() })
  const [range3to9Stats, setRange3to9Stats] = useState({ videoCount: 0, reuploadCount: 0, platformBreakdown: dflt() })
  const [reuploadDialogOpen, setReuploadDialogOpen] = useState(false); const [reuploadPlatform, setReuploadPlatform] = useState('')

  // Original Creator stats
  const [creatorStats, setCreatorStats] = useState({
    weekNumber: 0,
    shopeeCount: 0,
    target: 20,
    weekStart: '',
    weekEnd: '',
    platformBreakdown: dflt()
  })
  const [weeklyHistory, setWeeklyHistory] = useState<Array<{
    weekNumber: number;
    shopeeCount: number;
    dates: string[];
    platformBreakdown: { key: string; original: number; reupload: number }[]
  }>>([])
  const [weeklyHistoryOpen, setWeeklyHistoryOpen] = useState(false)
  const [shopeeWeekFilter, setShopeeWeekFilter] = useState(false) // Filter for shopee videos in current week
  const [shopeeWeekDateRange, setShopeeWeekDateRange] = useState<string[] | null>(null) // Specific week date range for filtering
  const [reuploadUrl, setReuploadUrl] = useState(''); const [reuploadUploadDate, setReuploadUploadDate] = useState('')
  const [reuploadNotes, setReuploadNotes] = useState(''); const searchInputRef = useRef<HTMLInputElement>(null)
  const processedLocationStateRef = useRef<string | null>(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '' })

  // Campaign Day state
  const [campaigns, setCampaigns] = useState<CampaignWithTiers[]>([])
  const [campaignLoading, setCampaignLoading] = useState(false)
  const [campaignStats, setCampaignStats] = useState<CampaignStatsMap>({})
  const [historyCampaign, setHistoryCampaign] = useState<CampaignWithTiers | null>(null)
  const [historyStats, setHistoryStats] = useState<Array<{
    periodNumber: number; start: string; end: string; count: number
    tier: CampaignTier | null; maxTarget: number
    tierProgresses: TierProgress[]
  }>>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [pastCampaignsOpen, setPastCampaignsOpen] = useState(false)
  const [pastCampaignStats, setPastCampaignStats] = useState<Record<string, { bestTier: CampaignTier | null; maxTarget: number; bestCount: number }>>({})
  const [hideCampaigns, setHideCampaigns] = useState(() => localStorage.getItem('videos_hide_campaigns') === 'true')
  const [hideStats, setHideStats] = useState(() => localStorage.getItem('videos_hide_stats') === 'true')

  // Persist hide/show toggles locally so they survive page reloads
  useEffect(() => {
    localStorage.setItem('videos_hide_campaigns', String(hideCampaigns))
  }, [hideCampaigns])

  useEffect(() => {
    localStorage.setItem('videos_hide_stats', String(hideStats))
  }, [hideStats])
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [srt, setSrt] = useState('')
  const [descriptionFocused, setDescriptionFocused] = useState(false); const [createdAt, setCreatedAt] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState(''); const [youtubeUploadDate, setYoutubeUploadDate] = useState<string | null>(null)
  const [facebookUrl, setFacebookUrl] = useState(''); const [facebookUploadDate, setFacebookUploadDate] = useState<string | null>(null)
  const [instagramUrl, setInstagramUrl] = useState(''); const [instagramUploadDate, setInstagramUploadDate] = useState<string | null>(null)
  const [shopeeUrl, setShopeeUrl] = useState(''); const [shopeeUploadDate, setShopeeUploadDate] = useState<string | null>(null)
  const [shopeeProductUrl, setShopeeProductUrl] = useState(''); const [threadsUrl, setThreadsUrl] = useState('')
  const [threadsUploadDate, setThreadsUploadDate] = useState<string | null>(null); const [tiktokUrl, setTiktokUrl] = useState('')
  const [tiktokUploadDate, setTiktokUploadDate] = useState<string | null>(null); const [tiktokProductUrl, setTiktokProductUrl] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [bookmarkedVideoIds, setBookmarkedVideoIds] = useState<Set<string>>(new Set())
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false)

  // Focus video state - derived from localStorage, only one video can be focused
  const [focusedVideoId, setFocusedVideoId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('videos_focused_video_id')
    }
    return null
  })
  // Separate toggle for filter - allows showing focused video or not without clearing the focused ID
  const [filterFocusActive, setFilterFocusActive] = useState(false)

  // Helper: toggle focus on a video (update localStorage + state, auto-activate filter)
  const toggleFocusVideo = (videoId: string) => {
    if (focusedVideoId === videoId) {
      // Clicking the same focused video = clear focus entirely
      setFocusedVideoId(null)
      localStorage.removeItem('videos_focused_video_id')
      setFilterFocusActive(false)
    } else {
      // Set new focus (overwrites any previous) and auto-activate filter
      setFocusedVideoId(videoId)
      localStorage.setItem('videos_focused_video_id', videoId)
      setFilterFocusActive(true)
    }
  }

  // Button "Focus" click handler - toggle filter only, preserve focusedVideoId in localStorage
  const toggleFocusFilter = () => {
    setFilterFocusActive(!filterFocusActive)
  }

  const prevYoutubeUrlRef = useRef('')
  const prevFacebookUrlRef = useRef('')
  const prevInstagramUrlRef = useRef('')
  const prevShopeeUrlRef = useRef('')
  const prevThreadsUrlRef = useRef('')
  const prevTiktokUrlRef = useRef('')

  // Date helper functions - defined early to avoid hoisting issues
  // Use Asia/Kuala_Lumpur timezone to match Malaysia local time
  const getTodayDate = () => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    return formatter.format(new Date())
  }
  const getDateDaysAgo = (days: number): string => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    const d = new Date()
    d.setDate(d.getDate() - days)
    return formatter.format(d)
  }
  // Memoize date values to prevent infinite re-render loop
  const todayDate = useMemo(() => getTodayDate(), [])
  const yesterdayDate = useMemo(() => getDateDaysAgo(1), [])
  const dates3to9 = useMemo(() => Array.from({ length: 7 }, (_, i) => getDateDaysAgo(i + 3)), [])

  // Helper: Get current week range (Wednesday-Tuesday) in MY timezone
  const getCurrentWeekRange = () => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    const now = new Date()
    const myDateStr = formatter.format(now)
    const myDate = new Date(myDateStr)

    // Get Wednesday of current week (0 = Sunday, 3 = Wednesday)
    const dayOfWeek = myDate.getDay()
    const wednesday = new Date(myDate)
    // Calculate days to go back to get to Wednesday
    // If day is Wed(3), go back 0; Thu(4), go back 1; ... Sun(0), go back 4; Mon(1), go back 5; Tue(2), go back 6
    const daysToWednesday = (dayOfWeek + 4) % 7
    wednesday.setDate(myDate.getDate() - daysToWednesday)

    const tuesday = new Date(wednesday)
    tuesday.setDate(wednesday.getDate() + 6)

    // Generate all 7 dates in the week (Wed to Tue)
    const weekDates: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(wednesday)
      d.setDate(wednesday.getDate() + i)
      weekDates.push(formatter.format(d))
    }

    return { monday: wednesday, sunday: tuesday, weekDates }
  }

  // Helper: Get ISO week number
  const getISOWeekNumber = (date: Date): number => {
    const d = new Date(date)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }

  // Helper: Format date range for display
  const formatWeekRange = (monday: Date, sunday: Date): { start: string, end: string } => {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kuala_Lumpur',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
    return {
      start: formatter.format(monday),
      end: formatter.format(sunday)
    }
  }

  // Auto-set/clear upload dates when URL changes - using useEffect for Safari compatibility
  useEffect(() => {
    if (youtubeUrl && !prevYoutubeUrlRef.current && !youtubeUploadDate) {
      setYoutubeUploadDate(todayDate)
    } else if (!youtubeUrl && prevYoutubeUrlRef.current) {
      setYoutubeUploadDate(null)
    }
    prevYoutubeUrlRef.current = youtubeUrl
  }, [youtubeUrl, todayDate, youtubeUploadDate])

  useEffect(() => {
    if (facebookUrl && !prevFacebookUrlRef.current && !facebookUploadDate) {
      setFacebookUploadDate(todayDate)
    } else if (!facebookUrl && prevFacebookUrlRef.current) {
      setFacebookUploadDate(null)
    }
    prevFacebookUrlRef.current = facebookUrl
  }, [facebookUrl, todayDate, facebookUploadDate])

  useEffect(() => {
    if (instagramUrl && !prevInstagramUrlRef.current && !instagramUploadDate) {
      setInstagramUploadDate(todayDate)
    } else if (!instagramUrl && prevInstagramUrlRef.current) {
      setInstagramUploadDate(null)
    }
    prevInstagramUrlRef.current = instagramUrl
  }, [instagramUrl, todayDate, instagramUploadDate])

  useEffect(() => {
    if (shopeeUrl && !prevShopeeUrlRef.current && !shopeeUploadDate) {
      setShopeeUploadDate(todayDate)
    } else if (!shopeeUrl && prevShopeeUrlRef.current) {
      setShopeeUploadDate(null)
    }
    prevShopeeUrlRef.current = shopeeUrl
  }, [shopeeUrl, todayDate, shopeeUploadDate])

  useEffect(() => {
    if (threadsUrl && !prevThreadsUrlRef.current && !threadsUploadDate) {
      setThreadsUploadDate(todayDate)
    } else if (!threadsUrl && prevThreadsUrlRef.current) {
      setThreadsUploadDate(null)
    }
    prevThreadsUrlRef.current = threadsUrl
  }, [threadsUrl, todayDate, threadsUploadDate])

  useEffect(() => {
    if (tiktokUrl && !prevTiktokUrlRef.current && !tiktokUploadDate) {
      setTiktokUploadDate(todayDate)
    } else if (!tiktokUrl && prevTiktokUrlRef.current) {
      setTiktokUploadDate(null)
    }
    prevTiktokUrlRef.current = tiktokUrl
  }, [tiktokUrl, todayDate, tiktokUploadDate])

  // Sync date with URL when dialog opens (for edit mode)
  useEffect(() => {
    if (open && editingVideo) {
      // When editing, if URL exists but date is empty, set date to today
      if (youtubeUrl && !youtubeUploadDate) setYoutubeUploadDate(todayDate)
      if (facebookUrl && !facebookUploadDate) setFacebookUploadDate(todayDate)
      if (instagramUrl && !instagramUploadDate) setInstagramUploadDate(todayDate)
      if (shopeeUrl && !shopeeUploadDate) setShopeeUploadDate(todayDate)
      if (threadsUrl && !threadsUploadDate) setThreadsUploadDate(todayDate)
      if (tiktokUrl && !tiktokUploadDate) setTiktokUploadDate(todayDate)
    }
  }, [open, editingVideo, youtubeUrl, youtubeUploadDate, facebookUrl, facebookUploadDate, instagramUrl, instagramUploadDate, shopeeUrl, shopeeUploadDate, threadsUrl, threadsUploadDate, tiktokUrl, tiktokUploadDate, todayDate])

  // Optimized fetchStats using RPC functions (GROUP BY + FILTER on server)
  // Requires rpc-get-stats.sql to be run in Supabase SQL editor
  const fetchStats = useCallback(async () => {
    const todayStr = todayDate
    const yesterdayStr = yesterdayDate
    const d3to9 = dates3to9

    // Check cache first
    const cacheKey = `stats_${todayStr}`; const cached = localStorage.getItem(cacheKey)
    const now = Date.now(); const cacheAge = cached ? JSON.parse(cached).timestamp : 0
    if (cached && (now - cacheAge) < 5 * 60 * 1000) {
      const { todayStats: ts, yesterdayStats: ys, range3to9Stats: rs } = JSON.parse(cached)
      setTodayStats(ts); setYesterdayStats(ys); setRange3to9Stats(rs)
      return
    }

    // Try using RPC functions first (requires SQL migration to be run)
    // If RPC fails, falls back to regular queries
    try {
      const [tB, yB, rB, tCnt, yCnt, rCnt] = await Promise.all([
        supabase.rpc('get_stats_single', { p_date: todayStr }).then(r => r.data || []),
        supabase.rpc('get_stats_single', { p_date: yesterdayStr }).then(r => r.data || []),
        supabase.rpc('get_stats_range', { p_dates: d3to9 }).then(r => r.data || []),
        supabase.rpc('get_video_count_single', { p_date: todayStr }).then(r => (r.data?.[0]?.total_count) || 0),
        supabase.rpc('get_video_count_single', { p_date: yesterdayStr }).then(r => (r.data?.[0]?.total_count) || 0),
        supabase.rpc('get_video_count_range', { p_dates: d3to9 }).then(r => (r.data?.[0]?.total_count) || 0),
      ])

      const ts = { videoCount: tCnt, reuploadCount: tB.reduce((s: number, x: any) => s + (x.reupload_count || 0), 0), platformBreakdown: tB.map((x: any) => ({ key: x.platform, original: x.original_count || 0, reupload: x.reupload_count || 0 })) }
      const ys = { videoCount: yCnt, reuploadCount: yB.reduce((s: number, x: any) => s + (x.reupload_count || 0), 0), platformBreakdown: yB.map((x: any) => ({ key: x.platform, original: x.original_count || 0, reupload: x.reupload_count || 0 })) }
      const rs = { videoCount: rCnt, reuploadCount: rB.reduce((s: number, x: any) => s + (x.reupload_count || 0), 0), platformBreakdown: rB.map((x: any) => ({ key: x.platform, original: x.original_count || 0, reupload: x.reupload_count || 0 })) }

      localStorage.setItem(cacheKey, JSON.stringify({ todayStats: ts, yesterdayStats: ys, range3to9Stats: rs, timestamp: now }))
      setTodayStats(ts); setYesterdayStats(ys); setRange3to9Stats(rs)
      return
    } catch (e) {
      // RPC failed (functions not created yet), fall back to regular queries
      console.warn('RPC stats not available, using fallback queries:', e)
    }

    // Fallback: client-side counting (if RPC functions not yet created)
    const cOrigIds = async (date: string) => {
      const { data } = await supabase.from('videos').select('id').or(buildUploadDateOrFilter(date))
      return data ? data.map((v: any) => v.id) : []
    }
    const cReupIds = async (date: string) => {
      const { data } = await supabase.from('reuploads').select('video_id').eq('upload_date', date)
      return data ? data.map((r: any) => r.video_id) : []
    }
    const cOrigRangeIds = async (dates: string[]) => {
      const orParts = platforms.map(p => `${p.key}_upload_date.in.(${dates.join(',')})`).join(',')
      const { data } = await supabase.from('videos').select('id').or(orParts)
      return data ? [...new Set(data.map((v: any) => v.id))] : []
    }
    const cReupRangeIds = async (dates: string[]) => {
      const { data } = await supabase.from('reuploads').select('video_id').in('upload_date', dates)
      return data ? data.map((r: any) => r.video_id) : []
    }
    const countBreakdown = (vRows: any[], ruRows: any[], targetDate: string | null, targetDates: string[] | null) => {
      const r: { key: string; original: number; reupload: number }[] = platforms.map(p => ({ key: p.key, original: 0, reupload: 0 }))
      for (const v of vRows) {
        for (const p of platforms) {
          const ud = v[`${p.key}_upload_date`]
          if (targetDate && ud === targetDate) { const entry = r.find(x => x.key === p.key); if (entry) entry.original++ }
          else if (targetDates && ud && targetDates.includes(ud)) { const entry = r.find(x => x.key === p.key); if (entry) entry.original++ }
        }
      }
      for (const ru of ruRows) { const entry = r.find(x => x.key === ru.platform); if (entry) entry.reupload++ }
      return r
    }
    const allDateFields = platforms.map(p => `${p.key}_upload_date`).join(', ')
    const cBreakFast = async (date: string) => {
      const [vRes, ruRes] = await Promise.all([
        supabase.from('videos').select(allDateFields).or(buildUploadDateOrFilter(date)),
        supabase.from('reuploads').select('platform').eq('upload_date', date)
      ])
      return countBreakdown(vRes.data || [], ruRes.data || [], date, null)
    }
    const cBreakRangeFast = async (dates: string[]) => {
      const orParts = platforms.map(p => `${p.key}_upload_date.in.(${dates.join(',')})`).join(',')
      const [vRes, ruRes] = await Promise.all([
        supabase.from('videos').select(allDateFields).or(orParts),
        supabase.from('reuploads').select('platform').in('upload_date', dates)
      ])
      return countBreakdown(vRes.data || [], ruRes.data || [], null, dates)
    }
    const [tVIds, tRIds, tB, yVIds, yRIds, yB, rVIds, rRIds, rB] = await Promise.all([
      cOrigIds(todayStr), cReupIds(todayStr), cBreakFast(todayStr),
      cOrigIds(yesterdayStr), cReupIds(yesterdayStr), cBreakFast(yesterdayStr),
      cOrigRangeIds(d3to9), cReupRangeIds(d3to9), cBreakRangeFast(d3to9)
    ])
    const getUniqueCount = (vIds: string[], rIds: string[]) => [...new Set([...vIds, ...rIds])].length

    const ts = { videoCount: getUniqueCount(tVIds, tRIds), reuploadCount: tRIds.length, platformBreakdown: tB }
    const ys = { videoCount: getUniqueCount(yVIds, yRIds), reuploadCount: yRIds.length, platformBreakdown: yB }
    const rs = { videoCount: getUniqueCount(rVIds, rRIds), reuploadCount: rRIds.length, platformBreakdown: rB }
    localStorage.setItem(cacheKey, JSON.stringify({ todayStats: ts, yesterdayStats: ys, range3to9Stats: rs, timestamp: now }))
    setTodayStats(ts); setYesterdayStats(ys); setRange3to9Stats(rs)
  }, [])

  // Campaign Day: fetch campaigns + compute current period stats
  const loadCampaigns = useCallback(async () => {
    setCampaignLoading(true)
    try {
      const data = await fetchCampaignsWithTiers()
      setCampaigns(data)

      const today = todayStr()
      const ongoing = data.filter((c) => !c.end_date || c.end_date >= today)
      const stats: CampaignStatsMap = {}
      await Promise.all(ongoing.map(async (c) => {
        const period = computeCurrentPeriod(c, today)
        if (!period) {
          stats[c.id] = { count: 0, currentPeriod: null, tier: null, maxTarget: maxTierTarget(c.tiers), tierProgresses: [] }
          return
        }
        const count = await computeUploadCount(c.platform, period.start, period.end)
        stats[c.id] = {
          count,
          currentPeriod: period,
          tier: resolveTier(count, c.tiers),
          maxTarget: maxTierTarget(c.tiers),
          tierProgresses: c.tiers.length > 0 ? computeTierProgresses(c, count, period) : [],
        }
      }))
      setCampaignStats(stats)
    } catch {
      // Silently ignore campaign fetch errors (tables may not exist yet)
    }
    setCampaignLoading(false)
  }, [])

  useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  // Campaign Day: open history dialog for a campaign (period breakdown)
  const openCampaignHistory = useCallback(async (c: CampaignWithTiers) => {
    setHistoryCampaign(c)
    setHistoryStats([])
    setHistoryLoading(true)
    try {
      const today = todayStr()
      const periods = computePeriods(c, today)
      const rows = await Promise.all(periods.map(async (p) => {
        const count = await computeUploadCount(c.platform, p.start, p.end)
        const tp = c.tiers.length > 0 ? computeTierProgresses(c, count, p) : []
        return { ...p, count, tier: resolveTier(count, c.tiers), maxTarget: maxTierTarget(c.tiers), tierProgresses: tp }
      }))
      setHistoryStats(rows.reverse())
    } catch {
      setHistoryStats([])
    }
    setHistoryLoading(false)
  }, [])

  // Campaign Day: open past campaigns dialog (ended campaigns + best tier ever)
  const openPastCampaigns = useCallback(async () => {
    setPastCampaignsOpen(true)
    try {
      const today = todayStr()
      const ended = campaigns.filter((c) => c.end_date && c.end_date < today)
      const stats: Record<string, { bestTier: CampaignTier | null; maxTarget: number; bestCount: number }> = {}
      await Promise.all(ended.map(async (c) => {
        const periods = computePeriods(c, today)
        let bestTier: CampaignTier | null = null
        let bestCount = 0
        for (const p of periods) {
          const count = await computeUploadCount(c.platform, p.start, p.end)
          const t = resolveTier(count, c.tiers)
          bestCount = Math.max(bestCount, count)
          if (t && (!bestTier || t.tier_number > bestTier.tier_number)) bestTier = t
        }
        stats[c.id] = { bestTier, maxTarget: maxTierTarget(c.tiers), bestCount }
      }))
      setPastCampaignStats(stats)
    } catch {
      setPastCampaignStats({})
    }
  }, [campaigns])

  // Handle location state for navigation from other pages
  // Processed BEFORE the main fetch effect to avoid double-fetch
  useEffect(() => {
    const state = location.state as any
    const stateKey = state ? JSON.stringify(state) : null
    // Only process if this is a new state (not same as before)
    if (processedLocationStateRef.current === stateKey) return
    processedLocationStateRef.current = stateKey

    if (state?.focusSearch && searchInputRef.current) searchInputRef.current.focus()
    if (state?.calendarUploadDate) {
      setCustomUploadDateFilter(state.calendarUploadDate);
      setUploadDateFilter('');
      setSearchQuery('');
      setActiveSearchQuery('');
      setPlatformFilter('');
      setFilterEmptyPlatform(null);
      return
    }
    if (state?.searchQuery) {
      setSearchQuery(state.searchQuery);
      setActiveSearchQuery(state.searchQuery);
      setUploadDateFilter('');
      setPlatformFilter('');
      setDateFilter('');
      setCustomUploadDateFilter('');
      setFilterEmptyPlatform(null);
      return
    }
    if (state?.filterEmptyPlatform) {
      const platform = state.filterEmptyPlatform
      setFilterEmptyPlatform(platform)
      setCurrentPage(0); setVideos([]); setHasMore(true); setLoading(true);
      (async () => {
        const vR = await supabase.from('videos').select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(0, ITEMS_PER_PAGE - 1)
          .is(`${platform}_url`, null)
        setVideos((vR.data as Video[]) || [])
        setHasMore((vR.data?.length || 0) === ITEMS_PER_PAGE)
        setLoading(false)
      })()
      return
    }
    if (state?.openAddDialog) {
      openAddDialog()
    }
  }, [location.key])

  // Handle stat card click - reset other filters when clicking stat card
  const handleStatCardClick = (filterKey: 'today' | 'yesterday' | 'range-3-9') => {
    // If clicking the same filter (unselect), just reset without fetching
    if (uploadDateFilter === filterKey) {
      setUploadDateFilter('')
      setSearchQuery('')
      setActiveSearchQuery('')
      setDateFilter('')
      setPlatformFilter('')
      setFilterEmptyPlatform(null)
      setCustomUploadDateFilter('')
      // Don't fetch - data is already loaded, just reset filter
      // Reset loading state to false since we're not fetching
      setLoading(false)
    } else {
      setUploadDateFilter(filterKey)
      // Reset other filters when clicking stat card to show clean data
      setSearchQuery('')
      setActiveSearchQuery('')
      setDateFilter('')
      setPlatformFilter('')
      setFilterEmptyPlatform(null)
      setCustomUploadDateFilter('')
    }
  }

  // Handle search button click
  const handleSearch = () => {
    setActiveSearchQuery(searchQuery)
  }

  // Build query for videos with search/filter params - WITH pagination + reuploads join
  const buildFilteredQuery = useCallback((page: number) => {
    let q = supabase.from('videos').select('*, reuploads!left(platform, upload_date)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1)
    if (activeSearchQuery) q = q.or(`title.ilike.%${activeSearchQuery}%`)
    if (dateFilter) q = q.eq('created_at', `${dateFilter}T00:00:00.000Z`)
    if (platformFilter) q = q.not(`${platformFilter}_url`, 'is', null)
    if (customUploadDateFilter) q = q.or(buildUploadDateOrFilter(customUploadDateFilter))
    return q
  }, [activeSearchQuery, dateFilter, platformFilter, customUploadDateFilter])

  const fetchData = useCallback(async (page: number = 0, reset: boolean = false) => {
    if (page === 0) setLoading(true); else setLoadingMore(true)

    let vData: Video[] = []
    let rData: Reupload[] = []

    // IF - focus mode active (filter on + focused video exists)
    if (focusedVideoId && filterFocusActive) {
      const vR = await supabase.from('videos').select('*, reuploads!left(platform, upload_date)')
        .eq('id', focusedVideoId)
        .order('created_at', { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1)
      vData = (vR.data as Video[]) || []
      const rR = await supabase.from('reuploads').select('*').eq('video_id', focusedVideoId)
      rData = (rR.data as Reupload[]) || []
      setVideos(vData)
      setHasMore(false) // Only one video when focused

    // IF - ada search query, date filter, platform filter, atau custom upload date
    } else if (activeSearchQuery || dateFilter || platformFilter || customUploadDateFilter) {
      const vR = await buildFilteredQuery(page)
      vData = (vR.data as Video[]) || []
      const rR = await supabase.from('reuploads').select('*')
      rData = (rR.data as Reupload[]) || []

      if (reset || page === 0) {
        setVideos(vData)
      } else {
        setVideos(prev => [...prev, ...vData])
      }
      setHasMore(vData.length === ITEMS_PER_PAGE)

      // ELSEIF - tekan card platform dari dashboard (youtube, tiktok, facebook, dll)
      // Tak perlu fetch reuploads - platform tanpa URL confirm tiada reupload
    } else if (filterEmptyPlatform) {
      const q = supabase.from('videos').select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1)
        .is(`${filterEmptyPlatform}_url`, null)
      const vR = await q
      vData = (vR.data as Video[]) || []

      if (reset || page === 0) {
        setVideos(vData)
      } else {
        setVideos(prev => [...prev, ...vData])
      }
      setHasMore(vData.length === ITEMS_PER_PAGE)

      // ELSEIF - tekan card today/yesterday/days 3-9 (dengan pagination)
    } else if (uploadDateFilter) {
      const filterDate = uploadDateFilter === 'today' ? todayDate
        : uploadDateFilter === 'yesterday' ? yesterdayDate : null
      const filterDates = uploadDateFilter === 'range-3-9' ? dates3to9 : null

      // 1) Fetch videos with original upload dates matching filter
      const uploadDateOrFilter = filterDates
        ? platforms.map(p => `${p.key}_upload_date.in.(${filterDates.join(',')})`).join(',')
        : buildUploadDateOrFilter(filterDate!)

      const vR = await supabase.from('videos').select('*, reuploads!left(platform, upload_date)')
        .or(uploadDateOrFilter)
        .order('created_at', { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1)

      const vDataRaw = (vR.data as any[]) || []
      let vDataMap = new Map<string, any>()
      for (const v of vDataRaw) {
        const { reuploads, ...rest } = v
        vDataMap.set(v.id, rest as Video)
      }

      // 2) Also fetch videos that have reuploads matching the filter date
      //    (videos originally uploaded on different date, but reuploaded today/yesterday)
      const { data: reupVideoIds } = filterDates
        ? await supabase.from('reuploads').select('video_id').in('upload_date', filterDates)
        : await supabase.from('reuploads').select('video_id').eq('upload_date', filterDate!)

      if (reupVideoIds && reupVideoIds.length > 0) {
        const reupIds = [...new Set(reupVideoIds.map((r: any) => r.video_id))]
        const missingIds = reupIds.filter(id => !vDataMap.has(id))
        if (missingIds.length > 0) {
          const { data: reupVideos } = await supabase.from('videos')
            .select('*, reuploads!left(platform, upload_date)')
            .in('id', missingIds)
            .order('created_at', { ascending: false })
          if (reupVideos) {
            for (const v of reupVideos) {
              const { reuploads, ...rest } = v
              vDataMap.set(v.id, rest as Video)
              // Collect reuploads for chip highlighting
              if (reuploads && reuploads.length > 0) {
                const filtered = reuploads.filter((r: any) =>
                  filterDates ? filterDates.includes(r.upload_date) : r.upload_date === filterDate
                )
                rData.push(...filtered.map((r: any) => ({ ...r, video_id: v.id })))
              }
            }
          }
        }
      }

      vData = [...vDataMap.values()]

      // Extract reuploads from original query for chip highlighting
      for (const v of vDataRaw) {
        if (v.reuploads && v.reuploads.length > 0) {
          const filtered = v.reuploads.filter((r: any) =>
            filterDates ? filterDates.includes(r.upload_date) : r.upload_date === filterDate
          )
          rData.push(...filtered.map((r: any) => ({ ...r, video_id: v.id })))
        }
      }

      if (reset || page === 0) {
        setVideos(vData)
      } else {
        setVideos(prev => [...prev, ...vData])
      }
      setHasMore(vData.length >= ITEMS_PER_PAGE)

      // ELSEIF - tekan bookmarked
    } else if (showBookmarkedOnly) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: bookmarkData } = await supabase.from('bookmarks').select('video_id').eq('user_id', user.id)
        if (bookmarkData && bookmarkData.length > 0) {
          const videoIds = bookmarkData.map((b: any) => b.video_id)
          const { data: videoData } = await supabase.from('videos').select('*').in('id', videoIds)
          vData = (videoData as Video[]) || []
        }
      }
      setVideos(vData)
      setHasMore(false)

      // ELSEIF - shopee week filter (dengan pagination)
    } else if (shopeeWeekFilter || shopeeWeekDateRange) {
      const range = shopeeWeekDateRange || getCurrentWeekRange().weekDates
      const { data: videoData } = await supabase.from('videos').select('*', { count: 'exact' })
        .gte('shopee_upload_date', range[0])
        .lte('shopee_upload_date', range[6])
        .order('created_at', { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1)
      vData = (videoData as Video[]) || []

      if (reset || page === 0) {
        setVideos(vData)
      } else {
        setVideos(prev => [...prev, ...vData])
      }
      setHasMore(vData.length === ITEMS_PER_PAGE)

      // ELSE - default load video page, tanpa filter
    } else {
      const vR = await supabase.from('videos').select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1)
      vData = (vR.data as Video[]) || []

      const rR = await supabase.from('reuploads').select('*')
      rData = (rR.data as Reupload[]) || []

      if (reset || page === 0) {
        setVideos(vData)
      } else {
        setVideos(prev => [...prev, ...vData])
      }
      setHasMore(vData.length === ITEMS_PER_PAGE)
    }

    // For ELSE branch: reuploads already in join via buildFilteredQuery
    // For default ELSE branch: reuploads fetched inline above
    // Only fetch fallback if actually needed for other branches
    if (rData.length === 0 && !showBookmarkedOnly && !filterEmptyPlatform && !shopeeWeekFilter && !shopeeWeekDateRange && !uploadDateFilter && !(focusedVideoId && filterFocusActive)) {
      const rR = await supabase.from('reuploads').select('*')
      rData = (rR.data as Reupload[]) || []
    }
    setReuploads(rData)
    setLoading(false); setLoadingMore(false); fetchStats()
  }, [buildFilteredQuery, fetchStats, uploadDateFilter, customUploadDateFilter, todayDate, yesterdayDate, dates3to9, shopeeWeekFilter, shopeeWeekDateRange, activeSearchQuery, dateFilter, platformFilter, filterEmptyPlatform, showBookmarkedOnly, focusedVideoId, filterFocusActive])

  // Fetch bookmarks (for bookmark icons display)
  const fetchBookmarks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setBookmarkedVideoIds(new Set()); return }
    const { data } = await supabase.from('bookmarks').select('video_id').eq('user_id', user.id)
    if (data) setBookmarkedVideoIds(new Set(data.map((b: any) => b.video_id)))
  }, [])

  // Fetch bookmarks on mount (needed for bookmark icon display)
  useEffect(() => { fetchBookmarks() }, [fetchBookmarks])

  // Track if we came from location state to skip initial mount fetch
  const hasLocationState = useRef(false)

  // Effect to trigger fetch when filters change
  // Note: filterEmptyPlatform excluded - handled manually by location effect and Clear button
  useEffect(() => {
    // If there's location state pending, skip mount fetch (location handler will trigger it)
    if (location.state && !hasLocationState.current) {
      hasLocationState.current = true
      setLoading(false)
      return
    }
    hasLocationState.current = true
    setCurrentPage(0); setVideos([]); setHasMore(true); fetchData(0, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSearchQuery, dateFilter, customUploadDateFilter, platformFilter, uploadDateFilter, showBookmarkedOnly, shopeeWeekFilter, shopeeWeekDateRange, filterFocusActive])

  // Fetch creator stats - single query for ALL weeks, filter client-side
  const fetchCreatorStats = useCallback(async () => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })

    const { monday, sunday, weekDates } = getCurrentWeekRange()
    const weekNumber = getISOWeekNumber(monday)
    const { start, end } = formatWeekRange(monday, sunday)

    // Fetch ALL upload_date columns in 1 query (no date filter - get everything once)
    // This replaces 6 queries (5 history weeks + 1 current week)
    const allDateFields = platforms.map(p => `${p.key}_upload_date`).join(', ')
    const { data: allData } = await supabase.from('videos').select(allDateFields)
    const allRows = (allData || []) as any[]

    // Helper: count per week
    const countPerWeek = (rows: any[], ws: string, we: string) => {
      const breakdown = platforms.map(p => ({ key: p.key, original: 0, reupload: 0 }))
      let shopeeCnt = 0
      for (const v of rows) {
        for (const p of platforms) {
          const ud = v[`${p.key}_upload_date`]
          if (ud && ud >= ws && ud <= we) {
            const entry = breakdown.find(x => x.key === p.key)
            if (entry) entry.original++
            if (p.key === 'shopee') shopeeCnt++
          }
        }
      }
      return { shopeeCnt, breakdown }
    }

    // Current week
    const curr = countPerWeek(allRows, weekDates[0], weekDates[6])
    setCreatorStats({
      weekNumber,
      shopeeCount: curr.shopeeCnt,
      target: 20,
      weekStart: start,
      weekEnd: end,
      platformBreakdown: curr.breakdown
    })

    // Last 5 weeks - all from the same 1 query, just different date ranges
    const history = []
    for (let i = 1; i <= 5; i++) {
      const pastMonday = new Date(monday)
      pastMonday.setDate(monday.getDate() - (i * 7))
      const pastWeekNumber = getISOWeekNumber(pastMonday)

      const pastWeekDates: string[] = []
      for (let j = 0; j < 7; j++) {
        const d = new Date(pastMonday)
        d.setDate(pastMonday.getDate() + j)
        pastWeekDates.push(formatter.format(d))
      }

      const past = countPerWeek(allRows, pastWeekDates[0], pastWeekDates[6])
      history.push({
        weekNumber: pastWeekNumber,
        shopeeCount: past.shopeeCnt,
        dates: pastWeekDates,
        platformBreakdown: past.breakdown
      })
    }
    setWeeklyHistory(history)
  }, [])

  // Fetch creator stats on mount
  useEffect(() => {
    fetchCreatorStats()
  }, [fetchCreatorStats])


  const handleLoadMore = () => { const np = currentPage + 1; setCurrentPage(np); fetchData(np, false) }

  const handleAddVideo = async () => {
    if (!title) return
    const { error } = await supabase.from('videos').insert({ title, description, srt: srt || null, youtube_url: youtubeUrl || null, youtube_upload_date: youtubeUploadDate, facebook_url: facebookUrl || null, facebook_upload_date: facebookUploadDate, instagram_url: instagramUrl || null, instagram_upload_date: instagramUploadDate, shopee_url: shopeeUrl || null, shopee_upload_date: shopeeUploadDate, shopee_product_url: shopeeProductUrl || null, threads_url: threadsUrl || null, threads_upload_date: threadsUploadDate, tiktok_url: tiktokUrl || null, tiktok_upload_date: tiktokUploadDate, tiktok_product_url: tiktokProductUrl || null })
    if (!error) { setOpen(false); resetForm(); fetchData(0, true) }
  }

  const handleUpdateVideo = async () => {
    if (!editingVideo) return
    const u: any = { title, description, srt: srt || null, youtube_url: youtubeUrl || null, youtube_upload_date: youtubeUploadDate, facebook_url: facebookUrl || null, facebook_upload_date: facebookUploadDate, instagram_url: instagramUrl || null, instagram_upload_date: instagramUploadDate, shopee_url: shopeeUrl || null, shopee_upload_date: shopeeUploadDate, shopee_product_url: shopeeProductUrl || null, threads_url: threadsUrl || null, threads_upload_date: threadsUploadDate, tiktok_url: tiktokUrl || null, tiktok_upload_date: tiktokUploadDate, tiktok_product_url: tiktokProductUrl || null }
    if (createdAt) u.created_at = new Date(createdAt).toISOString()
    const { error } = await supabase.from('videos').update(u).eq('id', editingVideo.id)
    if (!error) {
      setOpen(false);
      setEditingVideo(null);
      resetForm();
      // If bookmark filter is active, fetch bookmarked videos; otherwise use normal fetch
      if (showBookmarkedOnly) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: bookmarkData } = await supabase.from('bookmarks').select('video_id').eq('user_id', user.id)
          if (bookmarkData && bookmarkData.length > 0) {
            const videoIds = bookmarkData.map((b: any) => b.video_id)
            const { data: videoData } = await supabase.from('videos').select('*').in('id', videoIds)
            setVideos((videoData as Video[]) || [])
          }
        }
      } else {
        fetchData(0, true)
      }
    }
  }

  const handleDeleteVideo = async (id: string) => { if (confirm('Are you sure you want to delete this video?')) { await supabase.from('videos').delete().eq('id', id); fetchData(0, true) } }

  const resetForm = () => { setTitle(''); setDescription(''); setSrt(''); setCreatedAt(''); setYoutubeUrl(''); setYoutubeUploadDate(null); setFacebookUrl(''); setFacebookUploadDate(null); setInstagramUrl(''); setInstagramUploadDate(null); setShopeeUrl(''); setShopeeUploadDate(null); setShopeeProductUrl(''); setThreadsUrl(''); setThreadsUploadDate(null); setTiktokUrl(''); setTiktokUploadDate(null); setTiktokProductUrl(''); setAiGenerating(false) }

  const handleGenerateDescription = async () => {
    if (!editingVideo) return
    setAiGenerating(true)
    try {
      const endpoint = import.meta.env.VITE_GENERATE_DESCRIPTION_URL || '/api/generate-description'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: editingVideo.id }),
      })
      const result = await response.json()
      if (!response.ok) {
        const errMsg = result?.error || 'Unknown error from server'
        // Check for specific error messages
        if (errMsg.includes('No SRT')) {
          setSnackbar({ open: true, message: 'Sila tambah kandungan SRT/subtitle dahulu sebelum menggunakan AI.' })
        } else {
          setSnackbar({ open: true, message: `Gagal: ${errMsg}` })
        }
        return
      }
      if (result.success && result.description) {
        setDescription(result.description)
        setSnackbar({ open: true, message: '✅ Description berjaya dijana & disimpan!' })
      } else {
        setSnackbar({ open: true, message: 'Gagal: Response tidak lengkap dari server.' })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ralat rangkaian'
      setSnackbar({ open: true, message: `Gagal menghubungi server: ${msg}` })
    } finally {
      setAiGenerating(false)
    }
  }

  const openEditDialog = (video: Video) => {
    setEditingVideo(video); setTitle(video.title); setDescription(video.description || ''); setSrt(video.srt || ''); setDescriptionFocused(false)
    setCreatedAt(video.created_at ? video.created_at.split('T')[0] : '')
    setYoutubeUrl(video.youtube_url || ''); setYoutubeUploadDate(video.youtube_upload_date || null)
    setFacebookUrl(video.facebook_url || ''); setFacebookUploadDate(video.facebook_upload_date || null)
    setInstagramUrl(video.instagram_url || ''); setInstagramUploadDate(video.instagram_upload_date || null)
    setShopeeUrl(video.shopee_url || ''); setShopeeUploadDate(video.shopee_upload_date || null); setShopeeProductUrl(video.shopee_product_url || '')
    setThreadsUrl(video.threads_url || ''); setThreadsUploadDate(video.threads_upload_date || null)
    setTiktokUrl(video.tiktok_url || ''); setTiktokUploadDate(video.tiktok_upload_date || null); setTiktokProductUrl(video.tiktok_product_url || '')
    setOpen(true)
  }

  const copyToClipboard = async (text: string, platform: string) => { try { await navigator.clipboard.writeText(text); setSnackbar({ open: true, message: `${platform} URL copied to clipboard!` }) } catch { setSnackbar({ open: true, message: 'Failed to copy URL' }) } }
  const openAddDialog = () => { setEditingVideo(null); setDescriptionFocused(false); resetForm(); setOpen(true) }
  const openReuploadDialog = (platform: string) => { setReuploadPlatform(platform); setReuploadUrl(''); setReuploadUploadDate(todayDate); setReuploadNotes(''); setReuploadDialogOpen(true) }

  const handleSaveReupload = async () => {
    if (!editingVideo) return
    const { error } = await supabase.from('reuploads').insert({ video_id: editingVideo.id, platform: reuploadPlatform, url: reuploadUrl || null, upload_date: reuploadUploadDate || null, notes: reuploadNotes || null })
    if (!error) {
      setReuploadDialogOpen(false)
      setOpen(false)
      setEditingVideo(null)
      resetForm()
      setSnackbar({ open: true, message: 'Reupload saved successfully!' })
      // If bookmark filter is active, fetch bookmarked videos; otherwise use normal fetch
      if (showBookmarkedOnly) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: bookmarkData } = await supabase.from('bookmarks').select('video_id').eq('user_id', user.id)
          if (bookmarkData && bookmarkData.length > 0) {
            const videoIds = bookmarkData.map((b: any) => b.video_id)
            const { data: videoData } = await supabase.from('videos').select('*').in('id', videoIds)
            setVideos((videoData as Video[]) || [])
          }
        }
      } else {
        fetchData(0, true)
      }
    } else {
      console.error('Reupload error:', error)
      setSnackbar({ open: true, message: `Failed: ${error.message || 'Unknown error'}` })
    }
  }

  const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null
    const patterns = [/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/, /youtube\.com\/watch\?.*v=([^&\n?#]+)/]
    for (const p of patterns) { const m = url.match(p); if (m) return m[1] }
    return null
  }
  const getAvailablePlatforms = (video: Video) => platforms.filter(p => !!(video[`${p.key}_url` as keyof Video] as string | null))
  const openVideoPlayer = (url: string) => { setSelectedVideoUrl(url); setVideoPlayerOpen(true); setVideoLoading(true) }
  const openUploadInfo = (video: Video) => { setSelectedVideoForInfo(video); setUploadInfoOpen(true) }
  const isMobileDevice = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const searchGoogleDriveLatest = (t: string) => { const f = '1-1cXk5CecrMqVFN0krVA3JUf-SrCJejY'; window.open(`https://drive.google.com/drive/u/0/search?q=${isMobileDevice() ? encodeURIComponent(t) : encodeURIComponent(`${t} parent:${f}`)}`, '_blank') }
  const searchGoogleDriveArchive = (t: string) => { const f = '1DYoHgOxk3UAB6FQgWgbUhbgx9Xg74vDR'; window.open(`https://drive.google.com/drive/u/0/search?q=${isMobileDevice() ? encodeURIComponent(t) : encodeURIComponent(`${t} parent:${f}`)}`, '_blank') }
  const searchGoogleDriveAll = (t: string) => window.open(`https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(t)}`, '_blank')
  const handleVideoLoad = () => setVideoLoading(false)

  const isPlatformDateMatch = (pk: string, v: Video): boolean => {
    const ud = v[`${pk}_upload_date` as keyof Video] as string | null; if (!ud) return false
    if (uploadDateFilter === 'today') return ud === todayDate; if (uploadDateFilter === 'yesterday') return ud === yesterdayDate
    if (uploadDateFilter === 'range-3-9') return dates3to9.includes(ud); if (customUploadDateFilter) return ud === customUploadDateFilter
    return false
  }

  const isPlatformReuploadMatch = (pk: string, vid: string): boolean => {
    let td: string | null = null
    if (uploadDateFilter === 'today') td = todayDate; else if (uploadDateFilter === 'yesterday') td = yesterdayDate
    else if (uploadDateFilter === 'range-3-9') return dates3to9.some(d => reuploads.some(r => r.video_id === vid && r.platform === pk && r.upload_date === d))
    else if (customUploadDateFilter) td = customUploadDateFilter
    if (!td) return false; return reuploads.some(r => r.video_id === vid && r.platform === pk && r.upload_date === td)
  }

  // Toggle bookmark for a video
  const toggleBookmark = async (videoId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSnackbar({ open: true, message: 'Please login to bookmark videos' })
      return
    }

    const isBookmarked = bookmarkedVideoIds.has(videoId)

    if (isBookmarked) {
      // Remove bookmark
      const { error } = await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('video_id', videoId)
      if (!error) {
        setBookmarkedVideoIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(videoId)
          return newSet
        })
        setSnackbar({ open: true, message: 'Bookmark removed' })
      }
    } else {
      // Add bookmark
      const { error } = await supabase.from('bookmarks').insert({ user_id: user.id, video_id: videoId })
      if (!error) {
        setBookmarkedVideoIds(prev => new Set(prev).add(videoId))
        setSnackbar({ open: true, message: 'Video bookmarked!' })
      }
    }
  }


  // Original Creator Card Component
  const OriginalCreatorCard = () => {
    const progressPercent = Math.min((creatorStats.shopeeCount / creatorStats.target) * 100, 100)
    const isReached = creatorStats.shopeeCount >= creatorStats.target

    const getProgressColor = () => {
      if (creatorStats.shopeeCount >= creatorStats.target) return '#4caf50'
      if (creatorStats.shopeeCount >= 15) return '#66bb6a'
      if (creatorStats.shopeeCount >= 10) return '#ff9800'
      return '#ef5350'
    }

    const getStatusText = () => {
      if (isReached) return { text: 'Target Reached', color: 'success' }
      const remaining = creatorStats.target - creatorStats.shopeeCount
      return { text: `${remaining} more needed`, color: 'warning' }
    }

    const status = getStatusText()

    return (
      <Card
        sx={{
          bgcolor: 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          border: (shopeeWeekFilter || shopeeWeekDateRange !== null) ? '1px solid' : '1px solid #f0f0f0',
          borderColor: (shopeeWeekFilter || shopeeWeekDateRange !== null) ? 'primary.main' : '#f0f0f0',
          '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
        }}
        onClick={() => {
          // Toggle filter - if already active, clear it
          if (shopeeWeekFilter) {
            setShopeeWeekFilter(false)
            setShopeeWeekDateRange(null)
            // Don't need to fetch again - just reset filter, data is already loaded
          } else {
            // Filter to show shopee videos in current week
            // Don't set platformFilter - we want to show videos with shopee_upload_date even if shopee_url is empty
            setUploadDateFilter('')
            setCustomUploadDateFilter('')
            setSearchQuery('')
            setActiveSearchQuery('')
            setDateFilter('')
            setFilterEmptyPlatform(null)
            setShopeeWeekFilter(true)
            setShopeeWeekDateRange(null)
          }
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          {/* Duration Badge */}
          <Box sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1,
            py: 0.25,
            bgcolor: '#f3e5f5',
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 600,
            color: '#7c4dff',
            mb: 1
          }}>
            <Box sx={{
              bgcolor: '#7c4dff',
              color: 'white',
              borderRadius: '50%',
              width: 16,
              height: 16,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10
            }}>W</Box>
            Week {creatorStats.weekNumber}
            <Typography component="span" sx={{ color: '#999', fontWeight: 400 }}>|</Typography>
            Repeat weekly
          </Box>

          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Shop sx={{ fontSize: 18, color: '#EE4D2D' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Original Creator
              </Typography>
            </Box>
            <Chip
              label={isReached ? "✓ Target Reached" : "⏳ In Progress"}
              size="small"
              sx={{
                height: 20,
                fontSize: 11,
                bgcolor: isReached ? '#e8f5e9' : '#fff3e0',
                color: isReached ? '#2e7d32' : '#e65100',
                fontWeight: 600
              }}
            />
          </Box>

          {/* Duration Text */}
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
            Wed, {creatorStats.weekStart} 12:00am – Tue, {creatorStats.weekEnd} 11:59pm
          </Typography>

          {/* Progress Section */}
          <Box sx={{ bgcolor: '#f9f9f9', borderRadius: 1, p: 1.5, mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                Shopee Videos
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16 }}>
                <Typography component="span" sx={{ color: 'text.primary' }}>{creatorStats.shopeeCount}</Typography>
                <Typography component="span" sx={{ color: '#999', fontWeight: 400 }}> / </Typography>
                <Typography component="span" sx={{ color: '#7c4dff' }}>{creatorStats.target}</Typography>
              </Typography>
            </Box>

            {/* Progress Bar */}
            <Box sx={{ width: '100%', height: 8, bgcolor: '#e0e0e0', borderRadius: 1, overflow: 'hidden', mb: 1 }}>
              <Box sx={{
                width: `${progressPercent}%`,
                height: '100%',
                bgcolor: getProgressColor(),
                transition: 'width 0.5s ease'
              }} />
            </Box>

            {/* Status */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                {isReached ? 'Target achieved 🎉' : <><strong>{creatorStats.target - creatorStats.shopeeCount}</strong> more needed</>}
              </Typography>
              <Typography variant="caption" sx={{
                fontSize: 11,
                fontWeight: 600,
                color: isReached ? '#2e7d32' : '#e65100'
              }}>
                {status.text}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    )
  }

  // Weekly History Dialog Component
  const WeeklyHistoryDialog = () => {
    const getProgressColor = (count: number) => {
      if (count >= 20) return '#4caf50'
      if (count >= 15) return '#66bb6a'
      if (count >= 10) return '#ff9800'
      return '#ef5350'
    }

    return (
      <Dialog open={weeklyHistoryOpen} onClose={() => setWeeklyHistoryOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Weekly History (Last 5 Weeks)</Typography>
            <IconButton onClick={() => setWeeklyHistoryOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {weeklyHistory.map((week, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  py: 1,
                  borderBottom: index < weeklyHistory.length - 1 ? '1px solid #eee' : 'none',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#f5f5f5' }
                }}
                onClick={() => {
                  // Filter to show shopee videos for this specific week
                  setPlatformFilter('')
                  setUploadDateFilter('')
                  setCustomUploadDateFilter('')
                  setSearchQuery('')
                  setActiveSearchQuery('')
                  setDateFilter('')
                  setFilterEmptyPlatform(null)
                  setShopeeWeekFilter(false)
                  setShopeeWeekDateRange(week.dates)
                  setWeeklyHistoryOpen(false)
                }}
              >
                <Box sx={{ width: 40, flexShrink: 0 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>W{week.weekNumber}</Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {week.dates[0]} - {week.dates[6]}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {week.shopeeCount} / 20
                    </Typography>
                  </Box>
                  <Box sx={{ width: '100%', height: 6, bgcolor: '#e0e0e0', borderRadius: 1, overflow: 'hidden' }}>
                    <Box sx={{
                      width: `${Math.min((week.shopeeCount / 20) * 100, 100)}%`,
                      height: '100%',
                      bgcolor: getProgressColor(week.shopeeCount)
                    }} />
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
      </Dialog>
    )
  }

  // Campaign Day: History dialog — row helper
  const CampaignHistoryRow = ({ p, campaign, getProgressColor }: {
    p: { periodNumber: number; start: string; end: string; count: number; tier: CampaignTier | null; maxTarget: number; tierProgresses: TierProgress[] }
    campaign: CampaignWithTiers | null
    getProgressColor: (count: number, max: number) => string
  }) => (
    <Box key={p.periodNumber}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, flexShrink: 0 }}>
            {campaign ? periodLabel(campaign.repeat_interval, p.periodNumber) : `P${p.periodNumber}`}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0 }}>
            {formatDateLabel(p.start)} - {formatDateLabel(p.end)}
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 600, flexShrink: 0 }}>
            {p.count} / {p.maxTarget}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          {p.tierProgresses.map((tp) => {
            const achieved = tp.count >= tp.target_videos
            const isLast = tp.tier.tier_number === p.tierProgresses[p.tierProgresses.length - 1].tier.tier_number
            const isCurrentTier = p.tier !== null && tp.tier.tier_number === p.tier.tier_number
            const badgeColor = achieved
              ? '#2e7d32'
              : isCurrentTier && !achieved
                ? '#c62828'
                : isLast && !achieved
                  ? '#c62828'
                  : '#9e9e9e'
            const badgeBg = achieved ? '#e8f5e9' : isCurrentTier || (isLast && !achieved) ? '#ffebee' : '#e0e0e0'
            const badgeLabel = achieved ? `✔ Tier ${tp.tier.tier_number}` : `✘ Tier ${tp.tier.tier_number}`
            return (
              <Box key={tp.tier.id} sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.25,
                px: 0.75, py: 0.25, borderRadius: 8,
                fontSize: 10, fontWeight: 700,
                bgcolor: badgeBg, color: badgeColor, whiteSpace: 'nowrap',
              }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: badgeColor, flexShrink: 0 }} />
                {badgeLabel}
              </Box>
            )
          })}
        </Box>
      </Box>
      <Box sx={{ width: '100%', height: 8, bgcolor: '#e0e0e0', borderRadius: 1, overflow: 'hidden' }}>
        <Box sx={{ width: `${Math.min((p.count / p.maxTarget) * 100, 100)}%`, height: '100%', bgcolor: getProgressColor(p.count, p.maxTarget), transition: 'width 0.5s ease' }} />
      </Box>
    </Box>
  )

  // Campaign Day: History dialog
  const CampaignHistoryDialog = () => {
    const getProgressColor = (count: number, max: number) => {
      const pct = max > 0 ? count / max : 0
      if (pct >= 1) return '#4caf50'
      if (pct >= 0.66) return '#66bb6a'
      if (pct >= 0.33) return '#ff9800'
      return '#ef5350'
    }

    return (
      <Dialog open={!!historyCampaign} onClose={() => setHistoryCampaign(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">{historyCampaign ? `${historyCampaign.name} — History` : 'History'}</Typography>
            <IconButton onClick={() => setHistoryCampaign(null)} size="small"><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {historyCampaign && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {historyCampaign.platform.charAt(0).toUpperCase() + historyCampaign.platform.slice(1)} · Repeat {historyCampaign.repeat_interval} · {formatDateLabel(historyCampaign.start_date)} – {formatDateLabel(historyCampaign.end_date)}
            </Typography>
          )}
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
          ) : historyStats.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>No period history yet.</Typography>
          ) : (
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {historyStats.map((p) => (
                <CampaignHistoryRow
                  key={p.periodNumber}
                  p={p}
                  campaign={historyCampaign}
                  getProgressColor={getProgressColor}
                />
              ))}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    )
  }

  // Campaign Day: Past Campaigns dialog
  const PastCampaignsDialog = () => {
    const today = todayStr()
    const ended = campaigns.filter((c) => c.end_date && c.end_date < today)

    return (
      <Dialog open={pastCampaignsOpen} onClose={() => setPastCampaignsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Past Campaigns</Typography>
            <IconButton onClick={() => setPastCampaignsOpen(false)} size="small"><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {ended.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>No past campaigns yet.</Typography>
          ) : (
            <Box sx={{ mt: 1 }}>
              {ended.map((c) => {
                const st = pastCampaignStats[c.id]
                return (
                  <Box key={c.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderBottom: '1px solid #eee' }}>
                    <Box sx={{ color: getPlatformColor(c.platform), flexShrink: 0 }}>{platformIcons[c.platform]}</Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{c.name}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {formatDateLabel(c.start_date)} - {formatDateLabel(c.end_date)} · Repeat {c.repeat_interval}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: st?.bestTier ? '#2e7d32' : 'text.secondary' }}>
                        {st?.bestTier ? `Best: Tier ${st.bestTier.tier_number}` : 'No tier reached'}
                      </Typography>
                      {st && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Best: {st.bestCount} videos</Typography>}
                      {c.track_history && (
                        <Button size="small" variant="text" onClick={() => openCampaignHistory(c)} sx={{ p: 0, mt: 0.5, fontSize: 11 }}>View History</Button>
                      )}
                    </Box>
                  </Box>
                )
              })}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    )
  }

  const displayedVideos = videos

  const debugTotalTime = debugQueries.length > 0
    ? debugQueries.reduce((sum, q) => sum + q.time, 0)
    : 0

  return (
    <Box>
      {/* Debug Panel */}
      {debugEnabled && debugQueries.length > 0 && (
        <Box sx={{ mb: 2, p: 2, bgcolor: '#1a1a2e', color: '#00ff88', borderRadius: 1, fontFamily: 'monospace', fontSize: 12, maxHeight: 300, overflow: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ color: '#00ff88', fontWeight: 700 }}>
              🔍 SQL Queries: {debugQueries.length} queries • ~{debugTotalTime}ms
            </Typography>
            <Button size="small" variant="outlined" sx={{ color: '#00ff88', borderColor: '#00ff88', fontSize: 11 }} onClick={() => setDebugQueries([])}>Clear</Button>
          </Box>
          <Box component="div" sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            {debugQueries.map((q, i) => (
              <Box key={i} sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, py: 0.25 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Typography component="span" sx={{ color: '#ff6b6b', fontSize: 10, minWidth: 20 }}>#{q.ts}</Typography>
                  <Typography component="span" sx={{ color: q.time > 100 ? '#ff6b6b' : '#00ff88', fontSize: 10, minWidth: 40 }}>{q.time}ms</Typography>
                  <Typography component="span" sx={{ color: '#64b5f6', fontSize: 10, fontWeight: 600, flex: 1 }}>{q.purpose}</Typography>
                </Box>
                <Typography component="span" sx={{ color: '#aaaaaa', fontSize: 10, pl: 6, wordBreak: 'break-all' }}>{q.sql}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box><Typography variant="h4" sx={{ fontWeight: 700 }}>Videos</Typography><Typography variant="body2" color="text.secondary">Track video uploads across platforms with quick search and smart filters.</Typography></Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<ReplayIcon />} onClick={() => {
            localStorage.removeItem(`stats_${getTodayDate()}`)
            fetchStats()
          }} size="medium">Refresh Stats</Button>
          <Button variant="contained" startIcon={<Add />} onClick={openAddDialog} size="medium">Add Video</Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Statistics
        </Typography>
        <IconButton size="small" onClick={() => setHideStats(!hideStats)} sx={{ color: 'text.secondary', p: 0.5 }} aria-label="Toggle statistics">
          {hideStats ? <ExpandMore /> : <ExpandLess />}
        </IconButton>
      </Box>

      <Collapse in={!hideStats}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 2, mb: 2 }}>
        <StatCard filterKey="today" title="Total videos uploaded today" videoCount={todayStats.videoCount} platformUploadCount={todayStats.platformBreakdown.reduce((t, p) => t + p.original + p.reupload, 0)} uploadDateFilter={uploadDateFilter} onFilterClick={handleStatCardClick} platformBreakdown={todayStats.platformBreakdown} />
        <StatCard filterKey="yesterday" title="Total videos uploaded yesterday" videoCount={yesterdayStats.videoCount} platformUploadCount={yesterdayStats.platformBreakdown.reduce((t, p) => t + p.original + p.reupload, 0)} uploadDateFilter={uploadDateFilter} onFilterClick={handleStatCardClick} platformBreakdown={yesterdayStats.platformBreakdown} />
        <StatCard filterKey="range-3-9" title="Days 3-9 uploads" videoCount={range3to9Stats.videoCount} platformUploadCount={range3to9Stats.platformBreakdown.reduce((t, p) => t + p.original + p.reupload, 0)} uploadDateFilter={uploadDateFilter} onFilterClick={handleStatCardClick} platformBreakdown={range3to9Stats.platformBreakdown} />
        <OriginalCreatorCard />
      </Box>
      </Collapse>

      {/* Campaign Day section */}
      <CampaignSectionView
        campaigns={campaigns}
        campaignLoading={campaignLoading}
        campaignStats={campaignStats}
        hideCampaigns={hideCampaigns}
        onToggleHide={() => setHideCampaigns(!hideCampaigns)}
        isAdmin={isAdmin}
        onManage={() => navigate('/campaigns')}
        onOpenHistory={openCampaignHistory}
        onOpenPastCampaigns={openPastCampaigns}
      />

      <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, mb: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <Box sx={{ flex: 1, minWidth: 200, position: 'relative', display: 'flex', gap: 1 }}>
          <SearchIcon sx={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'text.secondary', fontSize: 20, zIndex: 1 }} />
          <TextField
            inputRef={searchInputRef}
            size="small"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            sx={{ width: '100%', '& .MuiOutlinedInput-root': { pl: 4 } }}
          />
          {searchQuery && (
            <Button
              variant="contained"
              size="small"
              onClick={handleSearch}
              sx={{ minWidth: 80 }}
            >
              Search
            </Button>
          )}
        </Box>
        <TextField size="small" label="Date" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} sx={{ minWidth: { xs: '100%', sm: 160 } }} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" label="Upload Date" type="date" value={customUploadDateFilter} onChange={(e) => setCustomUploadDateFilter(e.target.value)} sx={{ minWidth: { xs: '100%', sm: 160 } }} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} sx={{ minWidth: { xs: '100%', sm: 150 } }} slotProps={{ select: { native: true, displayEmpty: true } }}>
          <option value="">Platform</option>
          {platforms.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </TextField>
        <Chip
          label="Bookmarked"
          size="small"
          onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
          color={showBookmarkedOnly ? 'primary' : 'default'}
          variant={showBookmarkedOnly ? 'filled' : 'outlined'}
          sx={{ cursor: 'pointer', height: 36 }}
        />
        {focusedVideoId && (
        <Chip
          label="Focus"
          size="small"
          onClick={toggleFocusFilter}
          color={filterFocusActive ? 'primary' : 'default'}
          variant={filterFocusActive ? 'filled' : 'outlined'}
          sx={{ cursor: 'pointer', height: 36 }}
        />
      )}
      {(searchQuery || dateFilter || customUploadDateFilter || filterEmptyPlatform || platformFilter || uploadDateFilter || showBookmarkedOnly || shopeeWeekFilter || shopeeWeekDateRange || focusedVideoId || filterFocusActive) && (
        <Button variant="outlined" size="small" onClick={() => {
          setSearchQuery(''); setActiveSearchQuery(''); setDateFilter(''); setCustomUploadDateFilter('');
          const hadFilter = !!filterEmptyPlatform
          setFilterEmptyPlatform(null); setPlatformFilter(''); setUploadDateFilter('');
          setShowBookmarkedOnly(false); setShopeeWeekFilter(false); setShopeeWeekDateRange(null)
          setFocusedVideoId(null); localStorage.removeItem('videos_focused_video_id')
          setFilterFocusActive(false)
          if (hadFilter) setTimeout(() => { setCurrentPage(0); setVideos([]); setHasMore(true); fetchData(0, true) }, 0)
        }} startIcon={<CloseIcon />}>Clear</Button>
      )}
      </Box>

      {focusedVideoId && filterFocusActive && <Alert severity="info" sx={{ mb: 2 }}>Showing focused video only. Click the star ⭐ on any video to change focus or Clear button.</Alert>}
      {filterEmptyPlatform && <Alert severity="info" sx={{ mb: 2 }}>Showing videos without {filterEmptyPlatform} URL</Alert>}
      {showBookmarkedOnly && <Alert severity="info" sx={{ mb: 2 }}>Showing only bookmarked videos</Alert>}
      {shopeeWeekFilter && <Alert severity="info" sx={{ mb: 2 }}>Showing Shopee videos uploaded this week (Wed-Tue)</Alert>}
      {shopeeWeekDateRange && <Alert severity="info" sx={{ mb: 2 }}>Showing Shopee videos for selected week</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}><CircularProgress /></Box>
      ) : displayedVideos.length === 0 ? (
        <Typography color="text.secondary" align="center" sx={{ py: 6 }}>{focusedVideoId ? 'Focused video saved. Click the star ⭐ on another video to change focus or Clear button.' : showBookmarkedOnly ? 'No bookmarked videos found. Click the bookmark icon on videos to bookmark them.' : 'No videos found matching your criteria'}</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {displayedVideos.map((video) => {
            const videoId = video.youtube_url ? getYouTubeVideoId(video.youtube_url) : null
            const isFocused = focusedVideoId === video.id
            return (
              <Card key={video.id} sx={{ border: isFocused ? '2px solid' : '1px solid', borderColor: isFocused ? 'warning.main' : '#f0f0f0', '&:hover': { transform: isFocused ? 'translateY(0)' : 'translateY(-2px)', boxShadow: isFocused ? '0 2px 8px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.1)' } }}>
                <CardContent sx={{ py: 2, px: { xs: 2, md: 2.5 } }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    {videoId ? (
                      <Box component="img" src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} alt={video.title} onClick={() => openVideoPlayer(video.youtube_url!)}
                        onError={(e) => { const t = e.target as HTMLImageElement; if (t.src.includes('mqdefault')) t.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`; else if (t.src.includes('hqdefault')) t.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`; else t.style.display = 'none' }}
                        sx={{ width: 120, height: 160, objectFit: 'cover', borderRadius: 1, cursor: 'pointer', flexShrink: 0, '&:hover': { opacity: 0.8 } }} />
                    ) : (
                      <Box sx={{ width: 120, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1, bgcolor: 'grey.200', flexShrink: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>No Video</Typography>
                      </Box>
                    )}
                    <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', flex: 1 }}>{video.title}</Typography>
                        {video.description && (<IconButton size="small" onClick={() => { setSelectedDescription(video.description || ''); setSelectedDescriptionVideo(video); setDescriptionOpen(true) }} sx={{ p: 0.5 }} title="View description"><Info fontSize="small" /></IconButton>)}
                        <IconButton
                          size="small"
                          onClick={() => toggleFocusVideo(video.id)}
                          sx={{ p: 0.5, color: focusedVideoId === video.id ? 'warning.main' : 'text.secondary' }}
                          title={focusedVideoId === video.id ? 'Clear focus (click again)' : 'Set as focused video (only 1 video can be focused)'}
                        >
                          {focusedVideoId === video.id ? <Star fontSize="small" /> : <StarOutlined fontSize="small" />}
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => toggleBookmark(video.id)}
                          sx={{ p: 0.5, color: bookmarkedVideoIds.has(video.id) ? 'primary.main' : 'text.secondary' }}
                          title={bookmarkedVideoIds.has(video.id) ? 'Remove bookmark' : 'Bookmark this video'}
                        >
                          {bookmarkedVideoIds.has(video.id) ? <Bookmark fontSize="small" /> : <BookmarkBorder fontSize="small" />}
                        </IconButton>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>{new Date(video.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>Platforms</Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, auto)' }, gap: 0.5, mb: 1.5, width: '100%' }}>
                            {platforms.map((p) => {
                              const has = !!video[`${p.key}_url` as keyof Video]; const ic = platformIcons[p.key]; const dm = isPlatformDateMatch(p.key, video); const rm = isPlatformReuploadMatch(p.key, video.id)
                              return (<Chip key={p.key} icon={ic || undefined} label={p.label} size="small" onClick={() => has && copyToClipboard(video[`${p.key}_url` as keyof Video] as string, p.label)}
                                sx={{ cursor: has ? 'pointer' : 'default', opacity: has ? 1 : 0.4, fontWeight: 500, fontSize: 12, height: 28, '&:hover': has ? { opacity: 0.8 } : {}, '& .MuiChip-icon': { fontSize: 16 }, ...(dm && !rm && { border: '1px solid', borderColor: '#81c784' }), ...(rm && { border: '1px solid', borderColor: '#ffb74d', color: '#ff9800', '& .MuiChip-icon': { color: '#ff9800', fontSize: 16 } }) }}
                                variant={has ? 'filled' : 'outlined'} color={has ? 'default' : 'default'} />)
                            })}
                          </Box>
                          <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>Google Drive</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                            {isMobileDevice() ? (<Chip icon={<GoogleDriveIcon />} label="Drive" size="small" onClick={() => searchGoogleDriveAll(video.title)} sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 }, height: 28 }} title="Search in Google Drive" />)
                              : (<><Chip icon={<GoogleDriveIcon />} label="Drive" size="small" onClick={() => searchGoogleDriveLatest(video.title)} sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 }, height: 28 }} title="Latest" /><Chip icon={<GoogleDriveIcon />} label="Arc" size="small" onClick={() => searchGoogleDriveArchive(video.title)} sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 }, height: 28 }} title="Archive" /></>)}
                          </Box>
                          {(video.tiktok_product_url || video.shopee_product_url) && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.25 }}>
                              {video.tiktok_product_url && <Chip icon={<TikTokIcon />} label="TikTok Shop" size="small" onClick={() => copyToClipboard(video.tiktok_product_url!, 'TikTok Shop')} sx={{ cursor: 'pointer', bgcolor: '#000', color: 'white', '&:hover': { bgcolor: '#333' }, height: 28 }} />}
                              {video.shopee_product_url && <Chip icon={<Shop />} label="Shopee" size="small" onClick={() => copyToClipboard(video.shopee_product_url!, 'Shopee')} sx={{ cursor: 'pointer', bgcolor: '#EE4D2D', color: 'white', '&:hover': { bgcolor: '#D43D1F' }, height: 28 }} />}
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flexShrink: 0 }}>
                          <IconButton size="small" onClick={() => openUploadInfo(video)} title="Upload Info"><Upload fontSize="small" /></IconButton>
                          <IconButton size="small" onClick={() => openEditDialog(video)} title="Edit"><Edit fontSize="small" /></IconButton>
                          <IconButton size="small" onClick={() => handleDeleteVideo(video.id)} title="Delete"><Delete fontSize="small" /></IconButton>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )
          })}
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            {loadingMore ? (<CircularProgress size={28} />) : hasMore ? (<Button variant="outlined" onClick={handleLoadMore} startIcon={<ReplayIcon />} size="medium">Load More</Button>) : videos.length >= ITEMS_PER_PAGE ? (<Typography color="text.secondary" variant="body2">All videos loaded</Typography>) : null}
          </Box>
        </Box>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ pb: 1 }}><Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">{editingVideo ? 'Edit Video' : 'Add Video'}</Typography>
          {isMobile && <IconButton onClick={() => setOpen(false)} size="small"><CloseIcon /></IconButton>}</Box></DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth margin="normal" required size={isMobile ? 'small' : 'medium'} />
          <Typography variant="subtitle1" sx={{ mt: 1, mb: 0.5, fontWeight: 600 }}>SRT / Subtitle</Typography>
          <TextField label="SRT Content" value={srt} onChange={(e) => setSrt(e.target.value)} fullWidth margin="normal" multiline minRows={4} maxRows={10} size={isMobile ? 'small' : 'medium'} placeholder="Paste SRT/subtitle content here...
Example:
1
00:00:01,000 --> 00:00:05,000
Assalamualaikum dan selamat datang

2
00:00:05,000 --> 00:00:10,000
Hari ini kita nak tengok produk terbaru" />
          {editingVideo && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleGenerateDescription}
                disabled={aiGenerating}
                sx={{ minWidth: 160, whiteSpace: 'nowrap' }}
                startIcon={aiGenerating ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
              >
                {aiGenerating ? 'Sedang Jana...' : 'Jana Description (AI)'}
              </Button>
            </Box>
          )}
          <Typography variant="subtitle1" sx={{ mt: 1, mb: 0.5, fontWeight: 600 }}>Description (AI Output)</Typography>
          <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth margin="normal" multiline
            minRows={isMobile ? (descriptionFocused ? undefined : 3) : 6} maxRows={isMobile ? (descriptionFocused ? undefined : 3) : undefined}
            size={isMobile ? 'small' : 'medium'} onFocus={() => isMobile && setDescriptionFocused(true)} onBlur={() => isMobile && setDescriptionFocused(false)}
            sx={isMobile && descriptionFocused ? { '& .MuiInputBase-root': { minHeight: '75vh', alignItems: 'flex-start' } } : {}} />
          {editingVideo && <TextField label="Created At" type="date" value={createdAt} onChange={(e) => setCreatedAt(e.target.value)} fullWidth margin="normal" size={isMobile ? 'small' : 'medium'} slotProps={{ inputLabel: { shrink: true } }} />}
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>Platform Links</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {(['tiktok', 'youtube', 'facebook', 'instagram', 'shopee', 'threads'] as const).map((p) => {
              const urlVal = p === 'tiktok' ? tiktokUrl : p === 'youtube' ? youtubeUrl : p === 'facebook' ? facebookUrl : p === 'instagram' ? instagramUrl : p === 'shopee' ? shopeeUrl : threadsUrl
              const dateVal = p === 'tiktok' ? tiktokUploadDate : p === 'youtube' ? youtubeUploadDate : p === 'facebook' ? facebookUploadDate : p === 'instagram' ? instagramUploadDate : p === 'shopee' ? shopeeUploadDate : threadsUploadDate
              const setUrl = p === 'tiktok' ? setTiktokUrl : p === 'youtube' ? setYoutubeUrl : p === 'facebook' ? setFacebookUrl : p === 'instagram' ? setInstagramUrl : p === 'shopee' ? setShopeeUrl : setThreadsUrl
              const setDate = p === 'tiktok' ? setTiktokUploadDate : p === 'youtube' ? setYoutubeUploadDate : p === 'facebook' ? setFacebookUploadDate : p === 'instagram' ? setInstagramUploadDate : p === 'shopee' ? setShopeeUploadDate : setThreadsUploadDate
              return (<Box key={p} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField label="Upload Date" type="date" value={dateVal || ''} onChange={(e) => setDate(e.target.value || null)} sx={{ flex: 1 }} size="small" slotProps={{ inputLabel: { shrink: true } }} key={`${p}-date-${urlVal ? 'has-url' : 'no-url'}`} />
                <TextField label={`${p.charAt(0).toUpperCase() + p.slice(1)} URL`} value={urlVal} onChange={(e) => setUrl(e.target.value)} sx={{ flex: 2 }} size="small" placeholder="https://..."
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <IconButton size="small" onClick={async () => { try { const t = await navigator.clipboard.readText(); setUrl(t); setSnackbar({ open: true, message: `Pasted to ${p.charAt(0).toUpperCase() + p.slice(1)} URL` }) } catch { } }} title="Paste" sx={{ p: 0.5, opacity: 0.7, '&:hover': { opacity: 1 } }}>
                            <PasteIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                />
                {editingVideo && (
                  <IconButton size="small" onClick={() => openReuploadDialog(p)} title={`Reupload ${p}`} color="warning" sx={{ flexShrink: 0 }}>
                    <ReplayIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>)
            })}
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Product Links</Typography>
          <TextField label="TikTok Product URL" value={tiktokProductUrl} onChange={(e) => setTiktokProductUrl(e.target.value)} fullWidth size="small" placeholder="https://..." sx={{ mb: 1.5 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <IconButton size="small" onClick={async () => { try { const t = await navigator.clipboard.readText(); setTiktokProductUrl(t); setSnackbar({ open: true, message: 'Pasted to TikTok Product URL' }) } catch { } }} title="Paste" sx={{ p: 0.5, opacity: 0.7, '&:hover': { opacity: 1 } }}>
                      <PasteIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }
            }}
          />
          <TextField label="Shopee Product URL" value={shopeeProductUrl} onChange={(e) => setShopeeProductUrl(e.target.value)} fullWidth size="small" placeholder="https://..."
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <IconButton size="small" onClick={async () => { try { const t = await navigator.clipboard.readText(); setShopeeProductUrl(t); setSnackbar({ open: true, message: 'Pasted to Shopee Product URL' }) } catch { } }} title="Paste" sx={{ p: 0.5, opacity: 0.7, '&:hover': { opacity: 1 } }}>
                      <PasteIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          {!isMobile && <Button onClick={() => setOpen(false)}>Cancel</Button>}
          <Button onClick={editingVideo ? handleUpdateVideo : handleAddVideo} variant="contained" fullWidth={isMobile}>{editingVideo ? 'Update' : 'Add'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={reuploadDialogOpen} onClose={() => setReuploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle><Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Reupload - {reuploadPlatform.charAt(0).toUpperCase() + reuploadPlatform.slice(1)}</Typography>
          <IconButton onClick={() => setReuploadDialogOpen(false)} size="small"><CloseIcon /></IconButton></Box></DialogTitle>
        <DialogContent><Box sx={{ mt: 1 }}>
          <TextField label="Platform" value={reuploadPlatform.charAt(0).toUpperCase() + reuploadPlatform.slice(1)} fullWidth margin="normal" size="small" disabled />
          <TextField label="URL" value={reuploadUrl} onChange={(e) => setReuploadUrl(e.target.value)} fullWidth margin="normal" size="small" placeholder="https://..."
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <IconButton size="small" onClick={async () => { try { const t = await navigator.clipboard.readText(); setReuploadUrl(t); setSnackbar({ open: true, message: 'Pasted to URL' }) } catch { } }} title="Paste" sx={{ p: 0.5, opacity: 0.7, '&:hover': { opacity: 1 } }}>
                      <PasteIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }
            }}
          />
          <TextField label="Upload Date" type="date" value={reuploadUploadDate} onChange={(e) => setReuploadUploadDate(e.target.value)} fullWidth margin="normal" size="small" slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="Notes (optional)" value={reuploadNotes} onChange={(e) => setReuploadNotes(e.target.value)} fullWidth margin="normal" size="small" multiline rows={3} placeholder="e.g. Reupload sebab video expired" />
        </Box></DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={() => setReuploadDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveReupload} variant="contained" color="warning" startIcon={<ReplayIcon />}>Save Reupload</Button></DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>

      <Dialog open={descriptionOpen} onClose={() => setDescriptionOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle><Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>Description</span><IconButton onClick={() => setDescriptionOpen(false)} size="small"><CloseIcon /></IconButton></Box></DialogTitle>
        <DialogContent>
          {parseDescription(selectedDescription).map((s, i) => (<Box key={i} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>{s.title}</Typography>
              {s.content && <IconButton size="small" onClick={() => copyToClipboard(s.content, s.title)} title="Copy content"><CopyIcon fontSize="small" /></IconButton>}</Box>
            {s.content && <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}><Typography variant="body2" sx={{ whiteSpace: 'pre-line', fontSize: 13 }}>{s.content}</Typography></Box>}
          </Box>))}
          {(selectedDescriptionVideo?.shopee_product_url || selectedDescriptionVideo?.tiktok_product_url) && (
            <><Divider sx={{ my: 2 }} /><Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Product Links</Typography>
              {selectedDescriptionVideo?.shopee_product_url && (
                <Box sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Shop sx={{ fontSize: 18, color: '#EE4D2D' }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#EE4D2D' }}>Shopee Product URL</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => copyToClipboard(selectedDescriptionVideo.shopee_product_url!, 'Shopee Product')} title="Copy URL">
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                    <Typography variant="body2" sx={{ fontSize: 13, wordBreak: 'break-all' }}>{selectedDescriptionVideo.shopee_product_url}</Typography>
                  </Box>
                </Box>
              )}
              {selectedDescriptionVideo?.tiktok_product_url && (
                <Box sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TikTokIcon sx={{ fontSize: 18 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>TikTok Product URL</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => copyToClipboard(selectedDescriptionVideo.tiktok_product_url!, 'TikTok Product')} title="Copy URL">
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                    <Typography variant="body2" sx={{ fontSize: 13, wordBreak: 'break-all' }}>{selectedDescriptionVideo.tiktok_product_url}</Typography>
                  </Box>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        {!isMobile && <DialogActions><Button onClick={() => setDescriptionOpen(false)}>Close</Button></DialogActions>}
      </Dialog>

      <Dialog open={videoPlayerOpen} onClose={() => setVideoPlayerOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ pb: 0 }}><Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>Video Player</span><IconButton onClick={() => setVideoPlayerOpen(false)} size="small"><CloseIcon /></IconButton></Box></DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {selectedVideoUrl && getYouTubeVideoId(selectedVideoUrl) && (
            <>
              {videoLoading && <Box sx={{ width: '100%', height: isMobile ? '85vh' : '80vh', maxWidth: 450, mx: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}><CircularProgress color="primary" /></Box>}
              <Box sx={{ position: 'relative', width: '100%', height: isMobile ? '85vh' : '80vh', maxWidth: 450, mx: 'auto', overflow: 'hidden', display: videoLoading ? 'none' : 'block' }}>
                <iframe src={`https://www.youtube.com/embed/${getYouTubeVideoId(selectedVideoUrl)}?autoplay=1`} title="YouTube video player"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen onLoad={handleVideoLoad} />
              </Box>
            </>
          )}
          <Box sx={{ mt: 2, px: 2, pb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Available Platforms:</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {(() => {
                const cv = videos.find(v => v.youtube_url === selectedVideoUrl || v.facebook_url === selectedVideoUrl || v.instagram_url === selectedVideoUrl || v.tiktok_url === selectedVideoUrl || v.threads_url === selectedVideoUrl || v.shopee_url === selectedVideoUrl)
                if (!cv) return null
                return getAvailablePlatforms(cv).map(p => {
                  const u = cv[`${p.key}_url` as keyof Video] as string
                  return <Button key={p.key} href={u} target="_blank" rel="noopener noreferrer" variant={p.key === 'youtube' ? 'contained' : 'outlined'} startIcon={platformIcons[p.key] || undefined} size="small">{p.label}</Button>
                })
              })()}
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadInfoOpen} onClose={() => setUploadInfoOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle><Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>Upload Info - {selectedVideoForInfo?.title}</span><IconButton onClick={() => setUploadInfoOpen(false)} size="small"><CloseIcon /></IconButton></Box></DialogTitle>
        <DialogContent>
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table size={isMobile ? 'small' : 'medium'}>
              <TableHead><TableRow><TableCell><strong>Platform</strong></TableCell><TableCell><strong>Upload Date</strong></TableCell><TableCell><strong>URL</strong></TableCell><TableCell><strong>Reuploads</strong></TableCell></TableRow></TableHead>
              <TableBody>
                {selectedVideoForInfo && platforms.map((p) => {
                  const url = selectedVideoForInfo[`${p.key}_url` as keyof Video] as string | null
                  const ud = selectedVideoForInfo[`${p.key}_upload_date` as keyof Video] as string | null
                  const isUp = !!url
                  return (
                    <TableRow key={p.key} hover>
                      <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{platformIcons[p.key]}{p.label}</Box></TableCell>
                      <TableCell>{isUp ? (ud || '-') : <Chip label="Not Uploaded" size="small" color="warning" variant="outlined" />}</TableCell>
                      <TableCell>{isUp ? <Button href={url} target="_blank" rel="noopener noreferrer" size="small" variant="text">Open Link</Button> : <Typography color="text.secondary" variant="body2">-</Typography>}</TableCell>
                      <TableCell>
                        {(() => {
                          const vr = reuploads.filter(r => r.video_id === selectedVideoForInfo.id && r.platform === p.key)
                          if (vr.length === 0) return <Typography color="text.secondary" variant="body2">-</Typography>
                          return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>{vr.map(r => <Chip key={r.id} label={r.upload_date || 'No date'} size="small" color="warning" variant="outlined" sx={{ fontSize: 11, height: 20, fontWeight: 500 }} />)}</Box>
                        })()}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>

      <WeeklyHistoryDialog />
      <CampaignHistoryDialog />
      <PastCampaignsDialog />
    </Box>
  )
}
