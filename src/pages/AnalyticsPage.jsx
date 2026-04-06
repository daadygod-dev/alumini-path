import { Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
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
import '../styles/feature-pages.scss';

const chartColors = ['#0f766e', '#c2410c', '#2563eb', '#a855f7', '#059669'];

export default function AnalyticsPage({ alumni, jobs }) {
  const sectorData = Object.entries(
    alumni.reduce((acc, entry) => {
      acc[entry.employmentSector] = (acc[entry.employmentSector] || 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const jobTrend = Object.entries(
    jobs.reduce((acc, job) => {
      const month = new Date(job.postedDate).toLocaleString('en-US', { month: 'short' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {}),
  ).map(([month, jobsPosted]) => ({ month, jobsPosted }));

  const mentorshipData = alumni.map((entry) => ({
    alumni: entry.fullName.split(' ')[0],
    mentorships: entry.mentorshipCount,
    posts: entry.posts.length,
  }));

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Engagement Analytics</Typography>
        <Typography variant="body1" color="text.secondary">
          Recharts visualizations for employment sectors, job-posting trends, and mentoring activity across the alumni
          network.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card elevation={0} className="feature-card">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Alumni employment sectors
              </Typography>
              <Box className="chart-panel">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sectorData} dataKey="value" nameKey="name" outerRadius={120} innerRadius={70} paddingAngle={4}>
                      {sectorData.map((entry, index) => (
                        <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Card elevation={0} className="feature-card">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Job posting trends
              </Typography>
              <Box className="chart-panel">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={jobTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="jobsPosted" fill="#c2410c" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={12}>
          <Card elevation={0} className="feature-card">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Mentoring and engagement activity
              </Typography>
              <Box className="chart-panel chart-panel--wide">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mentorshipData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="alumni" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="mentorships" stroke="#0f766e" strokeWidth={3} />
                    <Line type="monotone" dataKey="posts" stroke="#2563eb" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
