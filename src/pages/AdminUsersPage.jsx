import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  InputAdornment,
  MenuItem,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { AdminPanelSettingsRounded, HistoryRounded, RefreshRounded, SearchRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState.jsx';
import { apiRequest } from '../api/client.js';
import { ALL_USER_ROLES, getRoleLabel } from '../data/platformConfig.js';
import '../styles/feature-pages.scss';

const ACCOUNT_STATUSES = ['active', 'pending', 'suspended'];

export default function AdminUsersPage({ currentUser }) {
  const [tab, setTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = {};
      if (search.trim()) query.search = search.trim();
      if (statusFilter) query.status = statusFilter;
      if (roleFilter) query.role = roleFilter;

      const [usersData, logData] = await Promise.all([
        apiRequest('users', { query }),
        apiRequest('activity-log'),
      ]);

      setUsers(Array.isArray(usersData?.users) ? usersData.users : []);
      setLogs(Array.isArray(logData?.logs) ? logData.logs : []);
    } catch (err) {
      setError(err.message || 'Could not load administration workspace.');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search, statusFilter]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleStatusChange = async (userId, status) => {
    try {
      await apiRequest('user-status', {
        method: 'POST',
        query: { id: userId },
        body: { status },
      });
      toast.success(`Account status set to ${status}.`);
      await loadAdminData();
    } catch (err) {
      toast.error(err.message || 'Could not update user status.');
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await apiRequest('user-role', {
        method: 'POST',
        query: { id: userId },
        body: { role },
      });
      toast.success(`User role updated to ${getRoleLabel(role)}.`);
      await loadAdminData();
    } catch (err) {
      toast.error(err.message || 'Could not update user role.');
    }
  };

  const userColumns = [
    { field: 'full_name', headerName: 'Full Name', flex: 1.1, minWidth: 165 },
    { field: 'email', headerName: 'Email', flex: 1.2, minWidth: 190 },
    { field: 'reg_no', headerName: 'Reg No', width: 120, valueGetter: (val) => val || '—' },
    {
      field: 'role_code',
      headerName: 'Role',
      width: 175,
      renderCell: (params) => {
        const isSelf = Number(params.row.id) === Number(currentUser.id);
        return (
          <TextField
            select
            size="small"
            disabled={isSelf}
            value={params.row.role_code}
            onChange={(e) => handleRoleChange(params.row.id, e.target.value)}
            sx={{ minWidth: 150, my: 0.75 }}
          >
            {ALL_USER_ROLES.map((opt) => (
              <MenuItem key={opt.code} value={opt.code}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Account Status',
      width: 155,
      renderCell: (params) => {
        const isSelf = Number(params.row.id) === Number(currentUser.id);
        return (
          <TextField
            select
            size="small"
            disabled={isSelf}
            value={params.row.status}
            onChange={(e) => handleStatusChange(params.row.id, e.target.value)}
            sx={{ minWidth: 130, my: 0.75 }}
          >
            {ACCOUNT_STATUSES.map((st) => (
              <MenuItem key={st} value={st}>
                {st}
              </MenuItem>
            ))}
          </TextField>
        );
      },
    },
    {
      field: 'last_login_at',
      headerName: 'Last Login',
      width: 155,
      valueGetter: (val) => (val ? String(val).slice(0, 16) : 'Never'),
    },
  ];

  return (
    <Stack spacing={3}>
      <Box className="page-header reveal-block">
        <Box>
          <Typography variant="h4">Administration &amp; Audit</Typography>
          <Typography variant="body1" color="text.secondary" className="page-header__copy">
            Manage user account statuses, institutional role assignments, and inspect recent system activity logs.
          </Typography>
        </Box>
      </Box>

      {error ? (
        <Alert
          severity="error"
          action={
            <Button size="small" color="inherit" startIcon={<RefreshRounded />} onClick={loadAdminData}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      ) : null}

      <Card className="reveal-block reveal-delay-1">
        <Tabs
          value={tab}
          onChange={(_e, next) => setTab(next)}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`User Accounts (${users.length})`} />
          <Tab label={`Activity Audit Trail (${logs.length})`} />
        </Tabs>

        <CardContent>
          {tab === 0 && (
            <Stack spacing={2}>
              <Box className="filter-bar">
                <TextField
                  size="small"
                  placeholder="Search name, email, or reg no"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  sx={{ flex: '1 1 220px' }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchRounded fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <TextField
                  select
                  size="small"
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value="">All statuses</MenuItem>
                  {ACCOUNT_STATUSES.map((st) => (
                    <MenuItem key={st} value={st}>
                      {st}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Role"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  sx={{ minWidth: 165 }}
                >
                  <MenuItem value="">All roles</MenuItem>
                  {ALL_USER_ROLES.map((opt) => (
                    <MenuItem key={opt.code} value={opt.code}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              {loading ? (
                <Skeleton variant="rounded" height={340} />
              ) : users.length > 0 ? (
                <Box className="grid-panel">
                  <DataGrid
                    rows={users}
                    columns={userColumns}
                    disableRowSelectionOnClick
                    pageSizeOptions={[10, 20, 50]}
                    initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                    rowHeight={58}
                  />
                </Box>
              ) : (
                <EmptyState
                  icon={<AdminPanelSettingsRounded />}
                  title="No users found"
                  description="Try clearing your search or status filters."
                />
              )}
            </Stack>
          )}

          {tab === 1 && (
            loading ? (
              <Skeleton variant="rounded" height={280} />
            ) : logs.length > 0 ? (
              <Stack spacing={1.25}>
                {logs.map((entry) => (
                  <Box key={entry.id} className="history-item">
                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label={entry.action} size="small" color="primary" variant="outlined" />
                        <Typography variant="subtitle2" fontWeight={700}>
                          {entry.actor_name || 'System'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {entry.entity_type} {entry.entity_id ? `#${entry.entity_id}` : ''}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {entry.created_at} {entry.ip_address ? `· ${entry.ip_address}` : ''}
                      </Typography>
                    </Stack>
                    {entry.metadata ? (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        {typeof entry.metadata === 'string' ? entry.metadata : JSON.stringify(entry.metadata)}
                      </Typography>
                    ) : null}
                  </Box>
                ))}
              </Stack>
            ) : (
              <EmptyState
                compact
                icon={<HistoryRounded />}
                title="No activity logs recorded yet"
                description="Authentication, moderation, and administrative changes are logged here automatically."
              />
            )
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
