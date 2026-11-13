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
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { HistoryEduRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState.jsx';
import { apiRequest } from '../api/client.js';
import { canEditProfile, getRoleLabel } from '../data/platformConfig.js';
import '../styles/feature-pages.scss';

function HistoryEditor({ activeProfile, editable, onRefreshWorkspace }) {
  const [educationText, setEducationText] = useState(
    () => (activeProfile?.educationHistory || []).join('\n'),
  );
  const [employmentText, setEmploymentText] = useState(
    () => (activeProfile?.jobHistory || []).join('\n'),
  );
  const [skillsText, setSkillsText] = useState(
    () => (activeProfile?.skills || []).join(', '),
  );
  const [saving, setSaving] = useState(false);

  const parsedEducation = useMemo(
    () => educationText.split('\n').map((item) => item.trim()).filter(Boolean),
    [educationText],
  );
  const parsedEmployment = useMemo(
    () => employmentText.split('\n').map((item) => item.trim()).filter(Boolean),
    [employmentText],
  );
  const parsedSkills = useMemo(
    () => skillsText.split(',').map((item) => item.trim()).filter(Boolean),
    [skillsText],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSaving(true);
    try {
      await Promise.all([
        apiRequest('education', {
          method: 'POST',
          body: {
            educationHistory: educationText,
            institution: activeProfile?.company || 'RP Kigali College',
            startYear: activeProfile?.graduationYear || new Date().getFullYear(),
            endYear: activeProfile?.graduationYear || new Date().getFullYear(),
          },
        }),
        apiRequest('employment', {
          method: 'POST',
          body: {
            jobHistory: employmentText,
            company: activeProfile?.company || '',
            location: activeProfile?.location || '',
          },
        }),
        apiRequest('profile', {
          method: 'POST',
          body: {
            fullName: activeProfile?.fullName || '',
            email: activeProfile?.email || '',
            phone: activeProfile?.phone || '',
            graduationYear: activeProfile?.graduationYear || new Date().getFullYear(),
            department: activeProfile?.department || '',
            programme: activeProfile?.programme || '',
            sector: activeProfile?.sector || '',
            currentRole: activeProfile?.currentRole || '',
            company: activeProfile?.company || '',
            location: activeProfile?.location || '',
            bio: activeProfile?.bio || '',
            skills: parsedSkills.join(', '),
          },
        }),
      ]);

      if (onRefreshWorkspace) {
        await onRefreshWorkspace();
      }
      toast.success('Education, experience, and skills saved.');
    } catch (error) {
      toast.error(error.message || 'Could not update history.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Grid container spacing={2.5} alignItems="stretch">
      <Grid size={{ xs: 12, lg: 7 }}>
        <Card sx={{ height: '100%' }} className="reveal-block reveal-delay-1">
          <CardContent>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.25}>
                <TextField
                  label="Education history"
                  value={educationText}
                  onChange={(event) => setEducationText(event.target.value)}
                  disabled={!editable}
                  helperText="Enter one qualification, certificate, or degree per line."
                  multiline
                  minRows={4}
                  fullWidth
                />
                <TextField
                  label={
                    activeProfile?.role === 'student'
                      ? 'Projects, internships & experience'
                      : 'Work & leadership history'
                  }
                  value={employmentText}
                  onChange={(event) => setEmploymentText(event.target.value)}
                  disabled={!editable}
                  helperText="Enter one role per line. Add (Current) for ongoing roles."
                  multiline
                  minRows={4}
                  fullWidth
                />
                <TextField
                  label="Skills (comma-separated)"
                  value={skillsText}
                  onChange={(event) => setSkillsText(event.target.value)}
                  disabled={!editable}
                  helperText="Used for matching and directory search."
                  fullWidth
                />

                {editable ? (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button type="submit" variant="contained" disabled={saving}>
                      {saving ? 'Saving...' : 'Save history'}
                    </Button>
                  </Box>
                ) : null}
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <Card sx={{ height: '100%' }} className="reveal-block reveal-delay-2">
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Live Directory Preview</Typography>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                  Education
                </Typography>
                {parsedEducation.length > 0 ? (
                  <Box className="history-list">
                    {parsedEducation.map((item, idx) => (
                      <Box key={`${item}-${idx}`} className="history-item">
                        {item}
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <EmptyState
                    compact
                    icon={<HistoryEduRounded fontSize="small" />}
                    title="No education entries"
                    description="Add academic qualifications on the left to show them here."
                  />
                )}
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                  Experience
                </Typography>
                {parsedEmployment.length > 0 ? (
                  <Box className="history-list">
                    {parsedEmployment.map((item, idx) => (
                      <Box key={`${item}-${idx}`} className="history-item">
                        {item}
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <EmptyState
                    compact
                    title="No work history entries"
                    description="Add internships, leadership roles, or jobs to build your timeline."
                  />
                )}
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                  Skills
                </Typography>
                {parsedSkills.length > 0 ? (
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {parsedSkills.map((skill) => (
                      <Chip key={skill} label={skill} size="small" />
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No skills listed yet.
                  </Typography>
                )}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default function EducationHistoryPage({
  currentUser,
  currentProfile,
  loading = false,
  onRefreshWorkspace,
}) {
  const activeProfile = currentProfile || currentUser;
  const editable = canEditProfile(currentUser);

  if (loading && !activeProfile) {
    return (
      <Stack spacing={2.5}>
        <Skeleton variant="rounded" height={68} />
        <Skeleton variant="rounded" height={340} />
      </Stack>
    );
  }

  const editorKey = `${activeProfile?.id || 'anon'}-${(activeProfile?.educationHistory || []).length}-${(activeProfile?.jobHistory || []).length}-${(activeProfile?.skills || []).length}`;

  return (
    <Stack spacing={3}>
      <Box className="page-header reveal-block">
        <Box>
          <Typography variant="h4">
            {activeProfile?.role === 'student' ? 'Academic Progress' : 'Education & Experience'}
          </Typography>
          <Typography variant="body1" color="text.secondary" className="page-header__copy">
            Manage your academic credentials, work history, and technical skills displayed in the community directory.
          </Typography>
        </Box>
      </Box>

      {!editable ? (
        <Alert severity="info">
          Your role ({getRoleLabel(activeProfile?.role)}) has read-only access to education and employment records.
        </Alert>
      ) : null}

      <HistoryEditor
        key={editorKey}
        activeProfile={activeProfile}
        editable={editable}
        onRefreshWorkspace={onRefreshWorkspace}
      />
    </Stack>
  );
}
