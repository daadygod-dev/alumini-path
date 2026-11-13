import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { LockResetRounded, PhotoCameraRounded, PostAddRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState.jsx';
import { ProtectedAvatar } from '../components/ProtectedAsset.jsx';
import { apiRequest } from '../api/client.js';
import { createPreview, validateImage } from '../utils/fileValidation.js';
import { canEditProfile, getRoleLabel } from '../data/platformConfig.js';
import '../styles/feature-pages.scss';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildInitialForm(src) {
  return {
    fullName: src?.fullName || '',
    email: src?.email || '',
    phone: src?.phone || '',
    regNo: src?.regNo || '',
    department: src?.department || '',
    programme: src?.programme || '',
    graduationYear: src?.graduationYear ? String(src.graduationYear) : '',
    currentRole: src?.currentRole || '',
    company: src?.company || '',
    location: src?.location || '',
    sector: src?.sector || '',
    skills: (src?.skills || []).join(', '),
    bio: src?.bio || '',
  };
}

function ProfileEditor({
  src,
  editable,
  lookups,
  onSaveProfile,
  onAddPost,
  onChangePassword,
}) {
  const departments = useMemo(() => lookups.departments || [], [lookups.departments]);
  const sectors = lookups.sectors || [];

  const [form, setForm] = useState(() => buildInitialForm(src));
  const [errors, setErrors] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(() => src?.avatarUrl || '');
  const [saving, setSaving] = useState(false);

  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);

  const availableProgrammes = useMemo(() => {
    const selectedDept = departments.find((d) => d.name === form.department);
    const list = lookups.programmes || [];
    if (!selectedDept) {
      return list;
    }
    const filtered = list.filter((p) => Number(p.department_id) === Number(selectedDept.id));
    return filtered.length ? filtered : list;
  }, [departments, form.department, lookups.programmes]);

  const parsedSkills = useMemo(
    () => form.skills.split(',').map((item) => item.trim()).filter(Boolean),
    [form.skills],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => {
      if (name === 'department') {
        return { ...prev, department: value, programme: '' };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const message = validateImage(file);
    if (message) {
      setErrors((prev) => ({ ...prev, avatar: message }));
      return;
    }

    try {
      const preview = await createPreview(file);
      setAvatarFile(file);
      setAvatarPreviewUrl(preview.url);
      setErrors((prev) => ({ ...prev, avatar: '' }));
    } catch {
      setErrors((prev) => ({ ...prev, avatar: 'Unable to load the selected profile photo.' }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!form.fullName.trim()) nextErrors.fullName = 'Full name is required.';
    if (!emailPattern.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (!/^\d{4}$/.test(form.graduationYear.trim())) nextErrors.graduationYear = 'Must be a 4-digit year.';
    if (!form.currentRole.trim()) nextErrors.currentRole = 'Current role is required.';
    if (!form.company.trim()) nextErrors.company = 'Organization is required.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      toast.error('Please fix the highlighted profile fields.');
      return;
    }

    setSaving(true);
    const result = await onSaveProfile({
      ...form,
      graduationYear: Number(form.graduationYear),
      skills: parsedSkills,
      avatarFile,
    });
    setSaving(false);

    if (!result.ok) {
      toast.error(result.reason || 'Could not update profile.');
      return;
    }

    setAvatarFile(null);
    toast.success('Profile updated.');
  };

  const handlePublishPost = async (event) => {
    event.preventDefault();
    if (!newPost.trim()) {
      return;
    }

    setPosting(true);
    const result = await onAddPost(newPost.trim());
    setPosting(false);

    if (!result.ok) {
      toast.error(result.reason || 'Could not publish post.');
      return;
    }

    setNewPost('');
    toast.success('Update shared.');
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (!passwordForm.currentPassword) {
      toast.error('Enter your current password.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters with uppercase, lowercase, and a number or symbol.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      if (onChangePassword) {
        const res = await onChangePassword({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        });
        if (!res.ok) {
          toast.error(res.reason || 'Could not update password.');
          return;
        }
      } else {
        await apiRequest('change-password', {
          method: 'POST',
          body: {
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
          },
        });
      }
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password updated cleanly.');
    } catch (error) {
      toast.error(error.message || 'Could not update password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const activeRole = src?.role;
  const profilePosts = src?.posts || [];

  return (
    <Grid container spacing={2.5} alignItems="stretch">
      <Grid size={{ xs: 12, lg: 7 }}>
        <Card sx={{ height: '100%' }} className="reveal-block reveal-delay-1">
          <CardContent>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.25}>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                  <ProtectedAvatar src={avatarPreviewUrl} sx={{ width: 64, height: 64, fontSize: '1.35rem' }}>
                    {form.fullName?.slice(0, 1)}
                  </ProtectedAvatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {form.fullName || 'Member'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
                      {getRoleLabel(activeRole)}
                    </Typography>
                    {editable ? (
                      <Button
                        variant="outlined"
                        component="label"
                        size="small"
                        startIcon={<PhotoCameraRounded />}
                      >
                        Upload photo
                        <input type="file" hidden accept=".png,.jpg,.jpeg,.webp" onChange={handleImageChange} />
                      </Button>
                    ) : null}
                    {errors.avatar ? (
                      <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
                        {errors.avatar}
                      </Typography>
                    ) : null}
                  </Box>
                </Stack>

                <Divider />

                <Grid container spacing={1.75}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Full name"
                      name="fullName"
                      value={form.fullName}
                      onChange={handleChange}
                      disabled={!editable}
                      error={Boolean(errors.fullName)}
                      helperText={errors.fullName}
                      size="small"
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Email address"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      disabled={!editable}
                      error={Boolean(errors.email)}
                      helperText={errors.email}
                      size="small"
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Telephone"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      disabled={!editable}
                      size="small"
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Registration number"
                      name="regNo"
                      value={form.regNo}
                      onChange={handleChange}
                      disabled={!editable}
                      size="small"
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Department"
                      name="department"
                      select
                      value={form.department}
                      onChange={handleChange}
                      disabled={!editable}
                      size="small"
                      fullWidth
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
                      disabled={!editable}
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
                      label="Cohort / graduation year"
                      name="graduationYear"
                      value={form.graduationYear}
                      onChange={handleChange}
                      disabled={!editable}
                      error={Boolean(errors.graduationYear)}
                      helperText={errors.graduationYear}
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
                      disabled={!editable}
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
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Current role / track"
                      name="currentRole"
                      value={form.currentRole}
                      onChange={handleChange}
                      disabled={!editable}
                      error={Boolean(errors.currentRole)}
                      helperText={errors.currentRole}
                      size="small"
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Organization"
                      name="company"
                      value={form.company}
                      onChange={handleChange}
                      disabled={!editable}
                      error={Boolean(errors.company)}
                      helperText={errors.company}
                      size="small"
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Location"
                      name="location"
                      value={form.location}
                      onChange={handleChange}
                      disabled={!editable}
                      size="small"
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Skills (comma-separated)"
                      name="skills"
                      value={form.skills}
                      onChange={handleChange}
                      disabled={!editable}
                      size="small"
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Short bio"
                      name="bio"
                      value={form.bio}
                      onChange={handleChange}
                      disabled={!editable}
                      multiline
                      minRows={3}
                      size="small"
                      fullWidth
                    />
                  </Grid>
                </Grid>

                {editable ? (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button type="submit" variant="contained" disabled={saving}>
                      {saving ? 'Saving...' : 'Save changes'}
                    </Button>
                  </Box>
                ) : null}
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <Stack spacing={2.5} sx={{ height: '100%' }}>
          <Card className="reveal-block reveal-delay-2">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Skill summary
              </Typography>
              {parsedSkills.length > 0 ? (
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {parsedSkills.map((skill) => (
                    <Chip key={skill} label={skill} size="small" />
                  ))}
                </Stack>
              ) : (
                <EmptyState
                  compact
                  title="No skills added"
                  description="Add comma-separated skills on the left to appear in directory searches."
                />
              )}
            </CardContent>
          </Card>

          <Card sx={{ flex: 1 }} className="reveal-block reveal-delay-3">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1.25 }}>
                Recent community updates
              </Typography>

              <Box component="form" onSubmit={handlePublishPost} sx={{ mb: 2 }}>
                <Stack spacing={1.25}>
                  <TextField
                    size="small"
                    multiline
                    minRows={2}
                    placeholder="Share a milestone, mentorship availability, or career tip..."
                    value={newPost}
                    onChange={(event) => setNewPost(event.target.value)}
                    fullWidth
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      type="submit"
                      size="small"
                      variant="outlined"
                      disabled={posting || !newPost.trim()}
                      startIcon={<PostAddRounded />}
                    >
                      {posting ? 'Posting...' : 'Share update'}
                    </Button>
                  </Box>
                </Stack>
              </Box>

              {profilePosts.length > 0 ? (
                <Stack spacing={1}>
                  {profilePosts.map((post, idx) => (
                    <Box key={`${post}-${idx}`} className="history-item">
                      {post}
                    </Box>
                  ))}
                </Stack>
              ) : (
                <EmptyState
                  compact
                  title="No updates posted yet"
                  description="Your shared career announcements and notes will appear here."
                />
              )}
            </CardContent>
          </Card>

          <Card className="reveal-block reveal-delay-3">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 0.5 }}>
                Password &amp; Security
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Update your account password. Use 8+ characters mixing uppercase, lowercase, and numbers or symbols.
              </Typography>
              <Box component="form" onSubmit={handlePasswordSubmit}>
                <Stack spacing={1.5}>
                  <TextField
                    label="Current password"
                    type="password"
                    size="small"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                    }
                    fullWidth
                    required
                  />
                  <Grid container spacing={1.25}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="New password"
                        type="password"
                        size="small"
                        value={passwordForm.newPassword}
                        onChange={(event) =>
                          setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                        }
                        fullWidth
                        required
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Confirm new password"
                        type="password"
                        size="small"
                        value={passwordForm.confirmPassword}
                        onChange={(event) =>
                          setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                        }
                        fullWidth
                        required
                      />
                    </Grid>
                  </Grid>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      type="submit"
                      size="small"
                      variant="outlined"
                      disabled={passwordSaving}
                      startIcon={<LockResetRounded />}
                    >
                      {passwordSaving ? 'Updating...' : 'Change password'}
                    </Button>
                  </Box>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Stack>
      </Grid>
    </Grid>
  );
}

export default function ProfilePage({
  currentUser,
  currentProfile,
  lookups = { departments: [], programmes: [], sectors: [] },
  onSaveProfile,
  onAddPost,
  onChangePassword,
}) {
  const editable = canEditProfile(currentUser);
  const src = currentProfile || currentUser;
  const activeRole = src?.role;
  const editorKey = `${src?.id || 'anon'}-${src?.email || ''}-${(src?.skills || []).length}-${(src?.posts || []).length}`;

  return (
    <Stack spacing={3}>
      <Box className="page-header reveal-block">
        <Box>
          <Typography variant="h4">My Profile</Typography>
          <Typography variant="body1" color="text.secondary" className="page-header__copy">
            Keep your directory profile, role, skills, and community updates current.
          </Typography>
        </Box>
      </Box>

      {!editable ? (
        <Alert severity="info">
          Your role ({getRoleLabel(activeRole)}) has read-only profile access configured in permissions.
        </Alert>
      ) : null}

      <ProfileEditor
        key={editorKey}
        src={src}
        editable={editable}
        lookups={lookups}
        onSaveProfile={onSaveProfile}
        onAddPost={onAddPost}
        onChangePassword={onChangePassword}
      />
    </Stack>
  );
}
