import { useMemo, useState } from 'react';
import { Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { HowToRegRounded, LoginRounded } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  departments,
  getOrganizationFieldLabel,
  getRoleFieldLabel,
  getRoleLabel,
  getYearFieldLabel,
  roleOptions,
  USER_ROLES,
} from '../data/platformConfig.js';
import './signin.scss';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptySignIn = {
  email: '',
  password: '',
};

const emptyCreateAccount = {
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
  bio: '',
};

const demoAccounts = [
  { role: USER_ROLES.alumni, email: 'aline.mukamana@alumninet.rw' },
  { role: USER_ROLES.student, email: 'cedric.mugenzi@campus.rw' },
  { role: USER_ROLES.employee, email: 'diane.uwase@institution.rw' },
  { role: USER_ROLES.schoolLeader, email: 'emmanuel.nshuti@institution.rw' },
];

export default function SignIn({ onSignIn, onCreateAccount }) {
  const [mode, setMode] = useState('signin');
  const [signInForm, setSignInForm] = useState(emptySignIn);
  const [createForm, setCreateForm] = useState(emptyCreateAccount);

  const yearLabel = useMemo(() => getYearFieldLabel(createForm.role), [createForm.role]);
  const roleFieldLabel = useMemo(() => getRoleFieldLabel(createForm.role), [createForm.role]);
  const organizationLabel = useMemo(() => getOrganizationFieldLabel(createForm.role), [createForm.role]);

  const handleSignInChange = (event) => {
    const { name, value } = event.target;
    setSignInForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateChange = (event) => {
    const { name, value } = event.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitSignIn = (event) => {
    event.preventDefault();

    if (!emailPattern.test(signInForm.email) || signInForm.password.trim().length < 6) {
      toast.error('Enter a valid email and password.');
      return;
    }

    if (!onSignIn(signInForm)) {
      toast.error('Account not found or password is incorrect.');
      return;
    }

    toast.success('Sign in successful.');
  };

  const submitCreateAccount = (event) => {
    event.preventDefault();

    if (!createForm.fullName.trim()) {
      toast.error('Full name is required.');
      return;
    }

    if (!emailPattern.test(createForm.email)) {
      toast.error('Enter a valid email address.');
      return;
    }

    if (createForm.password.trim().length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    if (!/^\d{4}$/.test(createForm.graduationYear)) {
      toast.error(`${yearLabel} must be a 4-digit year.`);
      return;
    }

    if (!createForm.department || !createForm.currentRole.trim() || !createForm.company.trim() || !createForm.skills.trim()) {
      toast.error('Complete the department, role, organization, and skills fields.');
      return;
    }

    const result = onCreateAccount({
      ...createForm,
      graduationYear: Number(createForm.graduationYear),
      skills: createForm.skills.split(',').map((item) => item.trim()).filter(Boolean),
      educationHistory: createForm.educationHistory.split('\n').map((item) => item.trim()).filter(Boolean),
      jobHistory: createForm.jobHistory.split('\n').map((item) => item.trim()).filter(Boolean),
      employmentSector: createForm.employmentSector || 'General',
      posts: [],
      connections: [],
      avatar: null,
    });

    if (!result.ok) {
      toast.error(result.reason);
      return;
    }

    toast.success('Account created successfully.');
  };

  return (
    <Box className="signin-page">
      <Paper className="signin-card signin-card--wide" elevation={0}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="overline" className="signin-kicker">
              Alumni Networking & Job Referral System
            </Typography>
            <Typography variant="h4" className="signin-title">
              {mode === 'signin' ? 'Login to continue' : 'Create your community account'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The platform now supports alumni, students, employees, and school leaders with different workspaces and
              permissions.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button variant={mode === 'signin' ? 'contained' : 'outlined'} onClick={() => setMode('signin')}>
              Login
            </Button>
            <Button variant={mode === 'signup' ? 'contained' : 'outlined'} onClick={() => setMode('signup')}>
              Create account
            </Button>
          </Stack>

          {mode === 'signin' ? (
            <Box component="form" onSubmit={submitSignIn}>
              <Stack spacing={2}>
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  value={signInForm.email}
                  onChange={handleSignInChange}
                  fullWidth
                />
                <TextField
                  label="Password"
                  name="password"
                  type="password"
                  value={signInForm.password}
                  onChange={handleSignInChange}
                  helperText="Password must be at least 6 characters."
                  fullWidth
                />
                <Box className="signin-demo-box">
                  <Typography variant="subtitle2">Demo accounts</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Password for all demo users: <strong>Pass123!</strong>
                  </Typography>
                  {demoAccounts.map((account) => (
                    <Typography key={account.email} variant="body2" color="text.secondary">
                      {getRoleLabel(account.role)}: {account.email}
                    </Typography>
                  ))}
                </Box>
                <Typography variant="body2" className="signin-link-row">
                  <Link to="/forgot-password">Forgot password?</Link>
                </Typography>
                <Button type="submit" variant="contained" size="large" startIcon={<LoginRounded />}>
                  Sign in
                </Button>
              </Stack>
            </Box>
          ) : (
            <Box component="form" onSubmit={submitCreateAccount}>
              <Stack spacing={2}>
                <TextField label="Full name" name="fullName" value={createForm.fullName} onChange={handleCreateChange} fullWidth />
                <TextField label="Email" name="email" type="email" value={createForm.email} onChange={handleCreateChange} fullWidth />
                <TextField
                  label="Password"
                  name="password"
                  type="password"
                  value={createForm.password}
                  onChange={handleCreateChange}
                  fullWidth
                />
                <TextField label="User role" name="role" select value={createForm.role} onChange={handleCreateChange} fullWidth>
                  {roleOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Department"
                  name="department"
                  select
                  value={createForm.department}
                  onChange={handleCreateChange}
                  fullWidth
                >
                  {departments.map((department) => (
                    <MenuItem key={department} value={department}>
                      {department}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label={yearLabel}
                  name="graduationYear"
                  value={createForm.graduationYear}
                  onChange={handleCreateChange}
                  helperText="Enter a 4-digit year."
                  fullWidth
                />
                <TextField
                  label={roleFieldLabel}
                  name="currentRole"
                  value={createForm.currentRole}
                  onChange={handleCreateChange}
                  fullWidth
                />
                <TextField
                  label={organizationLabel}
                  name="company"
                  value={createForm.company}
                  onChange={handleCreateChange}
                  fullWidth
                />
                <TextField label="Location" name="location" value={createForm.location} onChange={handleCreateChange} fullWidth />
                <TextField
                  label="Sector"
                  name="employmentSector"
                  value={createForm.employmentSector}
                  onChange={handleCreateChange}
                  helperText="Used for grouping, referrals, and analytics."
                  fullWidth
                />
                <TextField
                  label="Skills"
                  name="skills"
                  value={createForm.skills}
                  onChange={handleCreateChange}
                  helperText="Separate multiple skills with commas."
                  fullWidth
                />
                <TextField
                  label="Education history"
                  name="educationHistory"
                  value={createForm.educationHistory}
                  onChange={handleCreateChange}
                  helperText="Use one line per education item."
                  multiline
                  minRows={2}
                  fullWidth
                />
                <TextField
                  label="Experience history"
                  name="jobHistory"
                  value={createForm.jobHistory}
                  onChange={handleCreateChange}
                  helperText="Use one line per experience item."
                  multiline
                  minRows={2}
                  fullWidth
                />
                <TextField label="Bio" name="bio" value={createForm.bio} onChange={handleCreateChange} multiline minRows={3} fullWidth />
                <Button type="submit" variant="contained" size="large" startIcon={<HowToRegRounded />}>
                  Create account
                </Button>
              </Stack>
            </Box>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
