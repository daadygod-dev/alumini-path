import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AdminPanelSettingsRounded,
  AnalyticsRounded,
  ChevronLeftRounded,
  ChevronRightRounded,
  DarkModeRounded,
  DashboardRounded,
  DoneAllRounded,
  EventRounded,
  ForumRounded,
  HandshakeRounded,
  HistoryEduRounded,
  LightModeRounded,
  LogoutRounded,
  MenuRounded,
  NotificationsNoneRounded,
  PeopleAltRounded,
  PersonRounded,
  WorkOutlineRounded,
} from '@mui/icons-material';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Logo from '../assets/alumini-path-logo.webp';
import { apiRequest } from '../api/client.js';
import { ProtectedAvatar } from '../components/ProtectedAsset.jsx';
import {
  canManageUsers,
  canViewAnalytics,
  canViewEducationHistory,
  getRoleLabel,
} from '../data/platformConfig.js';
import '../styles/app-layout.scss';

const expandedDrawerWidth = 256;
const collapsedDrawerWidth = 76;

function getNavItems(user) {
  const baseItems = [
    { label: 'Overview', icon: <DashboardRounded />, to: '/dashboard' },
    { label: 'My Profile', icon: <PersonRounded />, to: '/profile' },
    { label: 'Community', icon: <PeopleAltRounded />, to: '/alumni' },
    { label: 'Feed', icon: <ForumRounded />, to: '/feed' },
    { label: 'Opportunities', icon: <WorkOutlineRounded />, to: '/jobs' },
    { label: 'Mentorship', icon: <HandshakeRounded />, to: '/mentorship' },
    { label: 'Events', icon: <EventRounded />, to: '/events' },
  ];

  if (canViewEducationHistory(user)) {
    baseItems.splice(2, 0, { label: 'History', icon: <HistoryEduRounded />, to: '/education-history' });
  }

  if (canViewAnalytics(user)) {
    baseItems.push({ label: 'Analytics', icon: <AnalyticsRounded />, to: '/analytics' });
  }

  if (canManageUsers(user)) {
    baseItems.push({ label: 'Administration', icon: <AdminPanelSettingsRounded />, to: '/admin' });
  }

  return baseItems;
}

const routeTitles = {
  '/dashboard': 'Overview',
  '/profile': 'My Profile',
  '/education-history': 'Education & Experience',
  '/alumni': 'Community Directory',
  '/feed': 'Community Feed',
  '/jobs': 'Opportunity Board',
  '/mentorship': 'Mentorship Hub',
  '/events': 'Events & Gatherings',
  '/analytics': 'Analytics',
  '/admin': 'Administration & Audit',
};

function DrawerContent({
  closeDrawer,
  currentUser,
  currentProfile,
  onSignOut,
  collapsed,
  onToggleCollapse,
  showCollapseControl,
}) {
  const activeRole = currentProfile?.role || currentUser.role;
  const navItems = useMemo(() => getNavItems(currentUser), [currentUser]);

  return (
    <Box className={`app-shell__drawer${collapsed ? ' is-collapsed' : ''}`}>
      <Box className="app-shell__brand">
        <Box className="app-shell__brand-left">
          <Avatar src={Logo} variant="rounded" className="app-shell__brand-mark" />
          {!collapsed && (
            <Box>
              <Typography className="app-shell__brand-name">Alumini-Path</Typography>
              <Typography className="app-shell__brand-sub">Alumni Network</Typography>
            </Box>
          )}
        </Box>

        {showCollapseControl && (
          <IconButton
            onClick={onToggleCollapse}
            size="small"
            className="app-shell__collapse-toggle"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRightRounded fontSize="small" /> : <ChevronLeftRounded fontSize="small" />}
          </IconButton>
        )}
      </Box>

      <Box className="app-shell__nav-section">
        {!collapsed && <span className="app-shell__nav-label">Navigation</span>}
        <List className="app-shell__nav-list">
          {navItems.map((item) => {
            const button = (
              <ListItemButton
                key={item.to}
                component={NavLink}
                to={item.to}
                onClick={closeDrawer}
                className={({ isActive }) => `app-shell__nav-item${isActive ? ' is-active' : ''}`}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                {!collapsed && <ListItemText primary={item.label} />}
              </ListItemButton>
            );

            return collapsed ? (
              <Tooltip key={item.to} title={item.label} placement="right" arrow>
                {button}
              </Tooltip>
            ) : (
              button
            );
          })}
        </List>
      </Box>

      <Box className="app-shell__drawer-footer">
        <Box className="app-shell__user-row">
          <ProtectedAvatar src={currentProfile?.avatarUrl} className="app-shell__user-avatar">
            {currentUser.fullName?.slice(0, 1)}
          </ProtectedAvatar>
          {!collapsed && (
            <Box className="app-shell__user-meta">
              <Typography className="app-shell__user-name">{currentUser.fullName}</Typography>
              <Typography className="app-shell__user-role">{getRoleLabel(activeRole)}</Typography>
            </Box>
          )}
        </Box>

        <Tooltip title={collapsed ? 'Sign out' : ''} placement="right" arrow>
          <ListItemButton className="app-shell__nav-item app-shell__logout-btn" onClick={onSignOut}>
            <ListItemIcon>
              <LogoutRounded />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Sign out" />}
          </ListItemButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

export default function AppLayout({ mode, toggleTheme, currentUser, currentProfile, onSignOut }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const activeRole = currentProfile?.role || currentUser.role;
  const pageTitle = routeTitles[location.pathname] || 'Workspace';

  const refreshNotifications = useCallback(async () => {
    try {
      const data = await apiRequest('notifications');
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
      setUnreadCount(Number(data?.unread || 0));
    } catch {
      // Ignore silent background notification errors.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiRequest('notifications')
      .then((data) => {
        if (cancelled) return;
        setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
        setUnreadCount(Number(data?.unread || 0));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const handleOpenNotifications = (event) => {
    setNotifAnchor(event.currentTarget);
    refreshNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('notifications-read', { method: 'POST' });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || 'read' })));
    } catch {
      // Keep UI responsive.
    }
  };

  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);
  const closeDrawer = () => setMobileOpen(false);
  const toggleCollapse = () => setCollapsed((prev) => !prev);

  return (
    <Box className="app-shell">
      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        className="app-shell__topbar"
        sx={{
          width: { md: `calc(100% - ${collapsed ? collapsedDrawerWidth : expandedDrawerWidth}px)` },
          ml: { md: `${collapsed ? collapsedDrawerWidth : expandedDrawerWidth}px` },
          transition: 'width 180ms ease, margin-left 180ms ease',
        }}
      >
        <Toolbar className="app-shell__toolbar">
          <IconButton onClick={handleDrawerToggle} sx={{ display: { md: 'none' } }} aria-label="Open menu">
            <MenuRounded />
          </IconButton>

          <Box className="app-shell__page-context">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {pageTitle}
            </Typography>
            <Box component="span" className="app-shell__role-badge" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              {getRoleLabel(activeRole)}
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Notifications">
            <IconButton onClick={handleOpenNotifications} className="app-shell__theme-btn" aria-label="Notifications" sx={{ mr: 0.75 }}>
              <Badge badgeContent={unreadCount} color="error" max={99}>
                <NotificationsNoneRounded fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
            <IconButton onClick={toggleTheme} className="app-shell__theme-btn" aria-label="Toggle theme">
              {mode === 'light' ? <DarkModeRounded fontSize="small" /> : <LightModeRounded fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Popover
        open={Boolean(notifAnchor)}
        anchorEl={notifAnchor}
        onClose={() => setNotifAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ width: 340, maxWidth: '90vw', p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              Notifications
            </Typography>
            {unreadCount > 0 ? (
              <Button size="small" startIcon={<DoneAllRounded />} onClick={handleMarkAllRead}>
                Mark read
              </Button>
            ) : null}
          </Stack>
          <Divider sx={{ mb: 1.25 }} />
          {notifications.length > 0 ? (
            <Stack spacing={1} sx={{ maxHeight: 300, overflowY: 'auto' }}>
              {notifications.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    opacity: item.read_at ? 0.72 : 1,
                  }}
                >
                  <Typography variant="caption" fontWeight={700} display="block">
                    {item.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {item.body}
                  </Typography>
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No notifications yet.
            </Typography>
          )}
        </Box>
      </Popover>

      <Box component="nav" sx={{ width: { md: collapsed ? collapsedDrawerWidth : expandedDrawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={closeDrawer}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: expandedDrawerWidth, border: 'none' },
          }}
        >
          <DrawerContent
            closeDrawer={closeDrawer}
            currentUser={currentUser}
            currentProfile={currentProfile}
            onSignOut={onSignOut}
            collapsed={false}
            onToggleCollapse={toggleCollapse}
            showCollapseControl={false}
          />
        </Drawer>

        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: collapsed ? collapsedDrawerWidth : expandedDrawerWidth,
              transition: 'width 180ms ease',
              overflowX: 'hidden',
              border: 'none',
            },
          }}
        >
          <DrawerContent
            closeDrawer={closeDrawer}
            currentUser={currentUser}
            currentProfile={currentProfile}
            onSignOut={onSignOut}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapse}
            showCollapseControl
          />
        </Drawer>
      </Box>

      <Box
        component="main"
        className="app-shell__content"
        sx={{
          ml: { md: `${collapsed ? collapsedDrawerWidth : expandedDrawerWidth}px` },
          transition: 'margin-left 180ms ease',
        }}
      >
        <Toolbar sx={{ minHeight: '60px !important' }} />
        <Box className="app-shell__container">
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
