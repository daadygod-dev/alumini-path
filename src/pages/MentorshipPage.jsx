import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  CalendarMonthRounded,
  CheckCircleOutlineRounded,
  CloseRounded,
  HandshakeRounded,
  PersonSearchRounded,
  RefreshRounded,
  SearchRounded,
  SchoolRounded,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState.jsx';
import { ProtectedAvatar } from '../components/ProtectedAsset.jsx';
import { apiRequest } from '../api/client.js';
import { canRequestMentorship } from '../data/platformConfig.js';
import '../styles/feature-pages.scss';

const emptyMentorProfile = {
  headline: '',
  professionalBackground: '',
  areasOfExpertise: '',
  yearsOfExperience: '',
  mentorshipInterests: '',
  maxActiveMentees: 3,
};

const emptySessionForm = {
  scheduledAt: '',
  durationMinutes: 45,
  meetingMode: 'virtual',
  locationOrLink: '',
  notes: '',
};

const SESSION_MODES = [
  { value: 'virtual', label: 'Virtual Video Call' },
  { value: 'in_person', label: 'In Person' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'email', label: 'Email Check-in' },
];

export default function MentorshipPage({ currentUser }) {
  const canRequest = canRequestMentorship(currentUser);
  const canOfferMentor = ['alumni', 'administrator', 'employee'].includes(currentUser.role);

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [mentors, setMentors] = useState([]);
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [sessions, setSessions] = useState([]);

  const [search, setSearch] = useState('');
  const [expertiseFilter, setExpertiseFilter] = useState('');

  const [mentorDrawerOpen, setMentorDrawerOpen] = useState(false);
  const [mentorForm, setMentorForm] = useState(emptyMentorProfile);
  const [savingMentor, setSavingMentor] = useState(false);

  const [viewMentor, setViewMentor] = useState(null);
  const [requestTarget, setRequestTarget] = useState(null);
  const [requestForm, setRequestForm] = useState({ careerInterests: '', expectations: '', message: '' });
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const [sessionTarget, setSessionTarget] = useState(null);
  const [sessionForm, setSessionForm] = useState(emptySessionForm);
  const [submittingSession, setSubmittingSession] = useState(false);

  const [completeTarget, setCompleteTarget] = useState(null);
  const [completeNotes, setCompleteNotes] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = {};
      if (search.trim()) query.search = search.trim();
      if (expertiseFilter.trim()) query.expertise = expertiseFilter.trim();

      const [mentorsData, myData] = await Promise.all([
        apiRequest('mentors', { query }),
        apiRequest('mentorship'),
      ]);

      setMentors(Array.isArray(mentorsData?.mentors) ? mentorsData.mentors : []);
      setReceived(Array.isArray(myData?.received) ? myData.received : []);
      setSent(Array.isArray(myData?.sent) ? myData.sent : []);
      setSessions(Array.isArray(myData?.sessions) ? myData.sessions : []);
    } catch (err) {
      setError(err.message || 'Could not load mentorship data.');
    } finally {
      setLoading(false);
    }
  }, [expertiseFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const myMentorRecord = useMemo(
    () => mentors.find((m) => Number(m.user_id) === Number(currentUser.id)) || null,
    [currentUser.id, mentors],
  );

  const openMentorDrawer = () => {
    if (myMentorRecord) {
      setMentorForm({
        headline: myMentorRecord.headline || '',
        professionalBackground: myMentorRecord.professional_background || '',
        areasOfExpertise: myMentorRecord.areas_of_expertise || '',
        yearsOfExperience: String(myMentorRecord.years_of_experience ?? ''),
        mentorshipInterests: myMentorRecord.mentorship_interests || '',
        maxActiveMentees: Number(myMentorRecord.max_active_mentees || 3),
      });
    } else {
      setMentorForm(emptyMentorProfile);
    }
    setMentorDrawerOpen(true);
  };

  const handleSaveMentorProfile = async (event) => {
    event.preventDefault();
    if (!mentorForm.headline.trim() || !mentorForm.areasOfExpertise.trim() || !mentorForm.professionalBackground.trim()) {
      toast.error('Headline, professional background, and areas of expertise are required.');
      return;
    }

    setSavingMentor(true);
    try {
      await apiRequest('become-mentor', {
        method: 'POST',
        body: {
          headline: mentorForm.headline.trim(),
          professionalBackground: mentorForm.professionalBackground.trim(),
          areasOfExpertise: mentorForm.areasOfExpertise.trim(),
          yearsOfExperience: Number(mentorForm.yearsOfExperience || 0),
          mentorshipInterests: mentorForm.mentorshipInterests.trim(),
          maxActiveMentees: Number(mentorForm.maxActiveMentees || 3),
        },
      });
      setMentorDrawerOpen(false);
      toast.success('Mentor profile published.');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Could not save mentor profile.');
    } finally {
      setSavingMentor(false);
    }
  };

  const handleSendRequest = async (event) => {
    event.preventDefault();
    if (!requestTarget || !requestForm.careerInterests.trim() || !requestForm.expectations.trim()) {
      toast.error('Please outline your career interests and expectations.');
      return;
    }

    setSubmittingRequest(true);
    try {
      await apiRequest('mentorship-request', {
        method: 'POST',
        query: { id: requestTarget.user_id },
        body: {
          careerInterests: requestForm.careerInterests.trim(),
          expectations: requestForm.expectations.trim(),
          message: requestForm.message.trim(),
        },
      });
      setRequestTarget(null);
      setRequestForm({ careerInterests: '', expectations: '', message: '' });
      toast.success('Mentorship request sent.');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Could not send mentorship request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleRespondRequest = async (requestId, decision) => {
    try {
      await apiRequest('mentorship', {
        method: 'POST',
        query: { action: 'respond' },
        body: { requestId, decision },
      });
      toast.success(`Request ${decision}.`);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Could not update request.');
    }
  };

  const handleScheduleSession = async (event) => {
    event.preventDefault();
    if (!sessionTarget || !sessionForm.scheduledAt) {
      toast.error('Select a session date and time.');
      return;
    }

    setSubmittingSession(true);
    try {
      await apiRequest('mentorship-session', {
        method: 'POST',
        body: {
          requestId: sessionTarget.id,
          scheduledAt: sessionForm.scheduledAt.replace('T', ' ') + ':00',
          durationMinutes: Number(sessionForm.durationMinutes || 45),
          meetingMode: sessionForm.meetingMode,
          locationOrLink: sessionForm.locationOrLink.trim(),
          notes: sessionForm.notes.trim(),
        },
      });
      setSessionTarget(null);
      setSessionForm(emptySessionForm);
      toast.success('Mentorship session scheduled.');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Could not schedule mentorship session.');
    } finally {
      setSubmittingSession(false);
    }
  };

  const handleCompleteSession = async () => {
    if (!completeTarget) return;
    try {
      await apiRequest('mentorship-session-complete', {
        method: 'POST',
        query: { id: completeTarget.id },
        body: { notes: completeNotes.trim() },
      });
      setCompleteTarget(null);
      setCompleteNotes('');
      toast.success('Session marked completed.');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Could not mark session complete.');
    }
  };

  const sentByMentorId = useMemo(() => {
    const map = {};
    sent.forEach((req) => {
      map[Number(req.mentor_id)] = req;
    });
    return map;
  }, [sent]);

  return (
    <Stack spacing={3}>
      <Box className="page-header reveal-block">
        <Box>
          <Typography variant="h4">Mentorship Hub</Typography>
          <Typography variant="body1" color="text.secondary" className="page-header__copy">
            Connect with experienced graduates for career guidance, portfolio feedback, and structured mentoring sessions.
          </Typography>
        </Box>

        {canOfferMentor ? (
          <Button variant="contained" startIcon={<SchoolRounded />} onClick={openMentorDrawer}>
            {myMentorRecord ? 'Edit Mentor Profile' : 'Become a Mentor'}
          </Button>
        ) : null}
      </Box>

      {error ? (
        <Alert
          severity="error"
          action={
            <Button size="small" color="inherit" startIcon={<RefreshRounded />} onClick={loadData}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      ) : null}

      <Card className="reveal-block reveal-delay-1">
        <Tabs
          value={tab}
          onChange={(_e, next) => setTab(next)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`Mentor Directory (${mentors.length})`} />
          <Tab label={`Received Requests (${received.length})`} />
          <Tab label={`Sent Requests (${sent.length})`} />
          <Tab label={`Sessions (${sessions.length})`} />
        </Tabs>

        <CardContent>
          {tab === 0 && (
            <Stack spacing={2.5}>
              <Box className="filter-bar">
                <TextField
                  size="small"
                  placeholder="Search mentor name, headline, or company"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  sx={{ flex: '1 1 240px' }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchRounded fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <TextField
                  size="small"
                  label="Expertise keyword"
                  placeholder="e.g. Cloud, Civil, Finance"
                  value={expertiseFilter}
                  onChange={(event) => setExpertiseFilter(event.target.value)}
                  sx={{ minWidth: 210 }}
                />
                {(search || expertiseFilter) ? (
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => {
                      setSearch('');
                      setExpertiseFilter('');
                    }}
                  >
                    Reset
                  </Button>
                ) : null}
              </Box>

              {loading ? (
                <Grid container spacing={2}>
                  {[1, 2, 3].map((idx) => (
                    <Grid key={idx} size={{ xs: 12, md: 6, lg: 4 }}>
                      <Skeleton variant="rounded" height={210} />
                    </Grid>
                  ))}
                </Grid>
              ) : mentors.length > 0 ? (
                <Grid container spacing={2.5} alignItems="stretch">
                  {mentors.map((mentor) => {
                    const isSelf = Number(mentor.user_id) === Number(currentUser.id);
                    const existingReq = sentByMentorId[Number(mentor.user_id)];
                    const slotsLeft = Math.max(0, Number(mentor.max_active_mentees || 0) - Number(mentor.active_mentees || 0));

                    return (
                      <Grid key={mentor.user_id} size={{ xs: 12, md: 6, lg: 4 }}>
                        <Card className="job-card" variant="outlined">
                          <CardContent className="job-card__content">
                            <Stack spacing={1.25} sx={{ flex: 1 }}>
                              <Stack direction="row" spacing={1.5} alignItems="center">
                                <ProtectedAvatar sx={{ width: 44, height: 44 }}>
                                  {mentor.full_name?.slice(0, 1)}
                                </ProtectedAvatar>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="subtitle1" fontWeight={700} noWrap>
                                    {mentor.full_name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                                    {[mentor.current_role, mentor.current_company].filter(Boolean).join(' · ') || mentor.headline}
                                  </Typography>
                                </Box>
                              </Stack>

                              <Typography variant="body2" fontWeight={600}>
                                {mentor.headline}
                              </Typography>

                              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                <Chip label={`${mentor.years_of_experience || 0} yrs exp`} size="small" />
                                <Chip
                                  label={`${slotsLeft} seat${slotsLeft === 1 ? '' : 's'} open`}
                                  size="small"
                                  color={slotsLeft > 0 ? 'success' : 'default'}
                                  variant="outlined"
                                />
                              </Stack>

                              <Typography variant="body2" color="text.secondary">
                                Expertise: {mentor.areas_of_expertise}
                              </Typography>
                            </Stack>

                            <Box className="job-card__footer">
                              <Button size="small" variant="outlined" onClick={() => setViewMentor(mentor)}>
                                Profile
                              </Button>
                              {isSelf ? (
                                <Chip label="Your mentor profile" size="small" variant="outlined" />
                              ) : existingReq ? (
                                <Chip label={`Requested (${existingReq.status})`} size="small" color="info" variant="outlined" />
                              ) : canRequest && slotsLeft > 0 ? (
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => {
                                    setRequestTarget(mentor);
                                    setRequestForm({ careerInterests: '', expectations: '', message: '' });
                                  }}
                                >
                                  Request Mentorship
                                </Button>
                              ) : null}
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              ) : (
                <EmptyState
                  icon={<PersonSearchRounded />}
                  title="No mentors match your filter"
                  description="Verified alumni and senior practitioners who opt in as mentors will appear here."
                />
              )}
            </Stack>
          )}

          {tab === 1 && (
            loading ? (
              <Skeleton variant="rounded" height={180} />
            ) : received.length > 0 ? (
              <Stack spacing={1.5}>
                {received.map((req) => (
                  <Box key={req.id} className="history-item">
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {req.other_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {req.other_email} {req.current_role ? `· ${req.current_role}` : ''}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={req.status}
                          size="small"
                          color={req.status === 'accepted' ? 'success' : req.status === 'rejected' ? 'error' : 'warning'}
                          variant="outlined"
                        />
                        {req.status === 'pending' ? (
                          <>
                            <Button size="small" variant="contained" onClick={() => handleRespondRequest(req.id, 'accepted')}>
                              Accept
                            </Button>
                            <Button size="small" color="error" variant="outlined" onClick={() => handleRespondRequest(req.id, 'rejected')}>
                              Decline
                            </Button>
                          </>
                        ) : req.status === 'accepted' ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<CalendarMonthRounded />}
                            onClick={() => {
                              setSessionTarget(req);
                              setSessionForm(emptySessionForm);
                            }}
                          >
                            Schedule Session
                          </Button>
                        ) : null}
                      </Stack>
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Interests:</strong> {req.career_interests}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Expectations:</strong> {req.expectations}
                    </Typography>
                    {req.message ? (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {req.message}
                      </Typography>
                    ) : null}
                  </Box>
                ))}
              </Stack>
            ) : (
              <EmptyState
                compact
                icon={<HandshakeRounded />}
                title="No incoming mentorship requests"
                description="Mentorship requests sent to you by students or junior alumni will appear here."
              />
            )
          )}

          {tab === 2 && (
            loading ? (
              <Skeleton variant="rounded" height={180} />
            ) : sent.length > 0 ? (
              <Stack spacing={1.5}>
                {sent.map((req) => (
                  <Box key={req.id} className="history-item">
                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={700}>
                          Mentor: {req.other_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {req.other_email} {req.current_role ? `· ${req.current_role}` : ''}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={req.status}
                          size="small"
                          color={req.status === 'accepted' ? 'success' : req.status === 'rejected' ? 'error' : 'warning'}
                          variant="outlined"
                        />
                        {req.status === 'accepted' ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<CalendarMonthRounded />}
                            onClick={() => {
                              setSessionTarget(req);
                              setSessionForm(emptySessionForm);
                            }}
                          >
                            Schedule Session
                          </Button>
                        ) : null}
                      </Stack>
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Interests:</strong> {req.career_interests}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Expectations:</strong> {req.expectations}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <EmptyState
                compact
                icon={<HandshakeRounded />}
                title="No sent mentorship requests"
                description="Browse the Mentor Directory tab to request guidance from experienced alumni."
              />
            )
          )}

          {tab === 3 && (
            loading ? (
              <Skeleton variant="rounded" height={180} />
            ) : sessions.length > 0 ? (
              <Stack spacing={1.5}>
                {sessions.map((session) => (
                  <Box key={session.id} className="history-item">
                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {session.scheduled_at} · {session.duration_minutes} min ({session.meeting_mode})
                        </Typography>
                        {session.location_or_link ? (
                          <Typography variant="body2" color="text.secondary">
                            Venue / Link: {session.location_or_link}
                          </Typography>
                        ) : null}
                        {session.notes ? (
                          <Typography variant="body2" color="text.secondary">
                            Notes: {session.notes}
                          </Typography>
                        ) : null}
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={session.status}
                          size="small"
                          color={session.status === 'completed' ? 'success' : 'primary'}
                          variant="outlined"
                        />
                        {session.status !== 'completed' && Number(session.mentor_id) === Number(currentUser.id) ? (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<CheckCircleOutlineRounded />}
                            onClick={() => {
                              setCompleteTarget(session);
                              setCompleteNotes(session.notes || '');
                            }}
                          >
                            Mark Completed
                          </Button>
                        ) : null}
                      </Stack>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            ) : (
              <EmptyState
                compact
                icon={<CalendarMonthRounded />}
                title="No mentorship sessions scheduled"
                description="Once a mentorship request is accepted, you can schedule structured check-in sessions here."
              />
            )
          )}
        </CardContent>
      </Card>

      <Drawer anchor="right" open={mentorDrawerOpen} onClose={() => setMentorDrawerOpen(false)}>
        <Box className="drawer-form">
          <Box className="drawer-form__header">
            <Box>
              <Typography variant="h6">Mentor Profile</Typography>
              <Typography variant="body2" color="text.secondary">
                Share your expertise so students and graduates can request guidance.
              </Typography>
            </Box>
            <IconButton onClick={() => setMentorDrawerOpen(false)} aria-label="Close">
              <CloseRounded />
            </IconButton>
          </Box>
          <Box component="form" onSubmit={handleSaveMentorProfile}>
            <Stack spacing={2}>
              <TextField
                label="Mentor headline"
                placeholder="e.g. Senior Systems Architect & Career Advisor"
                value={mentorForm.headline}
                onChange={(e) => setMentorForm((p) => ({ ...p, headline: e.target.value }))}
                size="small"
                fullWidth
                required
              />
              <TextField
                label="Areas of expertise (comma separated)"
                placeholder="Software Engineering, Cloud Architecture, Interview Prep"
                value={mentorForm.areasOfExpertise}
                onChange={(e) => setMentorForm((p) => ({ ...p, areasOfExpertise: e.target.value }))}
                size="small"
                fullWidth
                required
              />
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    label="Years of experience"
                    type="number"
                    value={mentorForm.yearsOfExperience}
                    onChange={(e) => setMentorForm((p) => ({ ...p, yearsOfExperience: e.target.value }))}
                    size="small"
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    label="Max active mentees"
                    type="number"
                    value={mentorForm.maxActiveMentees}
                    onChange={(e) => setMentorForm((p) => ({ ...p, maxActiveMentees: e.target.value }))}
                    size="small"
                    fullWidth
                    required
                  />
                </Grid>
              </Grid>
              <TextField
                label="Professional background"
                multiline
                minRows={3}
                value={mentorForm.professionalBackground}
                onChange={(e) => setMentorForm((p) => ({ ...p, professionalBackground: e.target.value }))}
                size="small"
                fullWidth
                required
              />
              <TextField
                label="Mentorship interests & topics"
                multiline
                minRows={2}
                value={mentorForm.mentorshipInterests}
                onChange={(e) => setMentorForm((p) => ({ ...p, mentorshipInterests: e.target.value }))}
                size="small"
                fullWidth
              />
              <Stack direction="row" spacing={1.25} justifyContent="flex-end">
                <Button variant="outlined" color="inherit" onClick={() => setMentorDrawerOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" disabled={savingMentor}>
                  {savingMentor ? 'Saving...' : 'Save Mentor Profile'}
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Box>
      </Drawer>

      <Dialog open={Boolean(viewMentor)} onClose={() => setViewMentor(null)} maxWidth="sm" fullWidth>
        {viewMentor ? (
          <>
            <DialogTitle>{viewMentor.full_name}</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" color="primary">
                  {viewMentor.headline}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {[viewMentor.current_role, viewMentor.current_company, viewMentor.location].filter(Boolean).join(' · ')}
                </Typography>
                <Divider />
                <Typography variant="body2">
                  <strong>Expertise:</strong> {viewMentor.areas_of_expertise}
                </Typography>
                <Typography variant="body2">
                  <strong>Background:</strong> {viewMentor.professional_background}
                </Typography>
                {viewMentor.mentorship_interests ? (
                  <Typography variant="body2">
                    <strong>Focus Areas:</strong> {viewMentor.mentorship_interests}
                  </Typography>
                ) : null}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setViewMentor(null)}>Close</Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>

      <Dialog open={Boolean(requestTarget)} onClose={() => setRequestTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Mentorship · {requestTarget?.full_name}</DialogTitle>
        <Box component="form" onSubmit={handleSendRequest}>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                label="Career interests"
                value={requestForm.careerInterests}
                onChange={(e) => setRequestForm((p) => ({ ...p, careerInterests: e.target.value }))}
                size="small"
                fullWidth
                required
              />
              <TextField
                label="What you hope to gain (expectations)"
                multiline
                minRows={2}
                value={requestForm.expectations}
                onChange={(e) => setRequestForm((p) => ({ ...p, expectations: e.target.value }))}
                size="small"
                fullWidth
                required
              />
              <TextField
                label="Introduction message (optional)"
                multiline
                minRows={2}
                value={requestForm.message}
                onChange={(e) => setRequestForm((p) => ({ ...p, message: e.target.value }))}
                size="small"
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRequestTarget(null)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={submittingRequest}>
              {submittingRequest ? 'Sending...' : 'Send Request'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(sessionTarget)} onClose={() => setSessionTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule Session · {sessionTarget?.other_name}</DialogTitle>
        <Box component="form" onSubmit={handleScheduleSession}>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                label="Date & Time"
                type="datetime-local"
                value={sessionForm.scheduledAt}
                onChange={(e) => setSessionForm((p) => ({ ...p, scheduledAt: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
                size="small"
                fullWidth
                required
              />
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    label="Duration (minutes)"
                    type="number"
                    value={sessionForm.durationMinutes}
                    onChange={(e) => setSessionForm((p) => ({ ...p, durationMinutes: e.target.value }))}
                    size="small"
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    select
                    label="Meeting mode"
                    value={sessionForm.meetingMode}
                    onChange={(e) => setSessionForm((p) => ({ ...p, meetingMode: e.target.value }))}
                    size="small"
                    fullWidth
                  >
                    {SESSION_MODES.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
              <TextField
                label="Meeting link or location"
                value={sessionForm.locationOrLink}
                onChange={(e) => setSessionForm((p) => ({ ...p, locationOrLink: e.target.value }))}
                size="small"
                fullWidth
              />
              <TextField
                label="Agenda / notes"
                multiline
                minRows={2}
                value={sessionForm.notes}
                onChange={(e) => setSessionForm((p) => ({ ...p, notes: e.target.value }))}
                size="small"
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSessionTarget(null)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={submittingSession}>
              {submittingSession ? 'Scheduling...' : 'Schedule Session'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(completeTarget)} onClose={() => setCompleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Complete Mentorship Session</DialogTitle>
        <DialogContent dividers>
          <TextField
            label="Session summary & action items"
            multiline
            minRows={3}
            value={completeNotes}
            onChange={(e) => setCompleteNotes(e.target.value)}
            size="small"
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteTarget(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleCompleteSession}>
            Confirm Completion
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
