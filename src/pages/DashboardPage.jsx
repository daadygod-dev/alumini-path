import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  canConnectMembers,
  getRoleLabel,
  roleOptions,
  USER_ROLES,
} from '../data/platformConfig.js';
import '../styles/dashboard.scss';

function buildStats({ currentProfile, currentUser, jobs, members }) {
  const connectionCount = currentProfile?.connections?.length || 0;
  const studentCount = members.filter((entry) => entry.role === USER_ROLES.student).length;
  const alumniCount = members.filter((entry) => entry.role === USER_ROLES.alumni).length;

  if (currentUser.role === USER_ROLES.student) {
    return [
      { label: 'Alumni connections', value: connectionCount, accent: 'sea' },
      { label: 'Open opportunities', value: jobs.length, accent: 'amber' },
      { label: 'Registered alumni', value: alumniCount, accent: 'slate' },
    ];
  }

  if (currentUser.role === USER_ROLES.employee) {
    return [
      { label: 'Community members', value: members.length, accent: 'sea' },
      { label: 'Open opportunities', value: jobs.length, accent: 'amber' },
      { label: 'Active students', value: studentCount, accent: 'slate' },
    ];
  }

  if (currentUser.role === USER_ROLES.schoolLeader) {
    return [
      { label: 'Community members', value: members.length, accent: 'sea' },
      { label: 'Registered students', value: studentCount, accent: 'amber' },
      { label: 'Open opportunities', value: jobs.length, accent: 'slate' },
    ];
  }

  return [
    { label: 'Student connections', value: connectionCount, accent: 'sea' },
    { label: 'Active referrals', value: jobs.length, accent: 'amber' },
    { label: 'Registered students', value: studentCount, accent: 'slate' },
  ];
}

function getHeroCopy(role) {
  if (role === USER_ROLES.student) {
    return {
      title: 'Connect with alumni and move from study to opportunity.',
      copy:
        'Browse alumni who match your department, build mentorship connections, and track the latest internships and referrals.',
      primary: { label: 'Find alumni', to: '/alumni' },
      secondary: { label: 'Browse jobs', to: '/jobs' },
    };
  }

  if (role === USER_ROLES.employee) {
    return {
      title: 'Support placements with one shared employee workspace.',
      copy:
        'Manage the member directory, publish opportunities, and keep alumni and students visible to the careers team.',
      primary: { label: 'Open directory', to: '/alumni' },
      secondary: { label: 'Manage jobs', to: '/jobs' },
    };
  }

  if (role === USER_ROLES.schoolLeader) {
    return {
      title: 'Track graduate engagement with cleaner leadership visibility.',
      copy:
        'Review community growth, scan the directory, and monitor opportunity flow across departments from one dashboard.',
      primary: { label: 'View analytics', to: '/analytics' },
      secondary: { label: 'Open directory', to: '/alumni' },
    };
  }

  return {
    title: 'Reconnect with students and extend the alumni network.',
    copy:
      'Share your experience, connect with students who need guidance, and surface referrals that support real placement outcomes.',
    primary: { label: 'Find students', to: '/alumni' },
    secondary: { label: 'Post opportunities', to: '/jobs' },
  };
}

export default function DashboardPage({ members, jobs, currentUser, currentProfile }) {
  const activeRole = currentProfile?.role || currentUser.role;
  const stats = buildStats({ currentProfile, currentUser: { ...currentUser, role: activeRole }, jobs, members });
  const hero = getHeroCopy(activeRole);
  const connections = members.filter((entry) => currentProfile?.connections?.includes(entry.id));
  const suggestedConnections = members
    .filter(
      (entry) =>
        entry.id !== currentUser.id &&
        canConnectMembers(activeRole, entry.role) &&
        !currentProfile?.connections?.includes(entry.id),
    )
    .slice(0, 4);
  const visibleJobs = jobs.slice(0, 4);
  const roleMix = roleOptions.map((option) => ({
    ...option,
    count: members.filter((entry) => entry.role === option.value).length,
  }));

  return (
    <Stack spacing={3}>
      <Card className="hero-panel" elevation={0}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, lg: 7 }}>
              <Typography variant="overline" className="hero-panel__kicker">
                {getRoleLabel(activeRole)} workspace
              </Typography>
              <Typography variant="h3" className="hero-panel__title">
                {hero.title}
              </Typography>
              <Typography variant="body1" color="text.secondary" className="hero-panel__copy">
                {hero.copy}
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
                <Button component={RouterLink} to={hero.primary.to} variant="contained">
                  {hero.primary.label}
                </Button>
                <Button component={RouterLink} to={hero.secondary.to} variant="outlined">
                  {hero.secondary.label}
                </Button>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, lg: 5 }}>
              <Box className="hero-panel__metrics">
                {stats.map((item) => (
                  <Box key={item.label} className={`hero-panel__metric hero-panel__metric--${item.accent}`}>
                    <Typography variant="h4">{item.value}</Typography>
                    <Typography variant="body2">{item.label}</Typography>
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, xl: 7 }}>
          <Card elevation={0} className="summary-card">
            <CardContent>
              <Typography variant="h5" gutterBottom>
                {canConnectMembers(activeRole, USER_ROLES.student) || canConnectMembers(activeRole, USER_ROLES.alumni)
                  ? 'Suggested connections'
                  : 'Community role mix'}
              </Typography>

              {suggestedConnections.length ? (
                <List disablePadding>
                  {suggestedConnections.map((entry) => (
                    <ListItem key={entry.id} disableGutters className="summary-card__list-item">
                      <ListItemAvatar>
                        <Avatar src={entry.avatar?.url}>{entry.fullName.slice(0, 1)}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={entry.fullName}
                        secondary={`${getRoleLabel(entry.role)} | ${entry.currentRole} | ${entry.department}`}
                      />
                      <Chip label={entry.location || 'Location pending'} size="small" />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {roleMix.map((entry) => (
                    <Chip key={entry.value} label={`${entry.label}: ${entry.count}`} />
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, xl: 5 }}>
          <Card elevation={0} className="summary-card">
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Your network
              </Typography>
              <Stack spacing={1.5}>
                {connections.length ? (
                  connections.map((entry) => (
                    <Box key={entry.id} className="summary-card__job">
                      <Typography variant="subtitle1">{entry.fullName}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {getRoleLabel(entry.role)} | {entry.currentRole}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {entry.department} | {entry.location || 'Location pending'}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No direct connections yet. Use the community directory to connect alumni and students.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, xl: 7 }}>
          <Card elevation={0} className="summary-card">
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Live opportunity board
              </Typography>
              <Stack spacing={1.5}>
                {visibleJobs.map((job) => (
                  <Box key={job.id} className="summary-card__job">
                    <Typography variant="subtitle1">{job.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {job.company} | {job.location || 'Location TBC'} | {job.type}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Shared by {job.postedByName}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: 'wrap' }}>
                      {job.qualifications.slice(0, 3).map((qualification) => (
                        <Chip key={qualification} label={qualification} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, xl: 5 }}>
          <Card elevation={0} className="summary-card">
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Recent member activity
              </Typography>
              <List disablePadding>
                {members.slice(0, 5).map((entry) => (
                  <ListItem key={entry.id} disableGutters className="summary-card__list-item">
                    <ListItemAvatar>
                      <Avatar src={entry.avatar?.url}>{entry.fullName.slice(0, 1)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={entry.fullName}
                      secondary={`${getRoleLabel(entry.role)} | ${entry.department} | ${entry.graduationYear || 'Year pending'}`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
