import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { ArrowBackRounded, DarkModeRounded, LightModeRounded } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthAside from './AuthAside.jsx';
import './signin.scss';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword({
  onRequestReset,
  onCompleteReset,
  mode = 'light',
  toggleTheme,
}) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCompleteStep, setShowCompleteStep] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setStatusMessage('');

    if (!emailPattern.test(email.trim())) {
      setErrorMessage('Enter a valid email address.');
      return;
    }

    setSubmitting(true);
    const result = await onRequestReset(email.trim());
    setSubmitting(false);

    if (!result.ok) {
      setErrorMessage(result.reason || 'Unable to process reset request.');
      toast.error(result.reason || 'Reset request failed.');
      return;
    }

    setStatusMessage(result.message || 'If that address is registered, a reset token has been created.');
    toast.success('Reset request submitted.');
    setEmail('');
  };

  const handleCompleteReset = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setStatusMessage('');

    if (!token.trim() || newPassword.length < 8) {
      setErrorMessage('Enter the reset token and a password of at least 8 characters.');
      return;
    }

    setSubmitting(true);
    const result = await onCompleteReset({ token: token.trim(), password: newPassword });
    setSubmitting(false);

    if (!result.ok) {
      setErrorMessage(result.reason || 'Could not update password.');
      toast.error(result.reason || 'Password update failed.');
      return;
    }

    setStatusMessage('Password updated. You can return to sign in now.');
    toast.success('Password updated.');
    setToken('');
    setNewPassword('');
  };

  return (
    <Box className="auth-page">
      <AuthAside
        eyebrow="Account Recovery"
        headline="Recover access to your community account."
        lead="Enter your registered email address to generate a password reset token, or apply a reset token below."
        showShowcase={false}
      />

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
          <Box className="auth-card">
            <Stack spacing={2.25}>
              <Box>
                <Typography variant="h4">Reset password</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Enter the email address associated with your account.
                </Typography>
              </Box>

              {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
              {statusMessage ? <Alert severity="success">{statusMessage}</Alert> : null}

              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={2}>
                  <TextField
                    label="Email address"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    size="small"
                    fullWidth
                    required
                  />
                  <Button type="submit" variant="contained" size="large" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Request reset token'}
                  </Button>
                </Stack>
              </Box>

              {onCompleteReset ? (
                <>
                  <Divider />
                  <Button
                    type="button"
                    size="small"
                    color="inherit"
                    onClick={() => setShowCompleteStep((prev) => !prev)}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {showCompleteStep ? 'Hide token entry' : 'Already have a reset token?'}
                  </Button>

                  {showCompleteStep ? (
                    <Box component="form" onSubmit={handleCompleteReset}>
                      <Stack spacing={1.5}>
                        <TextField
                          label="Reset token"
                          value={token}
                          onChange={(event) => setToken(event.target.value)}
                          size="small"
                          fullWidth
                        />
                        <TextField
                          label="New password"
                          type="password"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          helperText="At least 8 characters with upper, lower, and a number or symbol"
                          size="small"
                          fullWidth
                        />
                        <Button type="submit" variant="outlined" disabled={submitting}>
                          Update password
                        </Button>
                      </Stack>
                    </Box>
                  ) : null}
                </>
              ) : null}

              <Box>
                <Button component={Link} to="/" startIcon={<ArrowBackRounded />} size="small" color="inherit">
                  Back to sign in
                </Button>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
