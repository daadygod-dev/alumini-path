import { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { SearchRounded, VisibilityRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { createPreview, validateImage } from '../utils/fileValidation.js';
import {
  canConnectMembers,
  canManageDirectory,
  departments,
  getDefaultDirectoryRoleFilter,
  getOrganizationFieldLabel,
  getRoleFieldLabel,
  getRoleLabel,
  getYearFieldLabel,
  roleOptions,
  sectors,
  USER_ROLES,
} from '../data/platformConfig.js';
import '../styles/feature-pages.scss';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyForm = {
  fullName: '',
  email: '',
  password: '',
  role: USER_ROLES.alumni,
  department: '',
  graduationYear: '',
  currentRole: '',
  company: '',
  location: '',
  employmentSector: '',
  skills: '',
  educationHistory: '',
  jobHistory: '',
  posts: '',
  bio: '',
};

export default function AlumniPage({ members, currentUser, currentProfile, onAddMember, onToggleConnection }) {
  const activeRole = currentProfile?.role || currentUser.role;
  const canCreateMembers = canManageDirectory(activeRole);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(null);
  const [yearFilter, setYearFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState(() => getDefaultDirectoryRoleFilter(activeRole));
  const [viewTarget, setViewTarget] = useState(null);

  const yearLabel = useMemo(() => getYearFieldLabel(form.role), [form.role]);
  const roleFieldLabel = useMemo(() => getRoleFieldLabel(form.role), [form.role]);
  const organizationLabel = useMemo(() => getOrganizationFieldLabel(form.role), [form.role]);

  const filteredRows = useMemo(
    () =>
      members.filter((entry) => {
        const matchesYear = yearFilter ? String(entry.graduationYear).includes(yearFilter) : true;
        const matchesDepartment = departmentFilter ? entry.department === departmentFilter : true;
        const matchesRole = roleFilter ? entry.role === roleFilter : true;
        return matchesYear && matchesDepartment && matchesRole;
      }),
    [departmentFilter, members, roleFilter, yearFilter],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    const fileError = validateImage(file);

    if (fileError) {
      setErrors((prev) => ({ ...prev, avatar: fileError }));
      return;
    }

    try {
      const nextPreview = await createPreview(file);
      setErrors((prev) => ({ ...prev, avatar: '' }));
      setPreview(nextPreview);
    } catch {
      setErrors((prev) => ({ ...prev, avatar: 'Unable to load the selected profile photo.' }));
    }
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.fullName.trim()) nextErrors.fullName = 'Full name is required.';
    if (!emailPattern.test(form.email)) nextErrors.email = 'Enter a valid email address.';
    if (form.password.trim().length < 6) nextErrors.password = 'Password must be at least 6 characters.';
    if (!form.department) nextErrors.department = 'Department is required.';
    if (!/^\d{4}$/.test(form.graduationYear)) nextErrors.graduationYear = `${yearLabel} must be numeric.`;
    if (!form.currentRole.trim()) nextErrors.currentRole = `${roleFieldLabel} is required.`;
    if (!form.company.trim()) nextErrors.company = `${organizationLabel} is required.`;
    if (!form.employmentSector) nextErrors.employmentSector = 'Sector is required.';
    if (!form.skills.trim()) nextErrors.skills = 'Add at least one skill.';
    if (errors.avatar) nextErrors.avatar = errors.avatar;

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validateForm()) {
      toast.error('Resolve the member form validation issues first.');
      return;
    }

    const result = onAddMember({
      ...form,
      graduationYear: Number(form.graduationYear),
      mentorshipCount: 0,
      skills: form.skills.split(',').map((item) => item.trim()).filter(Boolean),
      educationHistory: form.educationHistory.split('\n').map((item) => item.trim()).filter(Boolean),
      jobHistory: form.jobHistory.split('\n').map((item) => item.trim()).filter(Boolean),
      posts: form.posts.split('\n').map((item) => item.trim()).filter(Boolean),
      connections: [],
      avatar: preview,
    });

    if (result && !result.ok) {
      toast.error(result.reason);
      return;
    }

    setForm(emptyForm);
    setErrors({});
    setPreview(null);
    toast.success('Community member added to the directory.');
  };

  const handleConnectionToggle = (targetId) => {
    const result = onToggleConnection(targetId);

    if (!result.ok) {
      toast.error(result.reason);
      return;
    }

    toast.success(
      result.connected ? `Connected with ${result.targetName}.` : `Connection removed with ${result.targetName}.`,
    );
  };

  const columns = [
    { field: 'fullName', headerName: 'Name', flex: 1.2, minWidth: 180 },
    {
      field: 'role',
      headerName: 'Role',
      width: 130,
      renderCell: ({ row }) => <Chip label={getRoleLabel(row.role)} size="small" />,
    },
    { field: 'department', headerName: 'Department', flex: 1, minWidth: 160 },
    { field: 'graduationYear', headerName: 'Year', width: 96, type: 'number' },
    { field: 'currentRole', headerName: 'Current role', flex: 1.1, minWidth: 180 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      renderCell: ({ row }) => {
        const connectable = row.id !== currentUser.id && canConnectMembers(activeRole, row.role);
        const isConnected = currentProfile?.connections?.includes(row.id);

        return (
          <Stack direction="row" spacing={1}>
            {connectable && (
              <Button size="small" variant={isConnected ? 'outlined' : 'contained'} onClick={() => handleConnectionToggle(row.id)}>
                {isConnected ? 'Connected' : 'Connect'}
              </Button>
            )}
            <IconButton color="primary" onClick={() => setViewTarget(row)}>
              <VisibilityRounded />
            </IconButton>
          </Stack>
        );
      },
    },
  ];

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Community Directory</Typography>
        <Typography variant="body1" color="text.secondary">
          Browse alumni, students, employees, and school leaders. Alumni and students can connect directly from this
          shared directory.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {canCreateMembers && (
          <Grid size={{ xs: 12, xl: 4 }}>
            <Card elevation={0} className="feature-card">
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Create member account
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Employees and school leaders can register new community members and assign the correct role.
                </Typography>

                <Box component="form" onSubmit={handleSubmit}>
                  <Grid container spacing={2}>
                    <Grid size={12}>
                      <TextField label="Full name" name="fullName" value={form.fullName} onChange={handleChange} error={Boolean(errors.fullName)} helperText={errors.fullName} fullWidth />
                    </Grid>
                    <Grid size={12}>
                      <TextField label="Email" name="email" type="email" value={form.email} onChange={handleChange} error={Boolean(errors.email)} helperText={errors.email} fullWidth />
                    </Grid>
                    <Grid size={12}>
                      <TextField label="Password" name="password" type="password" value={form.password} onChange={handleChange} error={Boolean(errors.password)} helperText={errors.password || 'Minimum 6 characters.'} fullWidth />
                    </Grid>
                    <Grid size={12}>
                      <TextField label="User role" name="role" select value={form.role} onChange={handleChange} fullWidth>
                        {roleOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField label="Department" name="department" select value={form.department} onChange={handleChange} error={Boolean(errors.department)} helperText={errors.department} fullWidth>
                        {departments.map((department) => (
                          <MenuItem key={department} value={department}>
                            {department}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField label={yearLabel} name="graduationYear" value={form.graduationYear} onChange={handleChange} error={Boolean(errors.graduationYear)} helperText={errors.graduationYear} fullWidth />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField label={roleFieldLabel} name="currentRole" value={form.currentRole} onChange={handleChange} error={Boolean(errors.currentRole)} helperText={errors.currentRole} fullWidth />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField label={organizationLabel} name="company" value={form.company} onChange={handleChange} error={Boolean(errors.company)} helperText={errors.company} fullWidth />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField label="Location" name="location" value={form.location} onChange={handleChange} fullWidth />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField label="Sector" name="employmentSector" select value={form.employmentSector} onChange={handleChange} error={Boolean(errors.employmentSector)} helperText={errors.employmentSector} fullWidth>
                        {sectors.map((sector) => (
                          <MenuItem key={sector} value={sector}>
                            {sector}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid size={12}>
                      <TextField label="Skills" name="skills" value={form.skills} onChange={handleChange} helperText={errors.skills || 'Separate multiple skills with commas.'} error={Boolean(errors.skills)} fullWidth />
                    </Grid>
                    <Grid size={12}>
                      <TextField label="Education history" name="educationHistory" value={form.educationHistory} onChange={handleChange} helperText="Use one line per education item." multiline minRows={2} fullWidth />
                    </Grid>
                    <Grid size={12}>
                      <TextField label="Experience history" name="jobHistory" value={form.jobHistory} onChange={handleChange} helperText="Use one line per experience item." multiline minRows={2} fullWidth />
                    </Grid>
                    <Grid size={12}>
                      <TextField label="Community posts" name="posts" value={form.posts} onChange={handleChange} helperText="Use one line per post." multiline minRows={2} fullWidth />
                    </Grid>
                    <Grid size={12}>
                      <TextField label="Bio" name="bio" value={form.bio} onChange={handleChange} multiline minRows={3} fullWidth />
                    </Grid>
                    <Grid size={12}>
                      <Button component="label" variant="outlined" fullWidth>
                        Upload profile photo
                        <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} />
                      </Button>
                      <Typography variant="caption" color={errors.avatar ? 'error' : 'text.secondary'}>
                        {errors.avatar || 'Accepted types: JPG, PNG, WEBP. Max size: 2MB.'}
                      </Typography>
                      {preview && (
                        <Box className="file-preview">
                          <Avatar src={preview.url} sx={{ width: 64, height: 64 }} />
                          <Box>
                            <Typography variant="body2">{preview.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {(preview.size / 1024).toFixed(1)} KB
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </Grid>
                    <Grid size={12}>
                      <Button type="submit" variant="contained" fullWidth size="large">
                        Create member
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid size={{ xs: 12, xl: canCreateMembers ? 8 : 12 }}>
          <Card elevation={0} className="feature-card">
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" sx={{ mb: 2.5 }}>
                <TextField
                  label="Filter by year"
                  value={yearFilter}
                  onChange={(event) => setYearFilter(event.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRounded fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ minWidth: 200 }}
                />
                <TextField
                  label="Filter by role"
                  select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  sx={{ minWidth: 180 }}
                >
                  <MenuItem value="">All roles</MenuItem>
                  {roleOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Filter by department"
                  select
                  value={departmentFilter}
                  onChange={(event) => setDepartmentFilter(event.target.value)}
                  sx={{ minWidth: 220 }}
                >
                  <MenuItem value="">All departments</MenuItem>
                  {departments.map((department) => (
                    <MenuItem key={department} value={department}>
                      {department}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              <Box className="grid-panel">
                <DataGrid
                  rows={filteredRows}
                  columns={columns}
                  pageSizeOptions={[5, 10]}
                  initialState={{ pagination: { paginationModel: { pageSize: 5, page: 0 } } }}
                  disableRowSelectionOnClick
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={Boolean(viewTarget)} onClose={() => setViewTarget(null)} maxWidth="md" fullWidth>
        <DialogTitle>Member details</DialogTitle>
        <DialogContent dividers>
          {viewTarget && (
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <Avatar src={viewTarget.avatar?.url} sx={{ width: 82, height: 82 }}>
                  {viewTarget.fullName.slice(0, 1)}
                </Avatar>
                <Box>
                  <Typography variant="h5">{viewTarget.fullName}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                    <Chip label={getRoleLabel(viewTarget.role)} size="small" />
                    <Chip label={viewTarget.department} size="small" variant="outlined" />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {viewTarget.currentRole} | {viewTarget.company}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {viewTarget.email} | {viewTarget.location || 'Location pending'}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap">
                {viewTarget.skills.map((skill) => (
                  <Chip key={skill} label={skill} />
                ))}
              </Stack>

              <Box>
                <Typography variant="subtitle2">Education history</Typography>
                {viewTarget.educationHistory.length ? (
                  viewTarget.educationHistory.map((item) => (
                    <Typography key={item} variant="body2" color="text.secondary">
                      - {item}
                    </Typography>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No education items submitted.
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle2">Experience history</Typography>
                {viewTarget.jobHistory.length ? (
                  viewTarget.jobHistory.map((item) => (
                    <Typography key={item} variant="body2" color="text.secondary">
                      - {item}
                    </Typography>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No prior experience listed.
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle2">Posts and engagement</Typography>
                {viewTarget.posts.length ? (
                  viewTarget.posts.map((item) => (
                    <Typography key={item} variant="body2" color="text.secondary">
                      - {item}
                    </Typography>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No community posts yet.
                  </Typography>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewTarget(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
