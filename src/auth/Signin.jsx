import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowBackRounded,
  ArrowForwardRounded,
  CheckCircleOutlineRounded,
  DarkModeRounded,
  HowToRegRounded,
  LightModeRounded,
  LoginRounded,
  VisibilityOffRounded,
  VisibilityRounded,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthAside from './AuthAside.jsx';
import { USER_ROLES } from '../data/platformConfig.js';
import './signin.scss';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptySignIn = {
  email: '',
  password: '',
};

const emptyCreateAccount = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  role: 'alumni',
  regNo: '',
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
  bio: '',
};

const SIGNUP_STEPS = ['Account & Role', 'Department & Career', 'Skills & Background'];

export default function SignIn({
  onSignIn,
  onCreateAccount,
  lookups = { departments: [], programmes: [], sectors: [], roles: [] },
  lookupsLoading = false,
  mode = 'light',
  toggleTheme,
}) {
  const [authTab, setAuthTab] = useState('signin');
  const [signupStep, setSignupStep] = useState(0);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [signInForm, setSignInForm] = useState(emptySignIn);
  const [createForm, setCreateForm] = useState(emptyCreateAccount);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const roleOptions = lookups.roles?.length ? lookups.roles : USER_ROLES;
  const departments = useMemo(() => lookups.departments || [], [lookups.departments]);
  const sectors = lookups.sectors || [];

  const availableProgrammes = useMemo(() => {
    const selectedDept = departments.find((d) => d.name === createForm.department);
    const list = lookups.programmes || [];
    if (!selectedDept) {
      return list;
    }
    const filtered = list.filter((p) => Number(p.department_id) === Number(selectedDept.id));
    return filtered.length ? filtered : list;
  }, [createForm.department, departments, lookups.programmes]);

  const yearLabel =
    createForm.role === 'student'
      ? 'Expected graduation year'
      : createForm.role === 'employee' || createForm.role === 'school_leader'
        ? 'Cohort / joining year'
        : 'Graduation year';

  const roleFieldLabel =
    createForm.role === 'student'
      ? 'Academic focus / track'
      : createForm.role === 'employee'
        ? 'Staff position'
        : createForm.role === 'school_leader'
          ? 'Leadership title'
          : 'Current role';

  const organizationLabel =
    createForm.role === 'student' ? 'Campus / faculty' : 'Organization / employer';

  const handleSignInChange = (event) => {
    const { name, value } = event.target;
    setErrorMessage('');
    setSignInForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateChange = (event) => {
    const { name, value } = event.target;
    setErrorMessage('');
    setCreateForm((prev) => {
      if (name === 'department') {
        return { ...prev, department: value, programme: '' };
      }
      return { ...prev, [name]: value };
    });
  };

  const submitSignIn = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (!emailPattern.test(signInForm.email.trim()) || !signInForm.password.trim()) {
      setErrorMessage('Enter your registered email address and password.');
      return;
    }

    setSubmitting(true);
    const result = await onSignIn({
      email: signInForm.email.trim(),
      password: signInForm.password,
    });
    setSubmitting(false);

    if (!result.ok) {
      setErrorMessage(result.reason || 'Email or password is incorrect.');
      toast.error(result.reason || 'Sign in failed.');
      return;
    }

    toast.success('Signed in.');
  };

  const validateStep = (stepIndex) => {
    if (stepIndex === 0) {
      if (!createForm.fullName.trim()) {
        return 'Full name is required.';
      }
      if (!emailPattern.test(createForm.email.trim())) {
        return 'Enter a valid email address.';
      }
      if (
        createForm.password.length < 8 ||
        !/[A-Z]/.test(createForm.password) ||
        !/[a-z]/.test(createForm.password) ||
        !/[\d\W]/.test(createForm.password)
      ) {
        return 'Password must be at least 8 characters with uppercase, lowercase, and a number or symbol.';
      }
    }

    if (stepIndex === 1) {
      if (!createForm.department) {
        return 'Select your department.';
      }
      if (!/^\d{4}$/.test(createForm.graduationYear.trim())) {
        return `${yearLabel} must be a 4-digit year.`;
      }
      if (!createForm.currentRole.trim() || !createForm.company.trim()) {
        return `Complete ${roleFieldLabel.toLowerCase()} and ${organizationLabel.toLowerCase()} fields.`;
      }
    }

    return '';
  };

  const handleNextStep = () => {
    setErrorMessage('');
    const reason = validateStep(signupStep);
    if (reason) {
      setErrorMessage(reason);
      return;
    }
    setSignupStep((prev) => Math.min(prev + 1, SIGNUP_STEPS.length - 1));
  };

  const handlePrevStep = () => {
    setErrorMessage('');
    setSignupStep((prev) => Math.max(prev - 1, 0));
  };

  const submitCreateAccount = async (event) => {
    event.preventDefault();

    if (signupStep < SIGNUP_STEPS.length - 1) {
      handleNextStep();
      return;
    }

    setErrorMessage('');

    const step0Error = validateStep(0);
    if (step0Error) {
      setSignupStep(0);
      setErrorMessage(step0Error);
      return;
    }

    const step1Error = validateStep(1);
    if (step1Error) {
      setSignupStep(1);
      setErrorMessage(step1Error);
      return;
    }

    setSubmitting(true);
    const result = await onCreateAccount({
      fullName: createForm.fullName.trim(),
      email: createForm.email.trim(),
      phone: createForm.phone.trim(),
      regNo: createForm.regNo.trim(),
      password: createForm.password,
      role: createForm.role,
      department: createForm.department,
      programme: createForm.programme,
      graduationYear: Number(createForm.graduationYear),
      currentRole: createForm.currentRole.trim(),
      company: createForm.company.trim(),
      location: createForm.location.trim(),
      sector: createForm.sector,
      skills: createForm.skills,
      educationHistory: createForm.educationHistory,
      jobHistory: createForm.jobHistory,
      bio: createForm.bio.trim(),
    });
    setSubmitting(false);

    if (!result.ok) {
      setErrorMessage(result.reason || 'Could not create account.');
      toast.error(result.reason || 'Registration failed.');
      return;
    }

    toast.success('Account created.');
  };

  return (
    <Box className="auth-page">
      <AuthAside />

      <Box className="auth-main">
        <Box className="auth-main__topbar">
          {toggleTheme && (
            <Tooltip title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
              <IconButton onClick={toggleTheme} className="app-shell__theme-btn" aria-label="Toggle theme">
                {mode === 'light' ? <DarkModeRounded fontSize="small" /> : <LightModeRounded fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Box className="auth-main__body">
          <Box className={`auth-card${authTab === 'signup' ? ' auth-card--wide' : ''}`}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h4">
                  {authTab === 'signin' ? 'Sign in to your account' : 'Create your account'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {authTab === 'signin'
                    ? 'Enter your email address and password to access the network.'
                    : 'Register as an alumni, student, staff member, or school leader.'}
                </Typography>
              </Box>

              <Box className="auth-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={authTab === 'signin'}
                  className={`auth-tab${authTab === 'signin' ? ' is-active' : ''}`}
                  onClick={() => {
                    setAuthTab('signin');
                    setErrorMessage('');
                  }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={authTab === 'signup'}
                  className={`auth-tab${authTab === 'signup' ? ' is-active' : ''}`}
                  onClick={() => {
                    setAuthTab('signup');
                    setSignupStep(0);
                    setErrorMessage('');
                  }}
                >
                  Create account
                </button>
              </Box>

              {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

              {authTab === 'signin' ? (
                <Box component="form" onSubmit={submitSignIn}>
                  <Stack spacing={2}>
                    <TextField
                      label="Email address"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={signInForm.email}
                      onChange={handleSignInChange}
                      size="small"
                      fullWidth
                      required
                    />
                    <TextField
                      label="Password"
                      name="password"
                      type={showSignInPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={signInForm.password}
                      onChange={handleSignInChange}
                      size="small"
                      fullWidth
                      required
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => setShowSignInPassword((prev) => !prev)}
                                aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
                                edge="end"
                              >
                                {showSignInPassword ? (
                                  <VisibilityOffRounded fontSize="small" />
                                ) : (
                                  <VisibilityRounded fontSize="small" />
                                )}
                              </IconButton>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Typography variant="body2">
                        <Link to="/forgot-password" className="auth-link">
                          Forgot password?
                        </Link>
                      </Typography>
                    </Box>

                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={submitting}
                      startIcon={<LoginRounded />}
                    >
                      {submitting ? 'Signing in...' : 'Sign in'}
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <Box component="form" onSubmit={submitCreateAccount}>
                  <Stack spacing={2.25}>
                    <Stepper activeStep={signupStep} alternativeLabel>
                      {SIGNUP_STEPS.map((label) => (
                        <Step key={label}>
                          <StepLabel>{label}</StepLabel>
                        </Step>
                      ))}
                    </Stepper>

                    {signupStep === 0 && (
                      <Stack spacing={1.75} key="step-0" className="auth-step-pane">
                        <span className="auth-section-label">Step 1 of 3 · Account &amp; Role</span>
                        <Grid container spacing={1.75}>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              label="Full name"
                              name="fullName"
                              value={createForm.fullName}
                              onChange={handleCreateChange}
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
                              value={createForm.email}
                              onChange={handleCreateChange}
                              size="small"
                              fullWidth
                              required
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              label="Telephone"
                              name="phone"
                              value={createForm.phone}
                              onChange={handleCreateChange}
                              size="small"
                              fullWidth
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              label="Registration number"
                              name="regNo"
                              value={createForm.regNo}
                              onChange={handleCreateChange}
                              placeholder="e.g. 22RP01458"
                              size="small"
                              fullWidth
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              label="Password"
                              name="password"
                              type={showCreatePassword ? 'text' : 'password'}
                              autoComplete="new-password"
                              value={createForm.password}
                              onChange={handleCreateChange}
                              size="small"
                              fullWidth
                              required
                              slotProps={{
                                input: {
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      <IconButton
                                        size="small"
                                        onClick={() => setShowCreatePassword((prev) => !prev)}
                                        aria-label={showCreatePassword ? 'Hide password' : 'Show password'}
                                        edge="end"
                                      >
                                        {showCreatePassword ? (
                                          <VisibilityOffRounded fontSize="small" />
                                        ) : (
                                          <VisibilityRounded fontSize="small" />
                                        )}
                                      </IconButton>
                                    </InputAdornment>
                                  ),
                                },
                              }}
                            />
                            <Box className="auth-password-rules">
                              <span className={`auth-password-rule${createForm.password.length >= 8 ? ' is-met' : ''}`}>
                                <CheckCircleOutlineRounded fontSize="inherit" /> 8+ chars
                              </span>
                              <span
                                className={`auth-password-rule${
                                  /[A-Z]/.test(createForm.password) && /[a-z]/.test(createForm.password)
                                    ? ' is-met'
                                    : ''
                                }`}
                              >
                                <CheckCircleOutlineRounded fontSize="inherit" /> Upper &amp; lower
                              </span>
                              <span
                                className={`auth-password-rule${/[\d\W]/.test(createForm.password) ? ' is-met' : ''}`}
                              >
                                <CheckCircleOutlineRounded fontSize="inherit" /> Number/symbol
                              </span>
                            </Box>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              label="Account type"
                              name="role"
                              select
                              value={createForm.role}
                              onChange={handleCreateChange}
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
                        </Grid>
                      </Stack>
                    )}

                    {signupStep === 1 && (
                      <Stack spacing={1.75} key="step-1" className="auth-step-pane">
                        <span className="auth-section-label">Step 2 of 3 · Department &amp; Career</span>
                        <Grid container spacing={1.75}>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              label="Department"
                              name="department"
                              select
                              value={createForm.department}
                              onChange={handleCreateChange}
                              disabled={lookupsLoading || departments.length === 0}
                              helperText={
                                departments.length === 0
                                  ? 'Departments load from the database.'
                                  : ''
                              }
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
                              label="Programme (optional)"
                              name="programme"
                              select
                              value={createForm.programme}
                              onChange={handleCreateChange}
                              disabled={availableProgrammes.length === 0}
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
                              label={yearLabel}
                              name="graduationYear"
                              value={createForm.graduationYear}
                              onChange={handleCreateChange}
                              placeholder="e.g. 2024"
                              size="small"
                              fullWidth
                              required
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              label={roleFieldLabel}
                              name="currentRole"
                              value={createForm.currentRole}
                              onChange={handleCreateChange}
                              size="small"
                              fullWidth
                              required
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              label={organizationLabel}
                              name="company"
                              value={createForm.company}
                              onChange={handleCreateChange}
                              size="small"
                              fullWidth
                              required
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              label="Location"
                              name="location"
                              value={createForm.location}
                              onChange={handleCreateChange}
                              size="small"
                              fullWidth
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 12 }}>
                            <TextField
                              label="Sector"
                              name="sector"
                              select
                              value={createForm.sector}
                              onChange={handleCreateChange}
                              disabled={sectors.length === 0}
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
                      </Stack>
                    )}

                    {signupStep === 2 && (
                      <Stack spacing={1.75} key="step-2" className="auth-step-pane">
                        <span className="auth-section-label">Step 3 of 3 · Skills &amp; Background (Optional)</span>
                        <TextField
                          label="Skills"
                          name="skills"
                          value={createForm.skills}
                          onChange={handleCreateChange}
                          helperText="Separate skills with commas (e.g. React, SQL, Python)."
                          size="small"
                          fullWidth
                        />
                        <Grid container spacing={1.75}>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              label="Education history"
                              name="educationHistory"
                              value={createForm.educationHistory}
                              onChange={handleCreateChange}
                              helperText="One qualification per line (optional)."
                              multiline
                              minRows={2}
                              size="small"
                              fullWidth
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              label="Experience history"
                              name="jobHistory"
                              value={createForm.jobHistory}
                              onChange={handleCreateChange}
                              helperText="One role per line (optional)."
                              multiline
                              minRows={2}
                              size="small"
                              fullWidth
                            />
                          </Grid>
                        </Grid>
                        <TextField
                          label="Short bio"
                          name="bio"
                          value={createForm.bio}
                          onChange={handleCreateChange}
                          multiline
                          minRows={2}
                          size="small"
                          fullWidth
                        />
                      </Stack>
                    )}

                    <Stack
                      direction="row"
                      spacing={1.5}
                      justifyContent="space-between"
                      flexWrap="wrap"
                      useFlexGap
                      className="auth-card__step-nav"
                      sx={{ pt: 0.5 }}
                    >
                      <Button
                        type="button"
                        variant="outlined"
                        color="inherit"
                        disabled={signupStep === 0 || submitting}
                        startIcon={<ArrowBackRounded />}
                        onClick={handlePrevStep}
                      >
                        Back
                      </Button>

                      {signupStep < SIGNUP_STEPS.length - 1 ? (
                        <Button
                          type="button"
                          variant="contained"
                          endIcon={<ArrowForwardRounded />}
                          onClick={handleNextStep}
                        >
                          Continue
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={submitting}
                          startIcon={<HowToRegRounded />}
                        >
                          {submitting ? 'Creating account...' : 'Create account'}
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </Box>
              )}
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
