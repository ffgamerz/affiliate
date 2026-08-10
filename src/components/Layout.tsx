import { useState, useEffect } from 'react'
import { Outlet, Link as RouterLink, useNavigate, useLocation } from 'react-router-dom'
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  useTheme,
  useMediaQuery,
  Divider,
  Avatar,
  Badge,
  Collapse,
  Chip,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  VideoLibrary as VideoIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  Search as SearchIcon,
  Shuffle as ShuffleIcon,
  CalendarViewMonth as CalendarViewIcon,
  Replay as ReplayIcon,
  Facebook,
  Campaign as CampaignIcon,
  YouTube,
  MusicNote as TikTokIcon,
  Instagram,
  Shop,
  Forum as ThreadsIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material'
import { useAuth } from '../hooks/useAuth.tsx'
import { supabase } from '../lib/supabase'

const DRAWER_WIDTH = 260

// Premium gradient for active items
const gradientActiveBg = 'linear-gradient(135deg, #6D4CFF 0%, #9B5CF8 100%)'

const platforms = ['youtube', 'tiktok', 'facebook', 'instagram', 'threads', 'shopee']

const platformConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  youtube: { label: 'YouTube', color: '#FF0000', icon: <YouTube /> },
  tiktok: { label: 'TikTok', color: '#000000', icon: <TikTokIcon /> },
  facebook: { label: 'Facebook', color: '#1877F2', icon: <Facebook /> },
  instagram: { label: 'Instagram', color: '#E4405F', icon: <Instagram /> },
  shopee: { label: 'Shopee', color: '#EE4D2D', icon: <Shop /> },
  threads: { label: 'Threads', color: '#000000', icon: <ThreadsIcon /> },
}

export default function Layout() {
  const { signOut, isAdmin, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unsyncedCount, setUnsyncedCount] = useState(0)
  const [platformCounts, setPlatformCounts] = useState<Record<string, number>>({})
  const [expandedDashboard, setExpandedDashboard] = useState(true)

  useEffect(() => {
    const fetchUnsyncedCount = async () => {
      const { data: videosData } = await supabase
        .from('videos')
        .select('id, youtube_url, facebook_url, instagram_url, shopee_url, threads_url, tiktok_url')

      if (!videosData) {
        setUnsyncedCount(0)
        return
      }

      const count = videosData.filter(video => 
        !platforms.some(platform => video[`${platform}_url` as keyof typeof video] as string)
      ).length

      setUnsyncedCount(count)

      // Count unsynced per platform
      const counts: Record<string, number> = {}
      platforms.forEach(platform => {
        counts[platform] = videosData.filter(video => 
          !(video[`${platform}_url` as keyof typeof video] as string)
        ).length
      })
      setPlatformCounts(counts)
    }

    fetchUnsyncedCount()
  }, [])

  // Reuploads nav item hidden on mobile
  const fullNavItems: Array<{ path: string; label: string; icon: React.ReactNode; hideOnMobile?: boolean; badge?: number }> = [
    { path: '/videos', label: 'Videos', icon: <VideoIcon /> },
    { path: '/bolreview-upload', label: 'BolReview', icon: <Facebook /> },
    { path: '/reuploads', label: 'Reuploads', icon: <ReplayIcon />, hideOnMobile: true },
    { path: '/random', label: 'Random', icon: <ShuffleIcon /> },
    { path: '/upload-calendar', label: 'Upload Calendar', icon: <CalendarViewIcon /> },
    ...(isAdmin ? [{ path: '/campaigns', label: 'Campaigns', icon: <CampaignIcon /> }, { path: '/settings', label: 'Settings', icon: <SettingsIcon /> }] : []),
  ]
  const navItems = fullNavItems

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }


  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Premium Header with Logo */}
      <Box sx={{ p: 2.5, textAlign: 'center', background: 'linear-gradient(135deg, #6D4CFF 0%, #9B5CF8 100%)', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
          <Box sx={{ 
            width: 32, 
            height: 32, 
            borderRadius: '50%', 
            bgcolor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <DashboardIcon sx={{ fontSize: 18 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            BOL Affiliate
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ opacity: 0.9, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          Video Tracker
        </Typography>
      </Box>
      <Divider />
      
      {/* Navigation List */}
      <List sx={{ flex: 1, px: 1.5, pt: 1 }}>
        {/* Dashboard Expand Item */}
        <ListItem disablePadding sx={{ mb: 0.5, position: 'relative' }}>
          <ListItemButton
            component={RouterLink}
            to="/"
            selected={location.pathname === '/'}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (location.pathname === '/') {
                setExpandedDashboard(!expandedDashboard)
              } else {
                navigate('/')
                setExpandedDashboard(true)
              }
            }}
            sx={{
              borderRadius: 2,
              px: 2,
              py: 1,
              mx: 1,
              position: 'relative',
              overflow: 'hidden',
              ...(location.pathname === '/' ? {
                background: gradientActiveBg,
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a38e6 0%, #8a4de8 100%)',
                  boxShadow: '0 4px 20px rgba(109, 76, 255, 0.3)'
                },
                '& .MuiListItemIcon-root': { color: 'white' },
                '& .MuiTypography-root': { color: 'white' }
              } : {
                '&:hover': {
                  backgroundColor: 'action.hover',
                  '& .MuiListItemIcon-root': { color: 'primary.main' }
                }
              })
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <DashboardIcon />
              {unsyncedCount > 0 && (
                <Badge
                  color="error"
                  badgeContent={unsyncedCount}
                  sx={{
                    position: 'absolute',
                    right: -8,
                    top: -8,
                    '& .MuiBadge-badge': {
                      fontSize: 10,
                      minWidth: 18,
                      height: 18,
                      padding: '2px 4px'
                    }
                  }}
                />
              )}
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography
                  variant="body1"
                  sx={{
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontWeight: location.pathname === '/' ? 600 : 500
                  }}
                >
                  Dashboard
                </Typography>
              }
            />
            {expandedDashboard ? (
              <ExpandLessIcon sx={{ ml: 'auto', mr: 0.5, fontSize: 18 }} />
            ) : (
              <ExpandMoreIcon sx={{ ml: 'auto', mr: 0.5, fontSize: 18 }} />
            )}
          </ListItemButton>

          {/* Platform Submenu */}
          <Collapse in={expandedDashboard} timeout="auto" unmountOnExit>
            <Box
              sx={{
                ml: 1,
                pl: 1.5,
                borderLeft: '2px solid',
                borderColor: 'divider',
                mt: 0.5
              }}
            >
              {platforms.map((platform) => {
                const config = platformConfig[platform]
                const count = platformCounts[platform] || 0
                return (
                  <ListItem key={platform} disablePadding sx={{ py: 0.5 }}>
                    <ListItemButton
                      onClick={() => {
                        navigate('/videos', { state: { filterEmptyPlatform: platform } })
                        if (isMobile) setMobileOpen(false)
                      }}
                      sx={{
                        borderRadius: 2,
                        mx: 1,
                        py: 0.75,
                        '&:hover': { backgroundColor: 'action.hover' },
                        '& .MuiListItemIcon-root': { color: config.color }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {config.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                            }}
                          >
                            {config.label}
                          </Typography>
                        }
                      />
                      {count > 0 && (
                        <Chip
                          label={count}
                          size="small"
                          sx={{
                            bgcolor: config.color,
                            color: 'white',
                            fontWeight: 600,
                            height: 20,
                            fontSize: 10,
                            ml: 'auto'
                          }}
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                )
              })}
            </Box>
          </Collapse>
        </ListItem>

        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5, position: 'relative' }}>
              <ListItemButton
                component={RouterLink}
                to={item.path}
                selected={isActive}
                onClick={() => isMobile && setMobileOpen(false)}
                sx={{
                  borderRadius: 3,
                  px: 2,
                  py: 1,
                  mx: 1,
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': isActive ? {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: -40,
                    width: '200%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                    transform: 'translateX(20px)',
                    animation: isActive ? 'shimmer 1.5s infinite' : 'none'
                  } : {},
                  '@keyframes shimmer': {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' }
                  },
                  ...(isActive ? {
                    background: gradientActiveBg,
                    color: 'white',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a38e6 0%, #8a4de8 100%)',
                      boxShadow: '0 4px 20px rgba(109, 76, 255, 0.3)'
                    },
                    '& .MuiListItemIcon-root': { color: 'white' },
                    '& .MuiTypography-root': { color: 'white' }
                  } : {
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      '& .MuiListItemIcon-root': { color: 'primary.main' }
                    }
                  })
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {item.icon}
                  {item.badge && (
                    <Badge 
                      color="error" 
                      badgeContent={item.badge} 
                      sx={{ 
                        position: 'absolute', 
                        right: 16,
                        '& .MuiBadge-badge': {
                          fontSize: 11,
                          minWidth: 18,
                          height: 18
                        }
                      }}
                    />
                  )}
                </ListItemIcon>
                <ListItemText 
                  primary={
                    <Typography 
                      variant="body1"
                      sx={{ 
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        fontWeight: isActive ? 600 : 500
                      }}
                    >
                      {item.label}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
      
      <Divider />
      
      {/* Premium User Profile Card */}
      <Box sx={{ px: 2, py: 2, pb: 1.5 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5, 
          p: 1.5,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }
        }}>
          <Avatar 
            src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/initialism/svg?seed=${user?.email || 'user'}`}
            sx={{ width: 40, height: 40, border: '2px solid', borderColor: 'primary.main' }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }} noWrap>
              {user?.user_metadata?.full_name || user?.email || 'User'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              {user?.email}
            </Typography>
          </Box>
        </Box>
      </Box>
      
      <Divider />
      <List sx={{ px: 2, py: 1 }}>
        <ListItem disablePadding>
          <ListItemButton 
            onClick={handleSignOut} 
            sx={{ 
              borderRadius: 3,
              mx: 1,
              '&:hover': {
                backgroundColor: 'action.hover',
                '& .MuiListItemIcon-root': { color: 'error.main' },
                '& .MuiTypography-root': { color: 'error.main' }
              },
              '& .MuiListItemIcon-root': { color: 'text.secondary' }
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText 
              primary={
                <Typography 
                  variant="body1"
                  sx={{ 
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    color: 'text.secondary'
                  }}
                >
                  Logout
                </Typography>
              }
            />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRight: '1px solid',
              borderColor: 'divider',
              transition: 'background-color 0.3s ease',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Mobile Drawer (temporary) */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Top Bar */}
        <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          <Toolbar>
            {isMobile && (
              <IconButton
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 1 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              {navItems.find((item) => item.path === location.pathname)?.label || 'BOL Affiliate Video'}
            </Typography>
            <IconButton
              color="inherit"
              sx={{ mr: 1, '&:hover': { backgroundColor: 'action.hover' } }}
              onClick={() => {
                navigate('/videos', { state: { focusSearch: true } })
              }}
            >
              <SearchIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Container sx={{ flex: 1, py: { xs: 2, md: 3 }, px: { xs: 2, md: 3 } }}>
          <Outlet />
        </Container>

        {/* Bottom Spacer for Mobile Nav */}
        {isMobile && <Box sx={{ height: 56 }} />}
      </Box>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: theme.zIndex.appBar,
            overflowX: 'auto',
            overflowY: 'hidden',
            // Hide horizontal scrollbar but keep usability
            '& ::-webkit-scrollbar': { display: 'none' },
            '-ms-overflow-style': 'none',
            scrollbarWidth: 'none',
          }}
          elevation={3}
        >
          <BottomNavigation
            value={navItems.findIndex(item => item.path === location.pathname)}
            onChange={(_event, newValue) => {
              const mobileNavItems = fullNavItems.filter(item => !item.hideOnMobile)
              navigate(mobileNavItems[newValue].path)
            }}
            showLabels
            sx={{ minWidth: '100%', justifyContent: 'flex-start' }}
          >
            {fullNavItems.filter(item => !item.hideOnMobile).map((item) => (
              <BottomNavigationAction
                key={item.path}
                label={item.label}
                icon={item.icon}
                sx={{ minWidth: 80, px: 0.75 }}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}    
    </Box>
  )
}