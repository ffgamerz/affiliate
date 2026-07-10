import { Chip } from '@mui/material'
import { YouTube, Facebook, Instagram, Videocam } from '@mui/icons-material'

interface PlatformBadgeProps {
  platform: string
  status?: string
}

const platformConfig: Record<string, { label: string; icon: React.ReactElement }> = {
  youtube: { label: 'YouTube', icon: <YouTube /> },
  tiktok: { label: 'TikTok', icon: <Videocam /> },
  shopee: { label: 'Shopee', icon: <Videocam /> },
  facebook: { label: 'Facebook', icon: <Facebook /> },
  instagram: { label: 'Instagram', icon: <Instagram /> },
  threads: { label: 'Threads', icon: <Videocam /> },
}

export default function PlatformBadge({ platform, status }: PlatformBadgeProps) {
  const config = platformConfig[platform] || { label: platform, icon: <Videocam /> }
  
  return (
    <Chip
      icon={config.icon}
      label={config.label}
      color={status === 'published' ? 'primary' : 'default'}
      size="small"
      variant={status === 'published' ? 'filled' : 'outlined'}
    />
  )
}