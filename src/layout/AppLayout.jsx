import { useMemo, useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import {
  AnalyticsRounded,
  BadgeRounded,
  ChevronLeftRounded,
  ChevronRightRounded,
  DarkModeRounded,
  HistoryEduRounded,
  LogoutRounded,
  LightModeRounded,
  MenuRounded,
  PeopleAltRounded,
  PersonRounded,
  WorkOutlineRounded,
} from '@mui/icons-material';
import { NavLink, Outlet } from 'react-router-dom';
import Logo from '../assets/alumini-path-logo.webp';
import { canViewAnalytics, canViewEducationHistory, getRoleLabel, USER_ROLES } from '../data/platformConfig.js';
import '../styles/app-layout.scss';

const expandedDrawerWidth = 280;
const collapsedDrawerWidth = 92;

function getNavItems(role) {
  const baseItems = [
    { label: 'Overview', icon: <BadgeRounded />, to: '/dashboard' },
    { label: 'My Profile', icon: <PersonRounded />, to: '/profile' },
    { label: 'Community', icon: <PeopleAltRounded />, to: '/alumni' },
    { label: 'Opportunities', icon: <WorkOutlineRounded />, to: '/jobs' },
  ];

  if (canViewEducationHistory(role)) {
    baseItems.splice(2, 0, { label: 'History', icon: <HistoryEduRounded />, to: '/education-history' });
  }

  if (canViewAnalytics(role)) {
    baseItems.push({ label: 'Analytics', icon: <AnalyticsRounded />, to: '/analytics' });
  }

  return baseItems;
}

function getTopbarTitle(role) {
  if (role === USER_ROLES.student) {
    return 'Student workspace';
  }

  if (role === USER_ROLES.employee) {
    return 'Employee workspace';
  }

  if (role === USER_ROLES.schoolLeader) {
    return 'Leadership workspace';
  }

  return 'Alumni workspace';
}

function DrawerContent({
  memberCount,
  jobCount,
  closeDrawer,
  currentUser,
  currentProfile,
  onSignOut,
  collapsed,
  onToggleCollapse,
}) {
  const activeRole = currentProfile?.role || currentUser.role;
  const navItems = useMemo(() => getNavItems(activeRole), [activeRole]);

  return (
    <Box className={`app-shell__drawer${collapsed ? ' is-collapsed' : ''}`}>
      <Box className="app-shell__brand">
        <Avatar src={Logo} variant="rounded" className="app-shell__brand-mark" />
        {!collapsed && (
          <Box>
            <Typography variant="h6">Alumini-Path</Typography>
            <Typography variant="caption" color="text.secondary">
              Role-aware alumni platform
            </Typography>
          </Box>
        )}
      </Box>

      <Box className="app-shell__collapse-row">
        {!collapsed && (
          <Typography variant="overline" className="app-shell__eyebrow">
            Workspace
          </Typography>
        )}
        <IconButton onClick={onToggleCollapse} size="small" className="app-shell__collapse-toggle">
          {collapsed ? <ChevronRightRounded /> : <ChevronLeftRounded />}
        </IconButton>
      </Box>

      {!collapsed && (
        <Stack spacing={1} className="app-shell__metrics">
          <Typography variant="caption" color="text.secondary">
            {memberCount} community members
          </Typography>
            <Typography variant="caption" color="text.secondary">
              {jobCount} open opportunities
            </Typography>
        </Stack>
      )}

      <Divider />

      <List className="app-shell__nav-list">
        {navItems.map((item) => (
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
        ))}
      </List>

      <Box className="app-shell__drawer-footer">
        <Avatar src={currentProfile?.avatar?.url} className="app-shell__user-avatar">
          {currentUser.fullName?.slice(0, 1)}
        </Avatar>
        {!collapsed && (
          <>
            <Typography variant="subtitle2">{currentUser.fullName}</Typography>
            <Chip size="small" label={getRoleLabel(activeRole)} />
          </>
        )}
        <ListItemButton className="app-shell__nav-item" onClick={onSignOut}>
          <ListItemIcon>
            <LogoutRounded />
          </ListItemIcon>
          {!collapsed && <ListItemText primary="Logout" />}
        </ListItemButton>
      </Box>
    </Box>
  );
}

export default function AppLayout({ mode, toggleTheme, memberCount, jobCount, currentUser, currentProfile, onSignOut }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const activeRole = currentProfile?.role || currentUser.role;

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const closeDrawer = () => {
    setMobileOpen(false);
  };

  const toggleCollapse = () => {
    setCollapsed((prev) => !prev);
  };

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
        }}
      >
        <Toolbar className="app-shell__toolbar">
          <IconButton onClick={handleDrawerToggle} sx={{ display: { md: 'none' } }}>
            <MenuRounded />
          </IconButton>

          <Box>
            <Typography variant="overline" className="app-shell__eyebrow">
              Alumni, students, employees, and school leaders
            </Typography>
            <Typography variant="h6">{getTopbarTitle(activeRole)}</Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <IconButton onClick={toggleTheme} color="inherit">
            {mode === 'light' ? <DarkModeRounded /> : <LightModeRounded />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: collapsed ? collapsedDrawerWidth : expandedDrawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={closeDrawer}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: expandedDrawerWidth },
          }}
        >
          <DrawerContent
            memberCount={memberCount}
            jobCount={jobCount}
            closeDrawer={closeDrawer}
            currentUser={currentUser}
            currentProfile={currentProfile}
            onSignOut={onSignOut}
            collapsed={false}
            onToggleCollapse={toggleCollapse}
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
            },
          }}
        >
          <DrawerContent
            memberCount={memberCount}
            jobCount={jobCount}
            closeDrawer={closeDrawer}
            currentUser={currentUser}
            currentProfile={currentProfile}
            onSignOut={onSignOut}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapse}
          />
        </Drawer>
      </Box>

      <Box
        component="main"
        className="app-shell__content"
        sx={{ ml: { md: `${collapsed ? collapsedDrawerWidth : expandedDrawerWidth}px` } }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
