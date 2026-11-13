import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  CloseRounded,
  PeopleOutlineRounded,
  PersonAddRounded,
  RestartAltRounded,
  SearchRounded,
  VisibilityRounded,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState.jsx';
import { ProtectedAvatar } from '../components/ProtectedAsset.jsx';
import {
  canConnectMembers,
  canManageDirectory,
  getRoleLabel,
  USER_ROLES,
} from '../data/platformConfig.js';
import '../styles/feature-pages.scss';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyForm = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  role: 'alumni',
  department: '',
  programme: '',
  graduationYear: '',
  currentRole: '',
  company: '',
  location: '',
  sector: '',
  skills: '',
  educationHistory: '',
  jobHistory: '',
  posts: '',
  bio: '',
};

export default function AlumniPage({
  currentUser,
  members = [],
  lookups = { departments: [], programmes: [], sectors: [], roles: [] },
  connectionLookup = {},
  loading = false,
  onAddMember,
  onConnectMember,
  onFetchMemberDetail,
}) {
  const canCreateMembers = canManageDirectory(currentUser);
  const canConnect = canConnectMembers(currentUser);
  const departments = useMemo(() => lookups.departments || [], [lookups.departments]);
  const sectors = lookups.sectors || [];
  const roleOptions = lookups.roles?.length ? lookups.roles : USER_ROLES;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [connectingId, setConnectingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [programmeFilter, setProgrammeFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [viewTarget, setViewTarget] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const programmes = useMemo(() => {
    const list = lookups.programmes || [];
    if (!departmentFilter) {
      return list;
    }
    const selectedDept = departments.find((d) => d.name === departmentFilter);
    if (!selectedDept) {
      return list;
    }
    const filtered = list.filter((p) => Number(p.department_id) === Number(selectedDept.id));
    return filtered.length ? filtered : list;
  }, [departmentFilter, departments, lookups.programmes]);

  const availableProgrammes = useMemo(() => {
    const selectedDept = departments.find((d) => d.name === form.department);
    const list = lookups.programmes || [];
    if (!selectedDept) {
      return list;
    }
    const filtered = list.filter((p) => Number(p.department_id) === Number(selectedDept.id));
    return filtered.length ? filtered : list;
  }, [departments, form.department, lookups.programmes]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const skillNeedle = skillFilter.trim().toLowerCase();

    return members.filter((entry) => {
      const matchesQuery = query
        ? entry.fullName.toLowerCase().includes(query) ||
          entry.company.toLowerCase().includes(query) ||
          entry.currentRole.toLowerCase().includes(query) ||
          entry.skills.some((skill) => skill.toLowerCase().includes(query))
        : true;
      const matchesYear = yearFilter ? String(entry.graduationYear).includes(yearFilter.trim()) : true;
      const matchesDepartment = departmentFilter ? entry.department === departmentFilter : true;
      const matchesProgramme = programmeFilter ? entry.programme === programmeFilter : true;
      const matchesSector = sectorFilter ? entry.sector === sectorFilter : true;
      const matchesSkill = skillNeedle
        ? entry.skills.some((skill) => skill.toLowerCase().includes(skillNeedle))
        : true;
      const matchesRole = roleFilter ? entry.role === roleFilter : true;
      return (
        matchesQuery &&
        matchesYear &&
        matchesDepartment &&
        matchesProgramme &&
        matchesSector &&
        matchesSkill &&
        matchesRole
      );
    });
  }, [
    departmentFilter,
    members,
    programmeFilter,
    roleFilter,
    searchQuery,
    sectorFilter,
    skillFilter,
    yearFilter,
  ]);

  const hasActiveFilters = Boolean(
    searchQuery ||
      yearFilter ||
      departmentFilter ||
      programmeFilter ||
      sectorFilter ||
      skillFilter ||
      roleFilter,
  );

  const resetFilters = () => {
    setSearchQuery('');
    setYearFilter('');
    setDepartmentFilter('');
    setProgrammeFilter('');
    setSectorFilter('');
    setSkillFilter('');
    setRoleFilter('');
  };

  const openMemberDetail = async (row) => {
    setViewTarget(row);
    if (!onFetchMemberDetail) {
      return;
    }
    setDetailLoading(true);
    try {
      const detail = await onFetchMemberDetail(row.id);
      if (detail?.member) {
        setViewTarget({ ...detail.member, detailConnection: detail.connection });
      }
    } catch {
      // Keep summary row visible even if detail refresh fails.
    } finally {
      setDetailLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => {
      if (name === 'department') {
        return { ...prev, department: value, programme: '' };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleConnect = async (memberId) => {
    setConnectingId(memberId);
    const result = await onConnectMember(memberId);
    setConnectingId(null);

    if (!result.ok) {
      toast.error(result.reason || 'Could not send connection request.');
      return;
    }

    toast.success('Connection request sent.');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!form.fullName.trim()) nextErrors.fullName = 'Full name is required.';
    if (!emailPattern.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (form.password.length < 8) {
      nextErrors.password = 'At least 8 characters with uppercase, lowercase, and a number or symbol.';
    }
    if (!/^\d{4}$/.test(form.graduationYear.trim())) nextErrors.graduationYear = 'Must be a 4-digit year.';
    if (!form.department) nextErrors.department = 'Department is required.';
    if (!form.currentRole.trim()) nextErrors.currentRole = 'Current role is required.';
    if (!form.company.trim()) nextErrors.company = 'Organization is required.';

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      toast.error('Please fix the highlighted fields.');
      return;
    }

    setSubmitting(true);
    const result = await onAddMember({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.password,
      role: form.role,
      department: form.department,
      programme: form.programme,
      graduationYear: Number(form.graduationYear),
      currentRole: form.currentRole.trim(),
      company: form.company.trim(),
      location: form.location.trim(),
      sector: form.sector,
      skills: form.skills,
      educationHistory: form.educationHistory,
      jobHistory: form.jobHistory,
      posts: form.posts,
      bio: form.bio.trim(),
    });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.reason || 'Could not add member.');
      return;
    }

    setForm(emptyForm);
    setErrors({});
    setDrawerOpen(false);
    toast.success('Member added to the directory.');
  };

  const renderConnectionBadgeOrAction = (memberId) => {
    if (memberId === currentUser.id) {
      return <Chip label="You" size="small" variant="outlined" />;
    }

    const conn = connectionLookup[memberId];
    if (conn?.status === 'accepted') {
      return <Chip label="Connected" size="small" color="success" variant="outlined" />;
    }
    if (conn?.status === 'pending') {
      return <Chip label="Pending" size="small" color="warning" variant="outlined" />;
    }

    if (!canConnect) {
      return null;
    }

    return (
      <Button
        size="small"
        variant="outlined"
        disabled={connectingId === memberId}
        onClick={() => handleConnect(memberId)}
      >
        {connectingId === memberId ? '...' : 'Connect'}
      </Button>
    );
  };

  const columns = [
    {
      field: 'fullName',
      headerName: 'Member',
      flex: 1.35,
      minWidth: 210,
      renderCell: (params) => (
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ height: '100%' }}>
          <ProtectedAvatar src={params.row.avatarUrl} sx={{ width: 32, height: 32, fontSize: '0.8rem' }}>
            {params.row.fullName?.slice(0, 1)}
          </ProtectedAvatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {params.row.fullName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {params.row.email}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 120,
      renderCell: (params) => (
        <Chip label={getRoleLabel(params.value)} size="small" variant="outlined" />
      ),
    },
    { field: 'graduationYear', headerName: 'Cohort', width: 92 },
    { field: 'department', headerName: 'Department', flex: 0.9, minWidth: 145 },
    {
      field: 'currentRole',
      headerName: 'Current position',
      flex: 1.25,
      minWidth: 195,
      valueGetter: (_value, row) =>
        [row.currentRole, row.company].filter(Boolean).join(' · ') || '—',
    },
    {
      field: 'skills',
      headerName: 'Skills',
      flex: 1.05,
      minWidth: 165,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ height: '100%', overflow: 'hidden' }}>
          {(params.value || []).slice(0, 2).map((skill) => (
            <Chip key={skill} label={skill} size="small" />
          ))}
          {(params.value || []).length > 2 ? (
            <Typography variant="caption" color="text.secondary">
              +{params.value.length - 2}
            </Typography>
          ) : null}
        </Stack>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: canConnect ? 185 : 95,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ height: '100%' }}>
          <Tooltip title="View profile">
            <IconButton size="small" onClick={() => openMemberDetail(params.row)} aria-label="View profile">
              <VisibilityRounded fontSize="small" />
            </IconButton>
          </Tooltip>
          {renderConnectionBadgeOrAction(params.row.id)}
        </Stack>
      ),
    },
  ];

  return (
    <Stack spacing={3}>
      <Box className="page-header reveal-block">
        <Box>
          <Typography variant="h4">Community Directory</Typography>
          <Typography variant="body1" color="text.secondary" className="page-header__copy">
            Search verified graduates, students, and faculty across cohorts, departments, and technical skills.
          </Typography>
        </Box>

        {canCreateMembers ? (
          <Button
            variant="contained"
            startIcon={<PersonAddRounded />}
            onClick={() => setDrawerOpen(true)}
          >
            Add member
          </Button>
        ) : null}
      </Box>

      <Card className="reveal-block reveal-delay-1">
        <CardContent>
          <Box className="filter-bar">
            <TextField
              size="small"
              placeholder="Search name, role, organization, or skill"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              sx={{ flex: '1 1 240px' }}
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
              size="small"
              label="Cohort year"
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              sx={{ width: 130 }}
            />
            <TextField
              size="small"
              select
              label="Department"
              value={departmentFilter}
              onChange={(event) => {
                setDepartmentFilter(event.target.value);
                setProgrammeFilter('');
              }}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">All departments</MenuItem>
              {departments.map((department) => (
                <MenuItem key={department.id} value={department.name}>
                  {department.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              select
              label="Programme"
              value={programmeFilter}
              onChange={(event) => setProgrammeFilter(event.target.value)}
              sx={{ minWidth: 185 }}
            >
              <MenuItem value="">All programmes</MenuItem>
              {programmes.map((prog) => (
                <MenuItem key={prog.id} value={prog.name}>
                  {prog.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              select
              label="Sector"
              value={sectorFilter}
              onChange={(event) => setSectorFilter(event.target.value)}
              sx={{ minWidth: 165 }}
            >
              <MenuItem value="">All sectors</MenuItem>
              {sectors.map((sector) => (
                <MenuItem key={sector.id} value={sector.name}>
                  {sector.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Skill"
              placeholder="e.g. React, SQL"
              value={skillFilter}
              onChange={(event) => setSkillFilter(event.target.value)}
              sx={{ width: 150 }}
            />
            <TextField
              size="small"
              select
              label="Role"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="">All roles</MenuItem>
              {roleOptions.map((option) => (
                <MenuItem key={option.code} value={option.code}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            {hasActiveFilters ? (
              <Button size="small" color="inherit" startIcon={<RestartAltRounded />} onClick={resetFilters}>
                Reset
              </Button>
            ) : null}
          </Box>
        </CardContent>
      </Card>

      <Card className="reveal-block reveal-delay-2">
        <CardContent>
          {loading ? (
            <Stack spacing={1.25}>
              {[1, 2, 3, 4, 5].map((idx) => (
                <Skeleton key={idx} variant="rounded" height={52} />
              ))}
            </Stack>
          ) : filteredRows.length > 0 ? (
            <Box className="grid-panel">
              <DataGrid
                rows={filteredRows}
                columns={columns}
                disableRowSelectionOnClick
                pageSizeOptions={[8, 15, 25]}
                initialState={{ pagination: { paginationModel: { pageSize: 8, page: 0 } } }}
                rowHeight={56}
              />
            </Box>
          ) : (
            <EmptyState
              icon={<PeopleOutlineRounded />}
              title={members.length === 0 ? 'No directory members yet' : 'No matching profiles found'}
              description={
                members.length === 0
                  ? 'Registered community members will appear here once accounts are added to the database.'
                  : 'Try clearing or broadening your search query, cohort year, or department filter.'
              }
              actionLabel={hasActiveFilters ? 'Clear filters' : ''}
              onAction={hasActiveFilters ? resetFilters : null}
            />
          )}
        </CardContent>
      </Card>

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box className="drawer-form">
          <Box className="drawer-form__header">
            <Box>
              <Typography variant="h6">Add directory member</Typography>
              <Typography variant="body2" color="text.secondary">
                Create a new profile directly in the community database.
              </Typography>
            </Box>
            <IconButton onClick={() => setDrawerOpen(false)} aria-label="Close">
              <CloseRounded />
            </IconButton>
          </Box>

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Full name"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    error={Boolean(errors.fullName)}
                    helperText={errors.fullName}
                    size="small"
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Email address"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    error={Boolean(errors.email)}
                    helperText={errors.email}
                    size="small"
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Temporary password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    error={Boolean(errors.password)}
                    helperText={errors.password || '8+ chars with upper, lower, and a digit or symbol'}
                    size="small"
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Telephone"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    size="small"
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Role"
                    name="role"
                    select
                    value={form.role}
                    onChange={handleChange}
                    size="small"
                    fullWidth
                  >
                    {roleOptions.map((option) => (
                      <MenuItem key={option.code} value={option.code}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Cohort / graduation year"
                    name="graduationYear"
                    value={form.graduationYear}
                    onChange={handleChange}
                    error={Boolean(errors.graduationYear)}
                    helperText={errors.graduationYear}
                    size="small"
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Department"
                    name="department"
                    select
                    value={form.department}
                    onChange={handleChange}
                    error={Boolean(errors.department)}
                    helperText={errors.department}
                    size="small"
                    fullWidth
                    required
                  >
                    {departments.map((department) => (
                      <MenuItem key={department.id} value={department.name}>
                        {department.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Programme"
                    name="programme"
                    select
                    value={form.programme}
                    onChange={handleChange}
                    size="small"
                    fullWidth
                  >
                    {availableProgrammes.map((programme) => (
                      <MenuItem key={programme.id} value={programme.name}>
                        {programme.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Current role / track"
                    name="currentRole"
                    value={form.currentRole}
                    onChange={handleChange}
                    error={Boolean(errors.currentRole)}
                    helperText={errors.currentRole}
                    size="small"
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Organization"
                    name="company"
                    value={form.company}
                    onChange={handleChange}
                    error={Boolean(errors.company)}
                    helperText={errors.company}
                    size="small"
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Location"
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    size="small"
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Sector"
                    name="sector"
                    select
                    value={form.sector}
                    onChange={handleChange}
                    size="small"
                    fullWidth
                  >
                    {sectors.map((sector) => (
                      <MenuItem key={sector.id} value={sector.name}>
                        {sector.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>

              <TextField
                label="Skills (comma-separated)"
                name="skills"
                value={form.skills}
                onChange={handleChange}
                size="small"
                fullWidth
              />
              <TextField
                label="Education history (one per line)"
                name="educationHistory"
                value={form.educationHistory}
                onChange={handleChange}
                multiline
                minRows={2}
                size="small"
                fullWidth
              />
              <TextField
                label="Experience history (one per line)"
                name="jobHistory"
                value={form.jobHistory}
                onChange={handleChange}
                multiline
                minRows={2}
                size="small"
                fullWidth
              />
              <TextField
                label="Short bio"
                name="bio"
                value={form.bio}
                onChange={handleChange}
                multiline
                minRows={2}
                size="small"
                fullWidth
              />

              <Stack direction="row" spacing={1.25} justifyContent="flex-end" sx={{ pt: 1 }}>
                <Button variant="outlined" color="inherit" onClick={() => setDrawerOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save member'}
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Box>
      </Drawer>

      <Dialog open={Boolean(viewTarget)} onClose={() => setViewTarget(null)} maxWidth="sm" fullWidth>
        {viewTarget ? (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                  <ProtectedAvatar src={viewTarget.avatarUrl} sx={{ width: 46, height: 46 }}>
                    {viewTarget.fullName?.slice(0, 1)}
                  </ProtectedAvatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6">{viewTarget.fullName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {[viewTarget.currentRole, viewTarget.company].filter(Boolean).join(' · ') ||
                        getRoleLabel(viewTarget.role)}
                    </Typography>
                  </Box>
                </Stack>
                <Chip label={getRoleLabel(viewTarget.role)} size="small" color="primary" variant="outlined" />
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              {detailLoading ? (
                <Stack spacing={1.5}>
                  <Skeleton variant="rounded" height={60} />
                  <Skeleton variant="rounded" height={90} />
                </Stack>
              ) : (
                <Stack spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    {viewTarget.bio || 'No biography added yet.'}
                  </Typography>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {viewTarget.department ? <Chip label={viewTarget.department} size="small" /> : null}
                    {viewTarget.graduationYear ? (
                      <Chip label={`Cohort ${viewTarget.graduationYear}`} size="small" variant="outlined" />
                    ) : null}
                    {viewTarget.location ? <Chip label={viewTarget.location} size="small" variant="outlined" /> : null}
                    {viewTarget.sector ? <Chip label={viewTarget.sector} size="small" variant="outlined" /> : null}
                  </Stack>

                  <Divider />

                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                      Skills
                    </Typography>
                    {viewTarget.skills?.length ? (
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        {viewTarget.skills.map((skill) => (
                          <Chip key={skill} label={skill} size="small" />
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No skills listed yet.
                      </Typography>
                    )}
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                      Education History
                    </Typography>
                    {viewTarget.educationHistory?.length ? (
                      <Box className="history-list">
                        {viewTarget.educationHistory.map((item, idx) => (
                          <Box key={`${item}-${idx}`} className="history-item">
                            {item}
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No education records published yet.
                      </Typography>
                    )}
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                      Career & Experience
                    </Typography>
                    {viewTarget.jobHistory?.length ? (
                      <Box className="history-list">
                        {viewTarget.jobHistory.map((item, idx) => (
                          <Box key={`${item}-${idx}`} className="history-item">
                            {item}
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No work history entries published yet.
                      </Typography>
                    )}
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                      Recent Updates
                    </Typography>
                    {viewTarget.posts?.length ? (
                      <Stack spacing={0.75}>
                        {viewTarget.posts.map((post, idx) => (
                          <Box key={`${post}-${idx}`} className="history-item">
                            {post}
                          </Box>
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No recent updates published.
                      </Typography>
                    )}
                  </Box>
                </Stack>
              )}
            </DialogContent>
            <DialogActions>
              {renderConnectionBadgeOrAction(viewTarget.id)}
              <Button onClick={() => setViewTarget(null)}>Close</Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>
    </Stack>
  );
}
