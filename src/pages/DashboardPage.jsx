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
import '../styles/dashboard.scss';

export default function DashboardPage({ alumni, jobs }) {
  const stats = [
    { label: 'Registered alumni', value: alumni.length, accent: 'sea' },
    { label: 'Active referrals', value: jobs.length, accent: 'amber' },
    {
      label: 'Mentorship sessions',
      value: alumni.reduce((sum, entry) => sum + entry.mentorshipCount, 0),
      accent: 'slate',
    },
  ];

  return (
    <Stack spacing={3}>
      <Card className="hero-panel" elevation={0}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, lg: 7 }}>
              <Typography variant="overline" className="hero-panel__kicker">
                Frontend practical assessment brief
              </Typography>
              <Typography variant="h3" className="hero-panel__title">
                Alumni engagement rebuilt around real platform workflows.
              </Typography>
              <Typography variant="body1" color="text.secondary" className="hero-panel__copy">
                Create alumni profiles, track referrals, open detailed profile dialogs, filter records, and monitor
                engagement with responsive dashboards that support both light and dark mode.
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
                <Button component={RouterLink} to="/alumni" variant="contained">
                  Manage alumni
                </Button>
                <Button component={RouterLink} to="/jobs" variant="outlined">
                  Post referrals
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
                Recent alumni activity
              </Typography>
              <List disablePadding>
                {alumni.map((entry) => (
                  <ListItem key={entry.id} disableGutters className="summary-card__list-item">
                    <ListItemAvatar>
                      <Avatar src={entry.avatar?.url}>{entry.fullName.slice(0, 1)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={entry.fullName}
                      secondary={`${entry.currentRole} at ${entry.company} • ${entry.department} • ${entry.graduationYear}`}
                    />
                    <Chip label={entry.employmentSector} size="small" />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, xl: 5 }}>
          <Card elevation={0} className="summary-card">
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Live referral board
              </Typography>
              <Stack spacing={1.5}>
                {jobs.map((job) => (
                  <Box key={job.id} className="summary-card__job">
                    <Typography variant="subtitle1">{job.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {job.company} • {job.location} • {job.type}
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
      </Grid>
    </Stack>
  );
}
