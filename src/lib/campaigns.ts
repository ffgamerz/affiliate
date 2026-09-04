import { supabase } from './supabase'

// ============ Types ============

export type RepeatInterval = 'none' | 'daily' | 'weekly' | 'monthly'

export interface Campaign {
    id: string
    name: string
    platform: string
    repeat_interval: RepeatInterval
    start_date: string // YYYY-MM-DD
    end_date: string | null // null = continuous
    track_history: boolean
    created_at: string
}

export interface CampaignTier {
    id: string
    campaign_id: string
    tier_number: number
    target_videos: number
    reward: string | null
}

export interface CampaignWithTiers extends Campaign {
    tiers: CampaignTier[]
}

// Tier progress types for displaying tier-level progress
export type TrackStatus = 'ahead' | 'on_track' | 'behind'

export interface TierProgress {
    tier: CampaignTier
    target_videos: number
    count: number
    percent: number
    expectedByNow: number
    trackStatus: TrackStatus
    daysElapsed: number
    periodDays: number
    avgPerDay: number
    remaining: number
    daysNeeded: number
    neededPerDay: number
}

export interface CampaignPeriod {
    periodNumber: number
    start: string // YYYY-MM-DD
    end: string // YYYY-MM-DD
}

export interface CampaignDraft {
    name: string
    platform: string
    repeat_interval: RepeatInterval
    start_date: string
    end_date: string | null
    track_history: boolean
    tiers: { tier_number: number; target_videos: number; reward: string | null }[]
}

export const PLATFORMS = [
    { key: 'youtube', label: 'YouTube' },
    { key: 'tiktok', label: 'TikTok' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'threads', label: 'Threads' },
    { key: 'shopee', label: 'Shopee' },
]

// ============ Date helpers (local, YYYY-MM-DD strings) ============

export const todayStr = (): string => {
    const d = new Date()
    return toDateStr(d)
}

const toDateStr = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const toDate = (s: string): Date => {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d)
}

const addDays = (d: Date, n: number): Date => {
    const r = new Date(d)
    r.setDate(r.getDate() + n)
    return r
}

const addMonths = (d: Date, n: number): Date => {
    const r = new Date(d)
    r.setMonth(r.getMonth() + n)
    return r
}

const compare = (a: string, b: string): number => a.localeCompare(b) // YYYY-MM-DD sorts lexically

// ============ Period computation ============

/**
 * Generate periods for a campaign, anchored on start_date.
 * - daily: 1 period per day
 * - weekly: period N = [start + 7*(N-1), start + 7*(N-1) + 6] days
 * - monthly: period N starts at start_date shifted N-1 calendar months, ends day before next shift (calendar based)
 * Generation stops at end_date (or at `asOfDate` for continuous campaigns so it doesn't loop forever),
 * but a period's end is ONLY clamped to end_date (partial last period for ended campaigns).
 * The current in-progress period always shows its full range (e.g. monthly shows 1st–31st, not 1st–today).
 */
export function computePeriods(campaign: Pick<Campaign, 'start_date' | 'end_date' | 'repeat_interval'>, asOfDate?: string): CampaignPeriod[] {
    const asOf = asOfDate || todayStr()
    // No repeat: one single period spanning start_date → end_date (or today if continuous).
    if (campaign.repeat_interval === 'none') {
        const endStr = campaign.end_date && compare(campaign.end_date, asOf) < 0 ? campaign.end_date : asOf
        return [{ periodNumber: 1, start: campaign.start_date, end: endStr }]
    }
    // Generation cap: don't create future periods. Ended campaigns cap at end_date; continuous/ongoing cap at asOf.
    const genCap = campaign.end_date && compare(campaign.end_date, asOf) < 0 ? campaign.end_date : asOf
    const periods: CampaignPeriod[] = []
    let cursor = toDate(campaign.start_date)
    let n = 1

    while (true) {
        const startStr = toDateStr(cursor)
        if (compare(startStr, genCap) > 0) break

        let end: Date
        if (campaign.repeat_interval === 'daily') end = cursor
        else if (campaign.repeat_interval === 'weekly') end = addDays(cursor, 6)
        else end = addDays(addMonths(cursor, 1), -1) // day before next month shift

        let endStr = toDateStr(end)
        // Only clamp to end_date (for ended campaigns). Never clamp to asOf, so an in-progress
        // period keeps its full boundary (monthly period ends on the last day of the month).
        if (campaign.end_date && compare(endStr, campaign.end_date) > 0) endStr = campaign.end_date
        periods.push({ periodNumber: n, start: startStr, end: endStr })

        if (campaign.repeat_interval === 'daily') cursor = addDays(cursor, 1)
        else if (campaign.repeat_interval === 'weekly') cursor = addDays(cursor, 7)
        else cursor = addMonths(cursor, 1)
        n++
    }
    return periods
}

/** Period currently active for the campaign, or null if the campaign hasn't started / already ended. */
export function computeCurrentPeriod(campaign: Pick<Campaign, 'start_date' | 'end_date' | 'repeat_interval'>, today?: string): CampaignPeriod | null {
    const t = today || todayStr()
    if (compare(t, campaign.start_date) < 0) return null
    if (campaign.end_date && compare(t, campaign.end_date) > 0) return null
    const periods = computePeriods(campaign, t)
    return periods.find((p) => compare(p.start, t) <= 0 && compare(p.end, t) >= 0) || null
}

/** Human label for a period, e.g. "Week 3", "Day 12", "Month 2". No-repeat campaigns: "Period 1". */
export function periodLabel(repeat: RepeatInterval, periodNumber: number): string {
    const prefix = repeat === 'weekly' ? 'Week' : repeat === 'monthly' ? 'Month' : repeat === 'daily' ? 'Day' : 'Period'
    return `${prefix} ${periodNumber}`
}

/** Human label for a repeat interval, e.g. "Weekly", "No repeat". */
export function repeatLabel(repeat: RepeatInterval): string {
    if (repeat === 'none') return 'No repeat'
    return repeat.charAt(0).toUpperCase() + repeat.slice(1)
}

// ============ Upload counting ============

/**
 * Count uploads for a platform within a date range:
 * original uploads (videos.{platform}_upload_date) + reuploads (reuploads where platform matches).
 */
export async function computeUploadCount(platform: string, from: string, to: string): Promise<number> {
    const origQuery = supabase
        .from('videos')
        .select('id', { count: 'exact', head: true })
        .gte(`${platform}_upload_date`, from)
        .lte(`${platform}_upload_date`, to)

    const reupQuery = supabase
        .from('reuploads')
        .select('id', { count: 'exact', head: true })
        .eq('platform', platform)
        .gte('upload_date', from)
        .lte('upload_date', to)

    const [orig, reup] = await Promise.all([origQuery, reupQuery])
    return (orig.count || 0) + (reup.count || 0)
}

/** Highest tier whose target_videos <= count, or null if no tier achieved. */
export function resolveTier(count: number, tiers: CampaignTier[]): CampaignTier | null {
    const sorted = [...tiers].sort((a, b) => a.target_videos - b.target_videos)
    let achieved: CampaignTier | null = null
    for (const t of sorted) {
        if (count >= t.target_videos) achieved = t
    }
    return achieved
}

/** Highest tier target (the "goal" for progress bars), or 1 if no tiers defined. */
export function maxTierTarget(tiers: CampaignTier[]): number {
    if (tiers.length === 0) return 1
    return Math.max(...tiers.map((t) => t.target_videos))
}

/**
 * Compute tier progress for each tier in a campaign.
 * Returns an array of TierProgress objects for rendering tier-based progress bars.
 * Uses the campaign's current period to calculate progress expectations.
 * 
 * @param campaign The campaign with its tiers
 * @param count Current video count
 * @param period The current active period (Optional - if not provided, uses full campaign dates)
 */
export function computeTierProgresses(
    campaign: CampaignWithTiers,
    count: number,
    period?: CampaignPeriod
): TierProgress[] {
    let tiers = [...campaign.tiers].sort((a, b) => a.target_videos - b.target_videos)

    // If no tiers, create a default T1 tier
    if (tiers.length === 0) {
        tiers = [{
            id: `default-${campaign.id}`,
            campaign_id: campaign.id,
            tier_number: 1,
            target_videos: 100,
            reward: null
        }]
    }

    const today = toDate(todayStr())

    // Use provided period or compute from campaign dates
    let periodStart: string
    let periodEnd: string
    let daysElapsed: number
    let totalDays: number

    if (period) {
        periodStart = period.start
        periodEnd = period.end
        const startDt = toDate(periodStart)
        const endDt = toDate(periodEnd)
        totalDays = Math.max(1, Math.round((endDt.getTime() - startDt.getTime()) / 86400000) + 1)
        daysElapsed = Math.min(totalDays, Math.max(1, Math.round((today.getTime() - startDt.getTime()) / 86400000) + 1))
    } else {
        const startDt = campaign.start_date ? toDate(campaign.start_date) : today
        const endDt = campaign.end_date ? toDate(campaign.end_date) : today
        periodStart = campaign.start_date || todayStr()
        periodEnd = campaign.end_date || todayStr()
        totalDays = Math.max(1, Math.round((endDt.getTime() - startDt.getTime()) / 86400000) + 1)
        daysElapsed = Math.min(totalDays, Math.max(1, Math.round((today.getTime() - startDt.getTime()) / 86400000) + 1))
    }

    return tiers.map((tier) => {
        const target = tier.target_videos
        const percent = Math.min((count / target) * 100, 100)
        const expectedByNow = Math.floor(target * (daysElapsed / totalDays))
        // Status logic:
        // - ahead: count > expectedByNow (surplus, exceeding expected for today)
        // - on_track: count === expectedByNow (exactly on target for today)
        // - behind: count < expectedByNow (falling behind today)
        const trackStatus: TrackStatus = count > expectedByNow ? 'ahead' : count === expectedByNow ? 'on_track' : 'behind'
        const remaining = Math.max(0, target - count)
        const avgPerDay = count > 0 ? Math.ceil(count / daysElapsed) : 0
        const daysNeeded = avgPerDay > 0 ? Math.ceil(remaining / avgPerDay) : Math.max(0, totalDays - daysElapsed)
        const daysLeft = Math.max(1, totalDays - daysElapsed + 1)
        const neededPerDay = remaining > 0 ? Math.ceil(remaining / daysLeft) : 0

        return {
            tier,
            target_videos: target,
            count,
            percent,
            expectedByNow,
            trackStatus,
            daysElapsed,
            periodDays: totalDays,
            avgPerDay,
            remaining,
            daysNeeded,
            neededPerDay
        } as TierProgress
    })
}

// ============ CRUD ============

export async function fetchCampaignsWithTiers(): Promise<CampaignWithTiers[]> {
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })
    if (error) throw error

    const { data: tierRows } = await supabase.from('campaign_tiers').select('*')
    const byCampaign = new Map<string, CampaignTier[]>()
    for (const t of tierRows || []) {
        const arr = byCampaign.get(t.campaign_id) || []
        arr.push(t)
        byCampaign.set(t.campaign_id, arr)
    }

    return (campaigns || []).map((c) => ({
        ...c,
        tiers: (byCampaign.get(c.id) || []).sort((a, b) => a.tier_number - b.tier_number),
    }))
}

export async function createCampaign(draft: CampaignDraft): Promise<CampaignWithTiers> {
    const { data: campaign, error } = await supabase
        .from('campaigns')
        .insert({
            name: draft.name,
            platform: draft.platform,
            repeat_interval: draft.repeat_interval,
            start_date: draft.start_date,
            end_date: draft.end_date || null,
            track_history: draft.track_history,
        })
        .select()
        .single()
    if (error || !campaign) throw error || new Error('Failed to create campaign')

    const tiers = await insertTiers(campaign.id, draft.tiers)
    return { ...campaign, tiers }
}

export async function updateCampaign(id: string, draft: CampaignDraft): Promise<CampaignWithTiers> {
    const { data: campaign, error } = await supabase
        .from('campaigns')
        .update({
            name: draft.name,
            platform: draft.platform,
            repeat_interval: draft.repeat_interval,
            start_date: draft.start_date,
            end_date: draft.end_date || null,
            track_history: draft.track_history,
        })
        .eq('id', id)
        .select()
        .single()
    if (error || !campaign) throw error || new Error('Failed to update campaign')

    // Replace all tiers (delete + re-insert for simplicity)
    await supabase.from('campaign_tiers').delete().eq('campaign_id', id)
    const tiers = await insertTiers(id, draft.tiers)
    return { ...campaign, tiers }
}

export async function deleteCampaign(id: string): Promise<void> {
    const { error } = await supabase.from('campaigns').delete().eq('id', id)
    if (error) throw error
}

async function insertTiers(campaignId: string, tiers: CampaignDraft['tiers']): Promise<CampaignTier[]> {
    if (tiers.length === 0) return []
    const rows = tiers
        .filter((t) => t.target_videos > 0)
        .map((t) => ({
            campaign_id: campaignId,
            tier_number: t.tier_number,
            target_videos: t.target_videos,
            reward: t.reward || null,
        }))
    if (rows.length === 0) return []
    const { data, error } = await supabase.from('campaign_tiers').insert(rows).select()
    if (error) throw error
    return (data || []).sort((a, b) => a.tier_number - b.tier_number)
}