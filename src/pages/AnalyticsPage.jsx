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
import { getRoleLabel, roleOptions } from '../data/platformConfig.js';
import '../styles/feature-pages.scss';

const chartColors = ['#0f766e', '#c2410c', '#2563eb', '#a855f7', '#059669'];

export default function AnalyticsPage({ members, jobs }) {
  const roleDistribution = roleOptions.map((option) => ({
    name: option.label,
    value: members.filter((entry) => entry.role === option.value).length,
  }));

  const sectorData = Object.entries(
    members.reduce((acc, entry) => {
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

  const connectionActivity = members.map((entry) => ({
    member: entry.fullName.split(' ')[0],
    connections: entry.connections.length,
    mentorships: entry.mentorshipCount,
  }));

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Community Analytics</Typography>
        <Typography variant="body1" color="text.secondary">
          Leadership and employee analytics for role distribution, sector coverage, and alumni-student connection
          activity.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card elevation={0} className="feature-card">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Community role mix
              </Typography>
              <Box className="chart-panel">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={roleDistribution} dataKey="value" nameKey="name" outerRadius={120} innerRadius={70} paddingAngle={4}>
                      {roleDistribution.map((entry, index) => (
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
                Employment and placement sectors
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
                Opportunity posting trend
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

        <Grid size={{ xs: 12, lg: 6 }}>
          <Card elevation={0} className="feature-card">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Connection and mentorship activity
              </Typography>
              <Box className="chart-panel">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={connectionActivity}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="member" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="connections" stroke="#0f766e" strokeWidth={3} />
                    <Line type="monotone" dataKey="mentorships" stroke="#2563eb" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card elevation={0} className="feature-card">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Role summary
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {roleOptions.map((option) => (
              <Typography key={option.value} variant="body2" color="text.secondary">
                {getRoleLabel(option.value)}: {members.filter((entry) => entry.role === option.value).length}
              </Typography>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
