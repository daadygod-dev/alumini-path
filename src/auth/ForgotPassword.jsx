import { useState } from 'react';
import { Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import './signin.scss';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword({ onRequestReset }) {
  const [email, setEmail] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!emailPattern.test(email)) {
      toast.error('Enter a valid email address.');
      return;
    }

    if (!onRequestReset(email)) {
      toast.error('No account found for that email.');
      return;
    }

    toast.success('Reset link sent successfully.');
    setEmail('');
  };

  return (
    <Box className="signin-page">
      <Paper className="signin-card" elevation={0}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="overline" className="signin-kicker">
              Alumni Networking & Job Referral System
            </Typography>
            <Typography variant="h4" className="signin-title">
              Forgot password
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter your account email to send a password reset link.
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                fullWidth
              />
              <Button type="submit" variant="contained" size="large">
                Send reset link
              </Button>
            </Stack>
          </Box>

          <Typography variant="body2" color="text.secondary">
            Return to <Link to="/">login</Link>.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
