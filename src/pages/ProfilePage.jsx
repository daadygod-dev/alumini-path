import { useState } from 'react';
import { Avatar, Box, Button, Card, CardContent, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';
import toast from 'react-hot-toast';
import { createPreview, validateImage } from '../utils/fileValidation.js';
import '../styles/feature-pages.scss';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ProfilePage({ currentProfile, onSaveProfile }) {
  const initialForm = {
    fullName: currentProfile?.fullName || '',
    email: currentProfile?.email || '',
    department: currentProfile?.department || '',
    graduationYear: String(currentProfile?.graduationYear || ''),
    currentRole: currentProfile?.currentRole || '',
    company: currentProfile?.company || '',
    location: currentProfile?.location || '',
    employmentSector: currentProfile?.employmentSector || '',
    skills: (currentProfile?.skills || []).join(', '),
    bio: currentProfile?.bio || '',
  };
  const [form, setForm] = useState({
    ...initialForm,
  });
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(currentProfile?.avatar || null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    const message = validateImage(file);

    if (message) {
      setErrors((prev) => ({ ...prev, avatar: message }));
      return;
    }

    try {
      const nextPreview = await createPreview(file);
      setPreview(nextPreview);
      setErrors((prev) => ({ ...prev, avatar: '' }));
    } catch {
      setErrors((prev) => ({ ...prev, avatar: 'Unable to load the selected profile photo.' }));
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!form.fullName.trim()) nextErrors.fullName = 'Full name is required.';
    if (!emailPattern.test(form.email)) nextErrors.email = 'Enter a valid email address.';
    if (!form.department) nextErrors.department = 'Department is required.';
    if (!/^\d{4}$/.test(form.graduationYear)) nextErrors.graduationYear = 'Graduation year must be numeric.';
    if (!form.currentRole.trim()) nextErrors.currentRole = 'Current role is required.';
    if (!form.company.trim()) nextErrors.company = 'Current company is required.';
    if (!form.skills.trim()) nextErrors.skills = 'At least one skill set is required.';
    if (errors.avatar) nextErrors.avatar = errors.avatar;

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      toast.error('Resolve the profile validation issues first.');
      return;
    }

    const result = onSaveProfile({
      ...currentProfile,
      ...form,
      graduationYear: Number(form.graduationYear),
      skills: form.skills.split(',').map((item) => item.trim()).filter(Boolean),
      avatar: preview,
    });

    if (!result.ok) {
      toast.error(result.reason);
      return;
    }

    toast.success('Profile information updated.');
  };

  if (!currentProfile) {
    return null;
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Edit Profile Information</Typography>
        <Typography variant="body1" color="text.secondary">
          Update your account details, current job information, and skill sets. Changes are stored in localStorage.
        </Typography>
      </Box>

      <Card elevation={0} className="feature-card">
        <CardContent>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Stack spacing={1.5} alignItems={{ xs: 'flex-start', md: 'center' }}>
                  <Avatar src={preview?.url} sx={{ width: 104, height: 104 }}>
                    {form.fullName.slice(0, 1)}
                  </Avatar>
                  <Button component="label" variant="outlined">
                    Upload profile photo
                    <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} />
                  </Button>
                  <Typography variant="caption" color={errors.avatar ? 'error' : 'text.secondary'}>
                    {errors.avatar || 'Accepted types: JPG, PNG, WEBP. Max size: 2MB.'}
                  </Typography>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Full name" name="fullName" value={form.fullName} onChange={handleChange} error={Boolean(errors.fullName)} helperText={errors.fullName} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Email" name="email" type="email" value={form.email} onChange={handleChange} error={Boolean(errors.email)} helperText={errors.email} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Department" name="department" value={form.department} onChange={handleChange} error={Boolean(errors.department)} helperText={errors.department} select fullWidth>
                      <MenuItem value="Information Technology">Information Technology</MenuItem>
                      <MenuItem value="Computer Science">Computer Science</MenuItem>
                      <MenuItem value="Business Information Systems">Business Information Systems</MenuItem>
                      <MenuItem value="Networking">Networking</MenuItem>
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
                    <TextField label="Employment sector" name="employmentSector" value={form.employmentSector} onChange={handleChange} fullWidth />
                  </Grid>
                  <Grid size={12}>
                    <TextField label="Skill sets" name="skills" value={form.skills} onChange={handleChange} error={Boolean(errors.skills)} helperText={errors.skills || 'Separate multiple skills with commas.'} fullWidth />
                  </Grid>
                  <Grid size={12}>
                    <TextField label="Bio" name="bio" value={form.bio} onChange={handleChange} multiline minRows={3} fullWidth />
                  </Grid>
                  <Grid size={12}>
                    <Button type="submit" variant="contained" size="large">
                      Save profile
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
