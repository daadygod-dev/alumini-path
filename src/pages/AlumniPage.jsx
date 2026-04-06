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
import '../styles/feature-pages.scss';

const departments = ['Information Technology', 'Computer Science', 'Business Information Systems', 'Networking'];
const sectors = ['Software', 'Analytics', 'Operations', 'Education', 'Finance'];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyForm = {
  fullName: '',
  email: '',
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

export default function AlumniPage({ alumni, onAddAlumni }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(null);
  const [yearFilter, setYearFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [viewTarget, setViewTarget] = useState(null);

  const filteredRows = useMemo(
    () =>
      alumni.filter((entry) => {
        const matchesYear = yearFilter ? String(entry.graduationYear).includes(yearFilter) : true;
        const matchesDepartment = departmentFilter ? entry.department === departmentFilter : true;
        return matchesYear && matchesDepartment;
      }),
    [alumni, departmentFilter, yearFilter],
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
    if (!form.department) nextErrors.department = 'Department is required.';
    if (!/^\d{4}$/.test(form.graduationYear)) nextErrors.graduationYear = 'Graduation year must be numeric.';
    if (!form.currentRole.trim()) nextErrors.currentRole = 'Current role is required.';
    if (!form.company.trim()) nextErrors.company = 'Current company is required.';
    if (!form.employmentSector) nextErrors.employmentSector = 'Employment sector is required.';
    if (!form.skills.trim()) nextErrors.skills = 'Add at least one skill.';
    if (errors.avatar) nextErrors.avatar = errors.avatar;

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validateForm()) {
      toast.error('Resolve the alumni form validation issues first.');
      return;
    }

    onAddAlumni({
      ...form,
      graduationYear: Number(form.graduationYear),
      mentorshipCount: 0,
      skills: form.skills.split(',').map((item) => item.trim()).filter(Boolean),
      educationHistory: form.educationHistory.split('\n').map((item) => item.trim()).filter(Boolean),
      jobHistory: form.jobHistory.split('\n').map((item) => item.trim()).filter(Boolean),
      posts: form.posts.split('\n').map((item) => item.trim()).filter(Boolean),
      avatar: preview,
    });

    setForm(emptyForm);
    setErrors({});
    setPreview(null);
    toast.success('Alumni profile added to the directory.');
  };

  const columns = [
    { field: 'fullName', headerName: 'Name', flex: 1.2, minWidth: 180 },
    { field: 'email', headerName: 'Email', flex: 1.3, minWidth: 220 },
    { field: 'department', headerName: 'Department', flex: 1, minWidth: 160 },
    { field: 'graduationYear', headerName: 'Grad Year', width: 110, type: 'number' },
    { field: 'currentRole', headerName: 'Current role', flex: 1.1, minWidth: 180 },
    {
      field: 'actions',
      headerName: 'View',
      width: 96,
      sortable: false,
      renderCell: ({ row }) => (
        <IconButton color="primary" onClick={() => setViewTarget(row)}>
          <VisibilityRounded />
        </IconButton>
      ),
    },
  ];

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Alumni Profile Module</Typography>
        <Typography variant="body1" color="text.secondary">
          Register alumni, validate records, preview profile photos, and manage the directory through DataGrid sorting,
          filtering, pagination, and view dialogs.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, xl: 4 }}>
          <Card elevation={0} className="feature-card">
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Create alumni account
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Alumni account details, education history, current job information, and skill sets are stored in
                localStorage.
              </Typography>

              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  <Grid size={12}>
                    <TextField label="Full name" name="fullName" value={form.fullName} onChange={handleChange} error={Boolean(errors.fullName)} helperText={errors.fullName} fullWidth />
                  </Grid>
                  <Grid size={12}>
                    <TextField label="Email" name="email" type="email" value={form.email} onChange={handleChange} error={Boolean(errors.email)} helperText={errors.email} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Department" name="department" select value={form.department} onChange={handleChange} error={Boolean(errors.department)} helperText={errors.department} fullWidth>
                      {departments.map((item) => (
                        <MenuItem key={item} value={item}>
                          {item}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Graduation year" name="graduationYear" value={form.graduationYear} onChange={handleChange} error={Boolean(errors.graduationYear)} helperText={errors.graduationYear} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Current role" name="currentRole" value={form.currentRole} onChange={handleChange} error={Boolean(errors.currentRole)} helperText={errors.currentRole} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Current company" name="company" value={form.company} onChange={handleChange} error={Boolean(errors.company)} helperText={errors.company} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Location" name="location" value={form.location} onChange={handleChange} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Employment sector" name="employmentSector" select value={form.employmentSector} onChange={handleChange} error={Boolean(errors.employmentSector)} helperText={errors.employmentSector} fullWidth>
                      {sectors.map((item) => (
                        <MenuItem key={item} value={item}>
                          {item}
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
                    <TextField label="Job history" name="jobHistory" value={form.jobHistory} onChange={handleChange} helperText="Use one line per role." multiline minRows={2} fullWidth />
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
                      Create account
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, xl: 8 }}>
          <Card elevation={0} className="feature-card">
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" sx={{ mb: 2.5 }}>
                <TextField
                  label="Filter by graduation year"
                  value={yearFilter}
                  onChange={(event) => setYearFilter(event.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRounded fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ minWidth: 220 }}
                />
                <TextField
                  label="Filter by department"
                  select
                  value={departmentFilter}
                  onChange={(event) => setDepartmentFilter(event.target.value)}
                  sx={{ minWidth: 220 }}
                >
                  <MenuItem value="">All departments</MenuItem>
                  {departments.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              <Box className="grid-panel">
                <DataGrid
                  rows={filteredRows}
                  columns={columns}
                  pageSizeOptions={[4]}
                  initialState={{ pagination: { paginationModel: { pageSize: 4, page: 0 } } }}
                  disableRowSelectionOnClick
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={Boolean(viewTarget)} onClose={() => setViewTarget(null)} maxWidth="md" fullWidth>
        <DialogTitle>Alumni profile details</DialogTitle>
        <DialogContent dividers>
          {viewTarget && (
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <Avatar src={viewTarget.avatar?.url} sx={{ width: 82, height: 82 }}>
                  {viewTarget.fullName.slice(0, 1)}
                </Avatar>
                <Box>
                  <Typography variant="h5">{viewTarget.fullName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {viewTarget.currentRole} at {viewTarget.company}
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
                <Typography variant="subtitle2">Job history</Typography>
                {viewTarget.jobHistory.length ? (
                  viewTarget.jobHistory.map((item) => (
                    <Typography key={item} variant="body2" color="text.secondary">
                      - {item}
                    </Typography>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No prior roles listed.
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
