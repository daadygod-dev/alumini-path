import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import {
  ArrowForwardRounded,
  CheckRounded,
  CloseRounded,
  PeopleOutlineRounded,
  RefreshRounded,
  WorkOffOutlined,
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState.jsx';
import { ProtectedAvatar } from '../components/ProtectedAsset.jsx';
import {
  canConnectMembers,
  canViewAnalytics,
  getRoleLabel,
  USER_ROLES,
} from '../data/platformConfig.js';
import '../styles/dashboard.scss';

function buildStats({ acceptedConnections, currentUser, jobs, members }) {
  const connectionCount = acceptedConnections.length;
  const studentCount = members.filter((entry) => entry.role === 'student').length;
  const alumniCount = members.filter((entry) => entry.role === 'alumni').length;
  const openJobsCount = jobs.filter((job) => job.status === 'open').length;

  if (currentUser.role === 'student') {
    return [
      { label: 'Active Connections', value: connectionCount, hint: 'Mentors & peers in your network' },
      { label: 'Open Opportunities', value: openJobsCount, hint: 'Internships & full-time referrals' },
      { label: 'Registered Alumni', value: alumniCount, hint: 'Available in the directory' },
    ];
  }

  if (currentUser.role === 'employee' || currentUser.role === 'administrator') {
    return [
      { label: 'Community Members', value: members.length, hint: 'Active directory profiles' },
      { label: 'Open Opportunities', value: openJobsCount, hint: 'Published referral listings' },
      { label: 'Active Students', value: studentCount, hint: 'Seeking mentorship & roles' },
    ];
  }

  if (currentUser.role === 'school_leader') {
    return [
      { label: 'Community Members', value: members.length, hint: 'Alumni, students & staff' },
      { label: 'Registered Students', value: studentCount, hint: 'Enrolled across departments' },
      { label: 'Open Opportunities', value: openJobsCount, hint: 'Active employer referrals' },
    ];
  }

  return [
    { label: 'Active Connections', value: connectionCount, hint: 'Students & alumni in your network' },
    { label: 'Open Referrals', value: openJobsCount, hint: 'Live roles on the board' },
    { label: 'Registered Students', value: studentCount, hint: 'Looking for industry advice' },
  ];
}

function getHeaderCopy(user) {
  if (user.role === 'student') {
    return {
      subtitle: 'Connect with graduates in your field and browse live internship and job referrals.',
      primary: { label: 'Browse directory', to: '/alumni' },
      secondary: { label: 'Explore jobs', to: '/jobs' },
    };
  }

  if (user.role === 'employee' || user.role === 'administrator') {
    return {
      subtitle: 'Coordinate member records, publish referrals, and keep career opportunities updated.',
      primary: { label: 'Open directory', to: '/alumni' },
      secondary: { label: 'Manage jobs', to: '/jobs' },
    };
  }

  if (canViewAnalytics(user)) {
    return {
      subtitle: 'Review network growth, employment sector distribution, and student-alumni engagement.',
      primary: { label: 'Open analytics', to: '/analytics' },
      secondary: { label: 'Browse directory', to: '/alumni' },
    };
  }

  return {
    subtitle: 'Mentor students from your department and share openings from your organization.',
    primary: { label: 'Find peers', to: '/alumni' },
    secondary: { label: 'Post a job', to: '/jobs' },
  };
}

export default function DashboardPage({
  currentUser,
  currentProfile,
  members = [],
  jobs = [],
  acceptedConnections = [],
  incomingRequests = [],
  connectionLookup = {},
  loading = false,
  error = '',
  onRetry,
  onConnectMember,
  onRespondConnection,
}) {
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState(null);
  const activeRole = currentProfile?.role || currentUser.role;
  const firstName = currentUser.fullName?.split(' ')[0] || 'there';
  const effectiveUser = { ...currentUser, role: activeRole };
  const stats = buildStats({ acceptedConnections, currentUser: effectiveUser, jobs, members });
  const headerCopy = getHeaderCopy(effectiveUser);
  const canConnect = canConnectMembers(effectiveUser);

  const memberById = new Map(members.map((m) => [m.id, m]));

  const connectedMembers = acceptedConnections
    .map((conn) => {
      const otherId =
        Number(conn.requester_id) === currentUser.id
          ? Number(conn.addressee_id)
          : Number(conn.requester_id);
      const found = memberById.get(otherId);
      if (found) {
        return found;
      }
      return {
        id: otherId,
        fullName: conn.other_name || 'Member',
        email: conn.other_email || '',
        currentRole: 'Connected member',
        company: '',
      };
    })
    .slice(0, 5);

  const suggestedConnections = members
    .filter((entry) => entry.id !== currentUser.id && !connectionLookup[entry.id])
    .slice(0, 4);

  const recentMembers = members.filter((entry) => entry.id !== currentUser.id).slice(0, 4);
  const openJobs = jobs.filter((job) => job.status === 'open');
  const visibleJobs = (openJobs.length ? openJobs : jobs).slice(0, 4);

  const roleMix = USER_ROLES.map((option) => ({
    ...option,
    count: members.filter((entry) => entry.role === option.code).length,
  }));

  const handleConnect = async (targetId) => {
    setBusyId(`connect-${targetId}`);
    const result = await onConnectMember(targetId);
    setBusyId(null);

    if (!result.ok) {
      toast.error(result.reason || 'Could not send connection request.');
      return;
    }

    toast.success('Connection request sent.');
  };

  const handleRespond = async (connectionId, decision) => {
    setBusyId(`resp-${connectionId}`);
    const result = await onRespondConnection(connectionId, decision);
    setBusyId(null);

    if (!result.ok) {
      toast.error(result.reason || 'Could not update request.');
      return;
    }

    toast.success(decision === 'accepted' ? 'Connection accepted.' : 'Connection request declined.');
  };

  return (
    <Box className="dashboard-shell">
      <Box className="dashboard-hero-mist reveal-block">
        <Box className="dashboard-header">
          <Box>
            <Chip
              label={`${getRoleLabel(activeRole)} workspace`}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Typography variant="h3" className="dashboard-header__title">
              Welcome back, {firstName}
            </Typography>
            <Typography variant="body2" color="text.secondary" className="dashboard-header__copy">
              {headerCopy.subtitle}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.25} flexWrap="wrap">
            <Button component={RouterLink} to={headerCopy.secondary.to} variant="outlined">
              {headerCopy.secondary.label}
            </Button>
            <Button
              component={RouterLink}
              to={headerCopy.primary.to}
              variant="contained"
              endIcon={<ArrowForwardRounded />}
            >
              {headerCopy.primary.label}
            </Button>
          </Stack>
        </Box>
      </Box>

      {error ? (
        <Alert
          severity="error"
          action={
            onRetry ? (
              <Button color="inherit" size="small" startIcon={<RefreshRounded />} onClick={onRetry}>
                Retry
              </Button>
            ) : null
          }
        >
          {error}
        </Alert>
      ) : null}

      <Box className="stat-strip reveal-block reveal-delay-1" aria-label="Workspace summary">
        {stats.map((item) => (
          <Box key={item.label} className="stat-strip__item">
            <span className="stat-strip__label">{item.label}</span>
            {loading ? (
              <Skeleton variant="text" width={72} height={42} />
            ) : (
              <span className="stat-strip__value">{item.value}</span>
            )}
            <span className="stat-strip__hint">{item.hint}</span>
          </Box>
        ))}
      </Box>

      <Grid container spacing={2.5} alignItems="stretch">
        <Grid size={{ xs: 12, lg: 7 }} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {canConnect ? (
            <>
              {incomingRequests.length > 0 ? (
                <Box className="dashboard-panel reveal-block reveal-delay-2">
                  <Box className="dashboard-panel__body">
                    <Box className="panel-header">
                      <Box>
                        <Typography variant="h6">Pending requests</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Members waiting for your response.
                        </Typography>
                      </Box>
                      <Chip label={incomingRequests.length} size="small" color="primary" />
                    </Box>

                    <Box>
                      {incomingRequests.map((req) => (
                        <Box key={req.id} className="panel-row">
                          <Box className="panel-row__person">
                            <ProtectedAvatar className="panel-row__avatar">
                              {req.other_name?.slice(0, 1) || 'M'}
                            </ProtectedAvatar>
                            <Box className="panel-row__meta">
                              <Typography className="panel-row__name" noWrap>
                                {req.other_name}
                              </Typography>
                              <Typography className="panel-row__sub" noWrap>
                                {req.message || req.other_email}
                              </Typography>
                            </Box>
                          </Box>

                          <Stack direction="row" spacing={0.75}>
                            <Button
                              size="small"
                              variant="contained"
                              disabled={busyId === `resp-${req.id}`}
                              onClick={() => handleRespond(req.id, 'accepted')}
                              startIcon={<CheckRounded fontSize="small" />}
                            >
                              Accept
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="inherit"
                              disabled={busyId === `resp-${req.id}`}
                              onClick={() => handleRespond(req.id, 'rejected')}
                              startIcon={<CloseRounded fontSize="small" />}
                            >
                              Decline
                            </Button>
                          </Stack>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              ) : null}

              <Box className="dashboard-panel reveal-block reveal-delay-2">
                <Box className="dashboard-panel__body">
                  <Box className="panel-header">
                    <Box>
                      <Typography variant="h6">Recommended people to connect</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Verified community members not yet in your network.
                      </Typography>
                    </Box>
                    <Button component={RouterLink} to="/alumni" size="small">
                      View directory
                    </Button>
                  </Box>

                  {loading ? (
                    <Stack spacing={1.25}>
                      {[1, 2, 3].map((idx) => (
                        <Skeleton key={idx} variant="rounded" height={54} />
                      ))}
                    </Stack>
                  ) : suggestedConnections.length > 0 ? (
                    <Box>
                      {suggestedConnections.map((member) => (
                        <Box key={member.id} className="panel-row">
                          <Box className="panel-row__person">
                            <ProtectedAvatar
                              src={member.avatarUrl}
                              className="panel-row__avatar"
                            >
                              {member.fullName?.slice(0, 1)}
                            </ProtectedAvatar>
                            <Box className="panel-row__meta">
                              <Typography className="panel-row__name" noWrap>
                                {member.fullName}
                              </Typography>
                              <Typography className="panel-row__sub" noWrap>
                                {[member.currentRole, member.company].filter(Boolean).join(' · ') ||
                                  member.department ||
                                  member.roleLabel}
                              </Typography>
                            </Box>
                          </Box>

                          <Button
                            size="small"
                            variant="outlined"
                            disabled={busyId === `connect-${member.id}`}
                            onClick={() => handleConnect(member.id)}
                          >
                            {busyId === `connect-${member.id}` ? 'Sending...' : 'Connect'}
                          </Button>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <EmptyState
                      compact
                      icon={<PeopleOutlineRounded fontSize="small" />}
                      title="No new suggestions available"
                      description="You are already connected with available members, or no additional profiles are registered yet."
                      actionLabel="Browse full directory"
                      onAction={() => navigate('/alumni')}
                    />
                  )}
                </Box>
              </Box>

              <Box className="dashboard-panel reveal-block reveal-delay-3">
                <Box className="dashboard-panel__body">
                  <Box className="panel-header">
                    <Box>
                      <Typography variant="h6">Your network</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Accepted connections from the alumni and student community.
                      </Typography>
                    </Box>
                    <Chip label={`${acceptedConnections.length} total`} size="small" variant="outlined" />
                  </Box>

                  {loading ? (
                    <Stack spacing={1.25}>
                      {[1, 2].map((idx) => (
                        <Skeleton key={idx} variant="rounded" height={50} />
                      ))}
                    </Stack>
                  ) : connectedMembers.length > 0 ? (
                    <Box>
                      {connectedMembers.map((member) => (
                        <Box key={member.id} className="panel-row">
                          <Box className="panel-row__person">
                            <ProtectedAvatar
                              src={member.avatarUrl}
                              className="panel-row__avatar"
                            >
                              {member.fullName?.slice(0, 1)}
                            </ProtectedAvatar>
                            <Box className="panel-row__meta">
                              <Typography className="panel-row__name" noWrap>
                                {member.fullName}
                              </Typography>
                              <Typography className="panel-row__sub" noWrap>
                                {[member.currentRole, member.company].filter(Boolean).join(' · ') ||
                                  member.email}
                              </Typography>
                            </Box>
                          </Box>
                          <Chip label={getRoleLabel(member.role)} size="small" variant="outlined" />
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <EmptyState
                      compact
                      icon={<PeopleOutlineRounded fontSize="small" />}
                      title="No connections yet"
                      description="Send a connection request from the suggestions above or the community directory."
                    />
                  )}
                </Box>
              </Box>
            </>
          ) : (
            <Box className="dashboard-panel reveal-block reveal-delay-2" sx={{ flex: 1 }}>
              <Box className="dashboard-panel__body">
                <Box className="panel-header">
                  <Box>
                    <Typography variant="h6">Recent directory members</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Latest profiles maintained across the community registry.
                    </Typography>
                  </Box>
                  <Button component={RouterLink} to="/alumni" size="small">
                    Open directory
                  </Button>
                </Box>

                {loading ? (
                  <Stack spacing={1.25}>
                    {[1, 2, 3, 4].map((idx) => (
                      <Skeleton key={idx} variant="rounded" height={54} />
                    ))}
                  </Stack>
                ) : recentMembers.length > 0 ? (
                  <Box>
                    {recentMembers.map((member) => (
                      <Box key={member.id} className="panel-row">
                        <Box className="panel-row__person">
                          <ProtectedAvatar
                            src={member.avatarUrl}
                            className="panel-row__avatar"
                          >
                            {member.fullName?.slice(0, 1)}
                          </ProtectedAvatar>
                          <Box className="panel-row__meta">
                            <Typography className="panel-row__name" noWrap>
                              {member.fullName}
                            </Typography>
                            <Typography className="panel-row__sub" noWrap>
                              {[member.currentRole, member.department].filter(Boolean).join(' · ')}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip label={getRoleLabel(member.role)} size="small" variant="outlined" />
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <EmptyState
                    compact
                    icon={<PeopleOutlineRounded fontSize="small" />}
                    title="No community profiles found"
                    description="Directory profiles will appear here once members are registered in the database."
                  />
                )}
              </Box>
            </Box>
          )}
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box className="dashboard-panel reveal-block reveal-delay-2">
            <Box className="dashboard-panel__body">
              <Box className="panel-header">
                <Box>
                  <Typography variant="h6">Recent opportunities</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Latest open postings from the job board.
                  </Typography>
                </Box>
                <Button component={RouterLink} to="/jobs" size="small">
                  All jobs
                </Button>
              </Box>

              {loading ? (
                <Stack spacing={1.25}>
                  {[1, 2, 3].map((idx) => (
                    <Skeleton key={idx} variant="rounded" height={74} />
                  ))}
                </Stack>
              ) : visibleJobs.length > 0 ? (
                <Stack spacing={1.25}>
                  {visibleJobs.map((job) => (
                    <Box key={job.id} className="job-row">
                      <Box className="job-row__top">
                        <Box>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {job.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {[job.company, job.location].filter(Boolean).join(' · ')}
                          </Typography>
                        </Box>
                        <Chip label={job.typeLabel} size="small" variant="outlined" />
                      </Box>
                      <Box className="job-row__meta">
                        {job.sector ? <span>{job.sector}</span> : null}
                        <span>By {job.postedBy}</span>
                        {job.postedOn ? <span className="tabular-nums">{job.postedOn}</span> : null}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <EmptyState
                  compact
                  icon={<WorkOffOutlined fontSize="small" />}
                  title="No job opportunities posted"
                  description="Active job referrals and internships will appear here once published."
                />
              )}
            </Box>
          </Box>

          <Box className="dashboard-panel reveal-block reveal-delay-3">
            <Box className="dashboard-panel__body">
              <Box className="panel-header">
                <Box>
                  <Typography variant="h6">Community role mix</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Distribution across registered accounts.
                  </Typography>
                </Box>
              </Box>

              {loading ? (
                <Stack spacing={1.25}>
                  {[1, 2, 3, 4].map((idx) => (
                    <Skeleton key={idx} variant="rounded" height={28} />
                  ))}
                </Stack>
              ) : members.length > 0 ? (
                <Box>
                  {roleMix.map((entry) => {
                    const pct = members.length ? Math.round((entry.count / members.length) * 100) : 0;
                    return (
                      <Box key={entry.code} className="role-mix-row">
                        <Box sx={{ flex: 1, pr: 2 }}>
                          <Typography variant="body2" fontWeight={500}>
                            {entry.label}
                          </Typography>
                          <Box className="role-progress-track" sx={{ mt: 0.6 }}>
                            <Box className="role-progress-fill" sx={{ width: `${pct}%` }} />
                          </Box>
                        </Box>
                        <Typography variant="body2" fontWeight={700} className="tabular-nums">
                          {entry.count}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <EmptyState
                  compact
                  icon={<PeopleOutlineRounded fontSize="small" />}
                  title="No role metrics yet"
                  description="Member distribution calculates automatically as accounts are added."
                />
              )}
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
