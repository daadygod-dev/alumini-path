import { useState } from 'react';
import { Box, Button, Card, CardContent, Grid, Stack, TextField, Typography } from '@mui/material';
import toast from 'react-hot-toast';
import '../styles/feature-pages.scss';

export default function EducationHistoryPage({ currentProfile, onSaveProfile }) {
  const initialForm = {
    educationHistory: (currentProfile?.educationHistory || []).join('\n'),
    jobHistory: (currentProfile?.jobHistory || []).join('\n'),
    skills: (currentProfile?.skills || []).join(', '),
  };
  const [form, setForm] = useState({
    ...initialForm,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!form.educationHistory.trim()) nextErrors.educationHistory = 'Education history is required.';
    if (!form.jobHistory.trim()) nextErrors.jobHistory = 'Current job details are required.';
    if (!form.skills.trim()) nextErrors.skills = 'At least one skill set is required.';

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      toast.error('Complete the required education and skill fields.');
      return;
    }

    const result = onSaveProfile({
      ...currentProfile,
      educationHistory: form.educationHistory.split('\n').map((item) => item.trim()).filter(Boolean),
      jobHistory: form.jobHistory.split('\n').map((item) => item.trim()).filter(Boolean),
      skills: form.skills.split(',').map((item) => item.trim()).filter(Boolean),
    });

    if (!result.ok) {
      toast.error(result.reason);
      return;
    }

    toast.success('Education history and skill sets updated.');
  };

  if (!currentProfile) {
    return null;
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Education History</Typography>
        <Typography variant="body1" color="text.secondary">
          Maintain your education records, current and previous job details, and skill sets from a dedicated sidebar
          section.
        </Typography>
      </Box>

      <Card elevation={0} className="feature-card">
        <CardContent>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  label="Education history"
                  name="educationHistory"
                  value={form.educationHistory}
                  onChange={handleChange}
                  error={Boolean(errors.educationHistory)}
                  helperText={errors.educationHistory || 'Use one line per education record.'}
                  multiline
                  minRows={4}
                  fullWidth
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="Current and previous job details"
                  name="jobHistory"
                  value={form.jobHistory}
                  onChange={handleChange}
                  error={Boolean(errors.jobHistory)}
                  helperText={errors.jobHistory || 'Use one line per role.'}
                  multiline
                  minRows={4}
                  fullWidth
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="Skill sets"
                  name="skills"
                  value={form.skills}
                  onChange={handleChange}
                  error={Boolean(errors.skills)}
                  helperText={errors.skills || 'Separate multiple skills with commas.'}
                  fullWidth
                />
              </Grid>
              <Grid size={12}>
                <Button type="submit" variant="contained" size="large">
                  Save education history
                </Button>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
