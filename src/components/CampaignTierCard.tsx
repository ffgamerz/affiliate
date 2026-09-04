import type { ReactNode } from 'react'
import { Box, Button, Card, CardContent, Typography } from '@mui/material'
import { CalendarMonth as CalendarMonthIcon, History as HistoryIcon, Schedule as ScheduleIcon } from '@mui/icons-material'
import type { CampaignPeriod, CampaignTier, CampaignWithTiers, TierProgress } from '../lib/campaigns'
import { periodLabel, repeatLabel, todayStr } from '../lib/campaigns'

export interface CampaignCardItem {
  campaign: CampaignWithTiers
  count: number
  period: CampaignPeriod | null
  achievedTier: CampaignTier | null
  tierProgresses: TierProgress[]
  platformIcon?: ReactNode
  platformColor?: string
}

// For tier-specific display: shows count for specific tier
export interface TierCardItem {
  campaign: CampaignWithTiers
  tier: CampaignTier
  count: number
  period: CampaignPeriod | null
  tierProgresses: TierProgress[]
  platformIcon?: ReactNode
  platformColor?: string
  onOpenHistory?: (campaign: CampaignWithTiers) => void
}

export interface CampaignTierCardProps extends CampaignCardItem {
  onOpenHistory?: () => void
}

export interface CampaignTierGridProps {
  items: CampaignCardItem[]
  onOpenHistory?: (campaign: CampaignWithTiers) => void
  children?: ReactNode
}

const fmtDate = (s?: string | null): string => {
  if (!s) return 'Continuous'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

const dayDiff = (a: string, b: string): number =>
  Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000) + 1

const getProgressColor = (count: number, max: number): string => {
  const pct = max > 0 ? count / max : 0
  if (pct >= 1) return '#4caf50'
  if (pct >= 0.66) return '#66bb6a'
  if (pct >= 0.33) return '#ff9800'
  return '#ef5350'
}

const statusMeta = (tp: TierProgress) => {
  const reached = tp.count >= tp.target_videos
  if (reached) return { label: 'Tier reached', color: '#2e7d32', bg: '#e8f5e9' }
  switch (tp.trackStatus) {
    case 'ahead':
      return { label: 'Ahead', color: '#2e7d32', bg: '#e8f5e9' }
    case 'on_track':
      return { label: 'On Track', color: '#e65100', bg: '#fff3e0' }
    default:
      return { label: 'Behind', color: '#c62828', bg: '#fce4ec' }
  }
}

export function CampaignTierCard({
  campaign, count, period, achievedTier, tierProgresses, platformIcon, platformColor, onOpenHistory,
}: CampaignTierCardProps) {
  const maxTarget = campaign.tiers.length > 0 ? Math.max(...campaign.tiers.map((t) => t.target_videos)) : 1
  const platformLabel = campaign.platform.charAt(0).toUpperCase() + campaign.platform.slice(1)

  const periodDays = period ? Math.max(1, dayDiff(period.end, period.start)) : 0
  const dayIndex = period ? Math.min(periodDays, Math.max(1, dayDiff(todayStr(), period.start))) : 0
  const expectedNow = period ? Math.floor(maxTarget * (dayIndex / periodDays)) : 0
  const onTrack = period ? count >= expectedNow : false

  const overall = achievedTier
    ? { label: `✓ Tier ${achievedTier.tier_number} reached`, color: '#2e7d32', bg: '#e8f5e9' }
    : onTrack
      ? { label: 'On Track', color: '#2e7d32', bg: '#e8f5e9' }
      : { label: 'Behind', color: '#e65100', bg: '#fff3e0' }

  const freqLetter = campaign.repeat_interval === 'weekly' ? 'W' : campaign.repeat_interval === 'monthly' ? 'M' : campaign.repeat_interval === 'daily' ? 'D' : 'N'

  return (
    <Card sx={{
      height: '100%', bgcolor: 'background.paper', borderRadius: 2.5,
      border: '1px solid #f0f0f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    }}>
      <CardContent sx={{ p: 2.5 }}>
        {/* Frequency pill + overall status badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25, gap: 1 }}>
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.25,
            bgcolor: '#f3e5f5', borderRadius: 10, fontSize: 11, fontWeight: 600, color: '#7c4dff', minWidth: 0,
          }}>
            <Box sx={{ bgcolor: '#7c4dff', color: 'white', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0 }}>
              {freqLetter}
            </Box>
            <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {period ? periodLabel(campaign.repeat_interval, period.periodNumber) : 'Not started'}
              <Typography component="span" sx={{ color: '#999', fontWeight: 400 }}> | </Typography>
              {repeatLabel(campaign.repeat_interval)}
            </Box>
          </Box>
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', px: 1, py: 0.25, borderRadius: 10,
            fontSize: 11, fontWeight: 700, bgcolor: overall.bg, color: overall.color, flexShrink: 0, whiteSpace: 'nowrap',
          }}>
            {overall.label}
          </Box>
        </Box>
        {/* Platform icon + campaign title */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            <Box sx={{ color: platformColor || '#666', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {platformIcon}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                {campaign.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
                {platformLabel} Videos
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Date range */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
          <CalendarMonthIcon sx={{ fontSize: 15, color: '#7c4dff', flexShrink: 0 }} />
          <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {period ? `${fmtDate(period.start)} – ${fmtDate(period.end)}` : `Starts ${fmtDate(campaign.start_date)}`}
          </Typography>
        </Box>

        {/* Current metrics */}
        <Box sx={{ bgcolor: '#f9f9f9', borderRadius: 2, p: 1.5, mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Current uploads this period
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16 }}>
              <Typography component="span" sx={{ color: 'text.primary' }}>{count}</Typography>
              <Typography component="span" sx={{ color: '#999', fontWeight: 400 }}> / </Typography>
              <Typography component="span" sx={{ color: '#7c4dff' }}>{maxTarget}</Typography>
            </Typography>
          </Box>
          <Box sx={{ width: '100%', height: 8, bgcolor: '#e0e0e0', borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ width: `${Math.min((count / maxTarget) * 100, 100)}%`, height: '100%', bgcolor: getProgressColor(count, maxTarget), transition: 'width 0.5s ease' }} />
          </Box>
          {/* Tier breakdown - show count for each tier */}
          {campaign.tiers.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
              {campaign.tiers.map((t) => {
                const tierProgress = tierProgresses.find(tp => tp.tier.id === t.id)
                const tierCount = tierProgress?.count || 0
                return (
                  <Box key={t.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.25, fontSize: 10, color: '#666' }}>
                    <Box sx={{ bgcolor: getProgressColor(tierCount, t.target_videos), color: 'white', px: 0.5, py: 0.1, borderRadius: 0.5, fontWeight: 600, fontSize: 10 }}>
                      T{t.tier_number}: {tierCount}
                    </Box>
                  </Box>
                )
              })}
            </Box>
          )}
        </Box>
        {/* Tier progress bars */}
        {tierProgresses.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {tierProgresses.map((tp) => {
              const meta = statusMeta(tp)
              const surplus = tp.count - tp.expectedByNow
              const expectedPercent = Math.min(100, Math.max(0, (tp.expectedByNow / tp.target_videos) * 100))
              return (
                <Box key={tp.tier.id}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 700, color: 'text.primary' }}>
                      T{tp.tier.tier_number} — {tp.target_videos} videos{tp.tier.reward ? ` · ${tp.tier.reward}` : ''}
                    </Typography>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 0.75, py: 0.15, borderRadius: 8, fontSize: 10, fontWeight: 700, bgcolor: meta.bg, color: meta.color, whiteSpace: 'nowrap' }}>
                      {meta.label}
                    </Box>
                  </Box>
                  <Box sx={{ position: 'relative', width: '100%', height: 6, bgcolor: '#e0e0e0', borderRadius: 1, overflow: 'hidden', mb: 0.5 }}>
                    <Box sx={{ width: `${tp.percent}%`, height: '100%', bgcolor: getProgressColor(tp.count, tp.target_videos), transition: 'width 0.5s ease' }} />
                    {/* Expected-by-now indicator (target day position) */}
                    <Box
                      title={`Expected by now: ${tp.expectedByNow} videos`}
                      sx={{
                        position: 'absolute', top: 0, left: `${expectedPercent}%`, width: 2, height: '100%',
                        bgcolor: '#3f3f46', transform: 'translateX(-50%)', boxShadow: '0 0 2px rgba(0,0,0,0.3)',
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
                      {meta.label === 'Tier reached'
                        ? `Target reached 🎉 · ${tp.neededPerDay}/day needed`
                        : meta.label === 'Ahead'
                          ? `${tp.remaining} remaining · +${surplus} surplus · ${tp.neededPerDay}/day needed`
                          : `Need ${tp.expectedByNow - tp.count} more to be on track · ${tp.neededPerDay}/day needed`}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
                      <ScheduleIcon sx={{ fontSize: 12 }} />
                      {tp.daysNeeded === 0 ? 'Done' : `~${tp.daysNeeded} days left`}
                    </Typography>
                  </Box>
                </Box>
              )
            })}
          </Box>
        )}

        {/* Footer: tier thresholds + History */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, pt: 1.5, borderTop: '1px solid #f0f0f0' }}>
          <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: '#7c4dff' }}>
            {campaign.tiers.length > 0
              ? campaign.tiers.map((t) => `T${t.tier_number}: ${t.target_videos}${t.reward ? ` (${t.reward})` : ''}`).join(' · ')
              : 'No tiers set'}
          </Typography>
          {campaign.track_history && onOpenHistory && (
            <Button size="small" variant="text" startIcon={<HistoryIcon />} onClick={onOpenHistory} sx={{ color: '#1976d2', fontWeight: 600, fontSize: 12 }}>
              History
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
export function CampaignTierGrid({ items, onOpenHistory, children }: CampaignTierGridProps) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
      {items.map((item) => (
        <CampaignTierCard
          key={item.campaign.id}
          {...item}
          onOpenHistory={onOpenHistory ? () => onOpenHistory(item.campaign) : undefined}
        />
      ))}
      {children}
    </Box>
  )
}