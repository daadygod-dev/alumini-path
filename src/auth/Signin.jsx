import { useState } from 'react';
import { Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { HowToRegRounded, LoginRounded } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
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

export default function SignIn({ onSignIn, onCreateAccount }) {
  const [mode, setMode] = useState('signin');
  const [signInForm, setSignInForm] = useState(emptySignIn);
  const [createForm, setCreateForm] = useState(emptyCreateAccount);

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
      toast.error('Graduation year must be numeric.');
      return;
    }

    if (!createForm.department || !createForm.currentRole.trim() || !createForm.company.trim() || !createForm.skills.trim()) {
      toast.error('Complete the department, current job details, and skills fields.');
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
              {mode === 'signin' ? 'Login to continue' : 'Create your alumni account'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Users must sign in or create an account before they can access alumni records, referrals, and analytics.
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
                <TextField
                  label="Department"
                  name="department"
                  select
                  value={createForm.department}
                  onChange={handleCreateChange}
                  fullWidth
                >
                  <MenuItem value="Information Technology">Information Technology</MenuItem>
                  <MenuItem value="Computer Science">Computer Science</MenuItem>
                  <MenuItem value="Business Information Systems">Business Information Systems</MenuItem>
                  <MenuItem value="Networking">Networking</MenuItem>
                </TextField>
                <TextField
                  label="Graduation year"
                  name="graduationYear"
                  value={createForm.graduationYear}
                  onChange={handleCreateChange}
                  helperText="Enter a 4-digit numeric graduation year."
                  fullWidth
                />
                <TextField
                  label="Current role"
                  name="currentRole"
                  value={createForm.currentRole}
                  onChange={handleCreateChange}
                  fullWidth
                />
                <TextField
                  label="Current company"
                  name="company"
                  value={createForm.company}
                  onChange={handleCreateChange}
                  fullWidth
                />
                <TextField label="Location" name="location" value={createForm.location} onChange={handleCreateChange} fullWidth />
                <TextField
                  label="Employment sector"
                  name="employmentSector"
                  value={createForm.employmentSector}
                  onChange={handleCreateChange}
                  helperText="Required for analytics and profile grouping."
                  fullWidth
                />
                <TextField
                  label="Skill sets"
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
                  label="Current and previous job details"
                  name="jobHistory"
                  value={createForm.jobHistory}
                  onChange={handleCreateChange}
                  helperText="Use one line per role."
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
