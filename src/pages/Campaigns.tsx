import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Box,
    Typography,
    Card,
    CardContent,
    TextField,
    Button,
    IconButton,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControlLabel,
    Switch,
    Snackbar,
    Alert,
    CircularProgress,
    Divider,
    MenuItem,
} from '@mui/material'
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Campaign as CampaignIcon,
    Close as CloseIcon,
} from '@mui/icons-material'
import { useAuth } from '../hooks/useAuth.tsx'
import {
    PLATFORMS,
    fetchCampaignsWithTiers,
    createCampaign,
    updateCampaign,
    deleteCampaign,
} from '../lib/campaigns'
import type { CampaignWithTiers, CampaignDraft, RepeatInterval } from '../lib/campaigns'

const EMPTY_DRAFT: CampaignDraft = {
    name: '',
    platform: 'shopee',
    repeat_interval: 'weekly',
    start_date: '',
    end_date: null,
    track_history: false,
    tiers: [],
}

const formatDate = (s: string | null): string => {
    if (!s) return 'Continuous'
    const [y, m, d] = s.split('-')
    return `${d}/${m}/${y}`
}

export default function Campaigns() {
    const { isAdmin } = useAuth()
    const navigate = useNavigate()

    const [campaigns, setCampaigns] = useState<CampaignWithTiers[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editing, setEditing] = useState<CampaignWithTiers | null>(null)
    const [draft, setDraft] = useState<CampaignDraft>(EMPTY_DRAFT)
    const [saving, setSaving] = useState(false)
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })

    const load = async () => {
        setLoading(true)
        try {
            const data = await fetchCampaignsWithTiers()
            setCampaigns(data)
        } catch {
            setSnackbar({ open: true, message: 'Failed to load campaigns', severity: 'error' })
        }
        setLoading(false)
    }

    useEffect(() => {
        if (!isAdmin) return
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin])

    // Redirect non-admin users
    if (!isAdmin) {
        navigate('/')
        return null
    }

    const openCreate = () => {
        setEditing(null)
        setDraft({ ...EMPTY_DRAFT, start_date: new Date().toISOString().slice(0, 10) })
        setDialogOpen(true)
    }

    const openEdit = (c: CampaignWithTiers) => {
        setEditing(c)
        setDraft({
            name: c.name,
            platform: c.platform,
            repeat_interval: c.repeat_interval,
            start_date: c.start_date,
            end_date: c.end_date,
            track_history: c.track_history,
            tiers: c.tiers.map((t) => ({ tier_number: t.tier_number, target_videos: t.target_videos, reward: t.reward })),
        })
        setDialogOpen(true)
    }

    const handleSave = async () => {
        if (!draft.name.trim() || !draft.start_date) {
            setSnackbar({ open: true, message: 'Name and start date are required', severity: 'error' })
            return
        }
        setSaving(true)
        try {
            if (editing) {
                await updateCampaign(editing.id, draft)
                setSnackbar({ open: true, message: 'Campaign updated', severity: 'success' })
            } else {
                await createCampaign(draft)
                setSnackbar({ open: true, message: 'Campaign created', severity: 'success' })
            }
            setDialogOpen(false)
            load()
        } catch {
            setSnackbar({ open: true, message: 'Failed to save campaign', severity: 'error' })
        }
        setSaving(false)
    }

    const handleDelete = async (c: CampaignWithTiers) => {
        if (!confirm(`Delete campaign "${c.name}"? This will also delete its tiers.`)) return
        try {
            await deleteCampaign(c.id)
            setSnackbar({ open: true, message: 'Campaign deleted', severity: 'success' })
            load()
        } catch {
            setSnackbar({ open: true, message: 'Failed to delete campaign', severity: 'error' })
        }
    }

    const today = new Date().toISOString().slice(0, 10)
    const isOngoing = (c: CampaignWithTiers) => !c.end_date || c.end_date >= today

    const setTier = (index: number, patch: Partial<CampaignDraft['tiers'][number]>) => {
        setDraft((d) => {
            const tiers = d.tiers.map((t, i) => (i === index ? { ...t, ...patch } : t))
            return { ...d, tiers }
        })
    }

    const addTier = () => {
        setDraft((d) => ({
            ...d,
            tiers: [...d.tiers, { tier_number: d.tiers.length + 1, target_videos: 0, reward: '' }],
        }))
    }

    const removeTier = (index: number) => {
        setDraft((d) => {
            const tiers = d.tiers.filter((_, i) => i !== index).map((t, i) => ({ ...t, tier_number: i + 1 }))
            return { ...d, tiers }
        })
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>Campaigns</Typography>
                    <Typography variant="body2" color="text.secondary">Manage campaign days, repeat cadence, and tier rewards.</Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Campaign</Button>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
            ) : campaigns.length === 0 ? (
                <Card><CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <CampaignIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography color="text.secondary">No campaigns yet. Click "New Campaign" to create one!</Typography>
                </CardContent></Card>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {campaigns.map((c) => (
                        <Card key={c.id}>
                            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
                                    <Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                            <Typography variant="h6" sx={{ fontWeight: 700 }}>{c.name}</Typography>
                                            <Chip
                                                size="small"
                                                label={isOngoing(c) ? 'Ongoing' : 'Ended'}
                                                sx={{ height: 20, fontSize: 11, bgcolor: isOngoing(c) ? '#e8f5e9' : '#eceff1', color: isOngoing(c) ? '#2e7d32' : '#546e7a', fontWeight: 600 }}
                                            />
                                            <Chip size="small" label={c.platform} sx={{ height: 20, fontSize: 11, bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 600 }} />
                                        </Box>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                            {c.repeat_interval.charAt(0).toUpperCase() + c.repeat_interval.slice(1)} · {formatDate(c.start_date)} – {formatDate(c.end_date)}
                                        </Typography>
                                        {c.tiers.length > 0 ? (
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
                                                {c.tiers.map((t) => (
                                                    <Chip
                                                        key={t.id}
                                                        size="small"
                                                        variant="outlined"
                                                        label={`Tier ${t.tier_number}: ${t.target_videos} videos${t.reward ? ` · ${t.reward}` : ''}`}
                                                        sx={{ fontSize: 11 }}
                                                    />
                                                ))}
                                            </Box>
                                        ) : (
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>No tiers set</Typography>
                                        )}
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Chip
                                            size="small"
                                            label={c.track_history ? 'History ON' : 'History OFF'}
                                            color={c.track_history ? 'success' : 'default'}
                                            variant="outlined"
                                            sx={{ fontSize: 11 }}
                                        />
                                        <IconButton size="small" onClick={() => openEdit(c)} title="Edit"><EditIcon /></IconButton>
                                        <IconButton size="small" color="error" onClick={() => handleDelete(c)} title="Delete"><DeleteIcon /></IconButton>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            )}

            {/* Create / Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="h6">{editing ? 'Edit Campaign' : 'New Campaign'}</Typography>
                        <IconButton onClick={() => setDialogOpen(false)} size="small"><CloseIcon /></IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <TextField
                            label="Campaign Name"
                            value={draft.name}
                            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                            fullWidth
                            size="small"
                            required
                        />
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <TextField
                                label="Platform"
                                select
                                value={draft.platform}
                                onChange={(e) => setDraft({ ...draft, platform: e.target.value })}
                                sx={{ minWidth: 180, flex: 1 }}
                                size="small"
                            >
                                {PLATFORMS.map((p) => <MenuItem key={p.key} value={p.key}>{p.label}</MenuItem>)}
                            </TextField>
                            <TextField
                                label="Repeat"
                                select
                                value={draft.repeat_interval}
                                onChange={(e) => setDraft({ ...draft, repeat_interval: e.target.value as RepeatInterval })}
                                sx={{ minWidth: 180, flex: 1 }}
                                size="small"
                            >
                                <MenuItem value="daily">Daily</MenuItem>
                                <MenuItem value="weekly">Weekly</MenuItem>
                                <MenuItem value="monthly">Monthly</MenuItem>
                            </TextField>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <TextField
                                label="Start Date"
                                type="date"
                                value={draft.start_date}
                                onChange={(e) => setDraft({ ...draft, start_date: e.target.value })}
                                sx={{ flex: 1 }}
                                size="small"
                                slotProps={{ inputLabel: { shrink: true } }}
                                required
                            />
                            <TextField
                                label="End Date (empty = continuous)"
                                type="date"
                                value={draft.end_date || ''}
                                onChange={(e) => setDraft({ ...draft, end_date: e.target.value || null })}
                                sx={{ flex: 1 }}
                                size="small"
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                        </Box>
                        <FormControlLabel
                            control={<Switch checked={draft.track_history} onChange={(e) => setDraft({ ...draft, track_history: e.target.checked })} />}
                            label="Track history (view past period performance)"
                        />
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Tiers (per period)</Typography>
                            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addTier}>Add Tier</Button>
                        </Box>
                        {draft.tiers.length === 0 ? (
                            <Typography variant="caption" color="text.secondary">No tiers — campaign will just track total uploads.</Typography>
                        ) : (
                            draft.tiers.map((t, i) => (
                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" sx={{ minWidth: 36, fontWeight: 600 }}>T{i + 1}</Typography>
                                    <TextField
                                        label="Target videos"
                                        type="number"
                                        value={t.target_videos || ''}
                                        onChange={(e) => setTier(i, { target_videos: Number(e.target.value) })}
                                        size="small"
                                        sx={{ width: 140 }}
                                    />
                                    <TextField
                                        label="Reward (e.g. RM500)"
                                        value={t.reward || ''}
                                        onChange={(e) => setTier(i, { reward: e.target.value })}
                                        size="small"
                                        sx={{ flex: 1 }}
                                    />
                                    <IconButton size="small" color="error" onClick={() => removeTier(i)}><DeleteIcon /></IconButton>
                                </Box>
                            ))
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : editing ? 'Update Campaign' : 'Create Campaign'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    )
}
