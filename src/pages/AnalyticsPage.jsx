import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { BarChartRounded, DownloadRounded, RefreshRounded } from '@mui/icons-material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState.jsx';
import { apiRequest, downloadProtectedFile } from '../api/client.js';
import '../styles/feature-pages.scss';

export default function AnalyticsPage({ lookups = { departments: [] } }) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const chartColors = isLight
    ? ['#0d6e66', '#b84a1e', '#334155', '#64748b', '#0f766e']
    : ['#4fd1c5', '#f08a5d', '#94a3b8', '#cbd5e1', '#2dd4bf'];

  const gridStroke = theme.palette.divider;
  const tickFill = theme.palette.text.secondary;
  const tooltipStyle = {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    fontSize: '0.8rem',
    color: theme.palette.text.primary,
  };

  const [departmentFilter, setDepartmentFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [exportReport, setExportReport] = useState('alumni');
  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = {};
      if (departmentFilter) query.department = departmentFilter;
      if (/^\d{4}$/.test(yearFilter.trim())) query.graduationYear = yearFilter.trim();
      if (/^\d{4}-\d{2}$/.test(periodFilter.trim())) query.period = periodFilter.trim();

      const [sumData, chartData] = await Promise.all([
        apiRequest('analytics-summary', { query }),
        apiRequest('analytics-charts', { query }),
      ]);

      setSummary(sumData || null);
      setCharts(chartData || null);
    } catch (err) {
      setError(err.message || 'Could not load analytics from the database.');
    } finally {
      setLoading(false);
    }
  }, [departmentFilter, periodFilter, yearFilter]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleExportCsv = async () => {
    try {
      await downloadProtectedFile(
        `index.php?route=analytics-export&report=${encodeURIComponent(exportReport)}`,
        `${exportReport}-report.csv`,
      );
      toast.success('CSV report downloaded.');
    } catch (err) {
      toast.error(err.message || 'Could not export report.');
    }
  };

  const byGradYear = (charts?.byGraduationYear || []).map((row) => ({
    year: String(row.graduation_year || row.year || 'N/A'),
    alumni: Number(row.alumni_count || row.total || 0),
  }));

  const byDepartment = (charts?.byDepartment || []).map((row) => ({
    name: row.department_name || row.department || 'Unassigned',
    value: Number(row.alumni_count || row.total || 0),
  }));

  const bySector = (charts?.bySector || []).map((row) => ({
    name: row.sector_name || row.sector || 'Other',
    value: Number(row.alumni_count || row.total || 0),
  }));

  const jobTrends = (charts?.jobPostingTrends || []).map((row) => ({
    month: row.period || row.month_label || row.month || '',
    jobsPosted: Number(row.jobs_posted || row.total_jobs || row.total || 0),
    jobsOpen: Number(row.jobs_open || 0),
  }));

  const applicationOutcomes = (charts?.applicationOutcomes || []).map((row) => ({
    name: row.job_title ? String(row.job_title).slice(0, 22) : 'Role',
    pending: Number(row.pending || 0),
    reviewed: Number(row.reviewed || 0),
    shortlisted: Number(row.shortlisted || 0),
    accepted: Number(row.accepted || 0),
    rejected: Number(row.rejected || 0),
  }));

  const mentorshipActivity = (charts?.mentorshipActivity || []).map((row) => ({
    name: row.mentor_name || 'Mentor',
    received: Number(row.requests_received || 0),
    accepted: Number(row.requests_accepted || 0),
    sessions: Number(row.sessions_completed || 0),
  }));

  const eventStats = (charts?.eventStats || []).map((row) => ({
    name: row.event_title ? String(row.event_title).slice(0, 22) : 'Event',
    registered: Number(row.registered || 0),
    attended: Number(row.attended || 0),
    absent: Number(row.absent || 0),
  }));

  const engagementTop = (charts?.engagement || []).slice(0, 8).map((row) => ({
    name: row.full_name || 'Member',
    posts: Number(row.posts_count || 0),
    comments: Number(row.comments_count || 0),
    connections: Number(row.connections_count || 0),
    sessions: Number(row.mentorship_sessions_completed || 0),
  }));

  const kpis = [
    {
      label: 'Total Alumni Profiles',
      value: Number(summary?.alumni?.total || 0),
      sub: `${Number(summary?.alumni?.recent_graduates || 0)} recent graduates`,
    },
    {
      label: 'Employed Graduates',
      value: Number(summary?.alumni?.employed || 0),
      sub: `${Number(summary?.alumni?.available_mentors || 0)} available mentors`,
    },
    {
      label: 'Open Opportunities',
      value: Number(summary?.jobs?.open || 0),
      sub: `${Number(summary?.jobs?.applications || 0)} applications · ${Number(summary?.jobs?.total || 0)} total postings`,
    },
    {
      label: 'Network Engagement',
      value: Number(summary?.engagement?.accepted_connections || 0),
      sub: `${Number(summary?.engagement?.completed_sessions || 0)} mentorship sessions · ${Number(summary?.events?.upcoming || 0)} upcoming events`,
    },
  ];

  return (
    <Stack spacing={3}>
      <Box className="page-header reveal-block">
        <Box>
          <Typography variant="h4">Community Analytics</Typography>
          <Typography variant="body1" color="text.secondary" className="page-header__copy">
            Live database metrics across graduate cohorts, employment sectors, and referral engagement.
          </Typography>
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          <TextField
            size="small"
            select
            label="CSV Report"
            value={exportReport}
            onChange={(event) => setExportReport(event.target.value)}
            sx={{ minWidth: { xs: 0, sm: 160 } }}
          >
            <MenuItem value="alumni">Alumni Directory</MenuItem>
            <MenuItem value="jobs">Job Referrals</MenuItem>
            <MenuItem value="events">Events & Attendance</MenuItem>
            <MenuItem value="engagement">Engagement</MenuItem>
          </TextField>
          <Button variant="outlined" startIcon={<DownloadRounded />} onClick={handleExportCsv}>
            Export CSV
          </Button>
        </Stack>
      </Box>

      <Card className="reveal-block reveal-delay-1">
        <CardContent>
          <Box className="filter-bar">
            <TextField
              size="small"
              select
              label="Department"
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              sx={{ minWidth: 210 }}
            >
              <MenuItem value="">All departments</MenuItem>
              {(lookups.departments || []).map((dept) => (
                <MenuItem key={dept.id} value={String(dept.id)}>
                  {dept.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              size="small"
              label="Graduation year"
              placeholder="e.g. 2024"
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              sx={{ width: 150 }}
            />

            <TextField
              size="small"
              type="month"
              label="Period (Month)"
              value={periodFilter}
              onChange={(event) => setPeriodFilter(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 175 }}
            />

            {(departmentFilter || yearFilter || periodFilter) ? (
              <Button
                size="small"
                color="inherit"
                onClick={() => {
                  setDepartmentFilter('');
                  setYearFilter('');
                  setPeriodFilter('');
                }}
              >
                Reset
              </Button>
            ) : null}
          </Box>
        </CardContent>
      </Card>

      {error ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" startIcon={<RefreshRounded />} onClick={loadAnalytics}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      ) : null}

      <Box className="kpi-grid reveal-block reveal-delay-1">
        {kpis.map((item) => (
          <Box key={item.label} className="kpi-tile">
            <div className="kpi-tile__label">{item.label}</div>
            {loading ? (
              <Skeleton variant="text" width={64} height={40} />
            ) : (
              <div className="kpi-tile__value">{item.value}</div>
            )}
            <div className="kpi-tile__sub">{item.sub}</div>
          </Box>
        ))}
      </Box>

      <Grid container spacing={2.5} alignItems="stretch">
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }} className="reveal-block reveal-delay-2">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Employment by Sector
              </Typography>
              {loading ? (
                <Skeleton variant="rounded" height={280} />
              ) : bySector.length > 0 ? (
                <Box className="chart-panel">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={bySector}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={56}
                        outerRadius={92}
                        paddingAngle={2}
                      >
                        {bySector.map((entry, idx) => (
                          <Cell key={entry.name} fill={chartColors[idx % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <EmptyState
                  compact
                  icon={<BarChartRounded fontSize="small" />}
                  title="No sector data available"
                  description="Sector breakdowns populate as alumni link their roles to industry sectors."
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }} className="reveal-block reveal-delay-2">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Alumni by Department
              </Typography>
              {loading ? (
                <Skeleton variant="rounded" height={280} />
              ) : byDepartment.length > 0 ? (
                <Box className="chart-panel">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byDepartment}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                      <XAxis dataKey="name" stroke={tickFill} tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} stroke={tickFill} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" name="Alumni" fill={chartColors[0]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <EmptyState
                  compact
                  icon={<BarChartRounded fontSize="small" />}
                  title="No department metrics yet"
                  description="No department records match the active filter criteria."
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }} className="reveal-block reveal-delay-3">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Graduates by Cohort Year
              </Typography>
              {loading ? (
                <Skeleton variant="rounded" height={280} />
              ) : byGradYear.length > 0 ? (
                <Box className="chart-panel">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byGradYear}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                      <XAxis dataKey="year" stroke={tickFill} tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} stroke={tickFill} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="alumni" name="Graduates" fill={chartColors[1]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <EmptyState
                  compact
                  icon={<BarChartRounded fontSize="small" />}
                  title="No graduation cohort metrics"
                  description="Cohort counts will render as alumni graduation years are recorded."
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }} className="reveal-block reveal-delay-3">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Job Posting Trends
              </Typography>
              {loading ? (
                <Skeleton variant="rounded" height={280} />
              ) : jobTrends.length > 0 ? (
                <Box className="chart-panel">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={jobTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                      <XAxis dataKey="month" stroke={tickFill} tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} stroke={tickFill} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                      <Line
                        type="monotone"
                        dataKey="jobsPosted"
                        name="Jobs posted"
                        stroke={chartColors[0]}
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="jobsOpen"
                        name="Currently open"
                        stroke={chartColors[1]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <EmptyState
                  compact
                  icon={<BarChartRounded fontSize="small" />}
                  title="No job posting history"
                  description="Monthly referral volume appears once jobs are published."
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }} className="reveal-block reveal-delay-3">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Application Outcomes by Role
              </Typography>
              {loading ? (
                <Skeleton variant="rounded" height={280} />
              ) : applicationOutcomes.length > 0 ? (
                <Box className="chart-panel">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={applicationOutcomes}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                      <XAxis dataKey="name" stroke={tickFill} tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} stroke={tickFill} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                      <Bar dataKey="pending" name="Pending" stackId="a" fill={chartColors[3]} />
                      <Bar dataKey="reviewed" name="Reviewed" stackId="a" fill={chartColors[2]} />
                      <Bar dataKey="shortlisted" name="Shortlisted" stackId="a" fill={chartColors[4]} />
                      <Bar dataKey="accepted" name="Accepted" stackId="a" fill={chartColors[0]} />
                      <Bar dataKey="rejected" name="Rejected" stackId="a" fill={chartColors[1]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <EmptyState
                  compact
                  icon={<BarChartRounded fontSize="small" />}
                  title="No application pipeline metrics"
                  description="Application status distributions render once roles receive candidates."
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }} className="reveal-block reveal-delay-3">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Mentorship Activity
              </Typography>
              {loading ? (
                <Skeleton variant="rounded" height={280} />
              ) : mentorshipActivity.length > 0 ? (
                <Box className="chart-panel">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mentorshipActivity}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                      <XAxis dataKey="name" stroke={tickFill} tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} stroke={tickFill} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                      <Bar dataKey="received" name="Requests" fill={chartColors[2]} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="accepted" name="Accepted" fill={chartColors[0]} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="sessions" name="Sessions Completed" fill={chartColors[1]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <EmptyState
                  compact
                  icon={<BarChartRounded fontSize="small" />}
                  title="No mentorship activity yet"
                  description="Mentor pairings and completed sessions will appear here."
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }} className="reveal-block reveal-delay-3">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Events &amp; Attendance Summary
              </Typography>
              {loading ? (
                <Skeleton variant="rounded" height={280} />
              ) : eventStats.length > 0 ? (
                <Box className="chart-panel">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={eventStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                      <XAxis dataKey="name" stroke={tickFill} tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} stroke={tickFill} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                      <Bar dataKey="registered" name="Registered" fill={chartColors[2]} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="attended" name="Attended" fill={chartColors[0]} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="absent" name="Absent" fill={chartColors[1]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <EmptyState
                  compact
                  icon={<BarChartRounded fontSize="small" />}
                  title="No event attendance metrics"
                  description="RSVP and attendance totals populate as events run."
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }} className="reveal-block reveal-delay-3">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Member Community Engagement
              </Typography>
              {loading ? (
                <Skeleton variant="rounded" height={280} />
              ) : engagementTop.length > 0 ? (
                <Box className="chart-panel">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={engagementTop}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                      <XAxis dataKey="name" stroke={tickFill} tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} stroke={tickFill} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                      <Bar dataKey="posts" name="Posts" fill={chartColors[0]} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="comments" name="Comments" fill={chartColors[2]} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="connections" name="Connections" fill={chartColors[4]} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="sessions" name="Mentorships" fill={chartColors[1]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <EmptyState
                  compact
                  icon={<BarChartRounded fontSize="small" />}
                  title="No engagement logs yet"
                  description="Active member posts, comments, and connections appear here."
                />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
