import { useCallback, useEffect, useState } from 'react';
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
  Drawer,
  Grid,
  IconButton,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  AddRounded,
  CloseRounded,
  DeleteOutlineRounded,
  EditRounded,
  EventAvailableRounded,
  EventBusyRounded,
  GroupsRounded,
  PhotoCameraRounded,
  RefreshRounded,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState.jsx';
import { ProtectedMediaPreview } from '../components/ProtectedAsset.jsx';
import { apiRequest } from '../api/client.js';
import {
  canManageEvents,
  EVENT_CATEGORIES,
  getEventCategoryLabel,
} from '../data/platformConfig.js';
import '../styles/feature-pages.scss';

const emptyEventForm = {
  title: '',
  category: 'conference',
  venue: '',
  eventDate: '',
  startsAt: '09:00',
  endsAt: '16:00',
  registrationDeadline: '',
  availableSeats: 60,
  description: '',
  status: 'published',
};

export default function EventsPage({ currentUser }) {
  const canManage = canManageEvents(currentUser);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [upcomingOnly, setUpcomingOnly] = useState('true');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(emptyEventForm);
  const [posterFile, setPosterFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const [participantsEvent, setParticipantsEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = {};
      if (categoryFilter) query.category = categoryFilter;
      if (upcomingOnly) query.upcoming = upcomingOnly;

      const data = await apiRequest('events', { query });
      setEvents(Array.isArray(data?.events) ? data.events : []);
    } catch (err) {
      setError(err.message || 'Could not load events.');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, upcomingOnly]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const openCreateDrawer = () => {
    setEditingEvent(null);
    setForm(emptyEventForm);
    setPosterFile(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (ev) => {
    setEditingEvent(ev);
    setForm({
      title: ev.title || '',
      category: ev.category || 'conference',
      venue: ev.venue || '',
      eventDate: ev.event_date || '',
      startsAt: ev.starts_at ? String(ev.starts_at).slice(0, 5) : '09:00',
      endsAt: ev.ends_at ? String(ev.ends_at).slice(0, 5) : '16:00',
      registrationDeadline: ev.registration_deadline ? String(ev.registration_deadline).slice(0, 10) : '',
      availableSeats: Number(ev.available_seats || 50),
      description: ev.description || '',
      status: ev.status || 'published',
    });
    setPosterFile(null);
    setDrawerOpen(true);
  };

  const handleSaveEvent = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.venue.trim() || !form.eventDate || !form.description.trim()) {
      toast.error('Please fill in all required event fields.');
      return;
    }

    const body = new FormData();
    body.append('title', form.title.trim());
    body.append('category', form.category);
    body.append('venue', form.venue.trim());
    body.append('eventDate', form.eventDate);
    body.append('startsAt', form.startsAt ? `${form.startsAt}:00` : '');
    body.append('endsAt', form.endsAt ? `${form.endsAt}:00` : '');
    body.append('registrationDeadline', form.registrationDeadline || '');
    body.append('availableSeats', String(form.availableSeats || 1));
    body.append('description', form.description.trim());
    body.append('status', form.status || 'published');
    if (posterFile) {
      body.append('poster', posterFile);
    }

    setSaving(true);
    try {
      if (editingEvent) {
        await apiRequest('event-update', {
          method: 'POST',
          query: { id: editingEvent.id },
          body,
        });
        toast.success('Event updated.');
      } else {
        await apiRequest('event-create', {
          method: 'POST',
          body,
        });
        toast.success('Event created.');
      }
      setDrawerOpen(false);
      await loadEvents();
    } catch (err) {
      toast.error(err.message || 'Could not save event.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteTarget) return;
    try {
      await apiRequest('event-delete', {
        method: 'DELETE',
        query: { id: deleteTarget.id },
      });
      setDeleteTarget(null);
      toast.success('Event deleted.');
      await loadEvents();
    } catch (err) {
      toast.error(err.message || 'Could not delete event.');
    }
  };

  const handleRegister = async (eventId) => {
    try {
      await apiRequest('event-register', {
        method: 'POST',
        query: { id: eventId },
      });
      toast.success('Seat reserved!');
      await loadEvents();
    } catch (err) {
      toast.error(err.message || 'Could not register for event.');
    }
  };

  const handleCancelRegistration = async (eventId) => {
    try {
      await apiRequest('event-cancel', {
        method: 'POST',
        query: { id: eventId },
      });
      toast.success('Registration cancelled.');
      await loadEvents();
    } catch (err) {
      toast.error(err.message || 'Could not cancel registration.');
    }
  };

  const openParticipants = async (ev) => {
    setParticipantsEvent(ev);
    setParticipantsLoading(true);
    try {
      const data = await apiRequest('event', { query: { id: ev.id } });
      setParticipants(Array.isArray(data?.participants) ? data.participants : []);
    } catch (err) {
      toast.error(err.message || 'Could not load participants.');
      setParticipants([]);
    } finally {
      setParticipantsLoading(false);
    }
  };

  const handleMarkAttendance = async (userId, status) => {
    if (!participantsEvent) return;
    try {
      await apiRequest('event-attendance', {
        method: 'POST',
        query: { id: participantsEvent.id, userId, status },
      });
      setParticipants((prev) =>
        prev.map((row) => (Number(row.user_id) === Number(userId) ? { ...row, status } : row)),
      );
      toast.success(`Marked ${status}.`);
      await loadEvents();
    } catch (err) {
      toast.error(err.message || 'Could not update attendance.');
    }
  };

  return (
    <Stack spacing={3}>
      <Box className="page-header reveal-block">
        <Box>
          <Typography variant="h4">Events &amp; Gatherings</Typography>
          <Typography variant="body1" color="text.secondary" className="page-header__copy">
            Workshops, career fairs, institutional seminars, and annual alumni reunions with seat capacity tracking.
          </Typography>
        </Box>

        {canManage ? (
          <Button variant="contained" startIcon={<AddRounded />} onClick={openCreateDrawer}>
            Create Event
          </Button>
        ) : null}
      </Box>

      <Card className="reveal-block reveal-delay-1">
        <CardContent>
          <Box className="filter-bar">
            <TextField
              size="small"
              select
              label="Category"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">All categories</MenuItem>
              {EVENT_CATEGORIES.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              select
              label="Schedule"
              value={upcomingOnly}
              onChange={(event) => setUpcomingOnly(event.target.value)}
              sx={{ minWidth: 165 }}
            >
              <MenuItem value="true">Upcoming only</MenuItem>
              <MenuItem value="false">All events</MenuItem>
            </TextField>
          </Box>
        </CardContent>
      </Card>

      {error ? (
        <Alert
          severity="error"
          action={
            <Button size="small" color="inherit" startIcon={<RefreshRounded />} onClick={loadEvents}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Grid container spacing={2.5}>
          {[1, 2, 3].map((idx) => (
            <Grid key={idx} size={{ xs: 12, md: 6, lg: 4 }}>
              <Skeleton variant="rounded" height={280} />
            </Grid>
          ))}
        </Grid>
      ) : events.length > 0 ? (
        <Grid container spacing={2.5} alignItems="stretch">
          {events.map((ev) => {
            const seatsTaken = Number(ev.registered_count ?? ev.seats_taken ?? 0);
            const totalSeats = Number(ev.available_seats || 0);
            const seatsRemaining = Math.max(0, totalSeats - seatsTaken);
            const isRegistered = ev.my_status === 'registered' || ev.my_status === 'attended';
            const isFull = seatsRemaining <= 0;

            return (
              <Grid key={ev.id} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card className="job-card reveal-block reveal-delay-2">
                  <CardContent className="job-card__content">
                    <Stack spacing={1.25} sx={{ flex: 1 }}>
                      {ev.poster_url ? (
                        <ProtectedMediaPreview src={ev.poster_url} alt={ev.title} />
                      ) : null}

                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                        <Box>
                          <Typography variant="h6">{ev.title}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {ev.venue}
                          </Typography>
                        </Box>
                        <Chip label={getEventCategoryLabel(ev.category)} size="small" variant="outlined" />
                      </Stack>

                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        <Chip label={`${ev.event_date}`} size="small" />
                        <Chip
                          label={`${seatsTaken}/${totalSeats} seats taken`}
                          size="small"
                          color={isFull ? 'warning' : 'success'}
                          variant="outlined"
                        />
                        {isRegistered ? (
                          <Chip label={`You: ${ev.my_status}`} size="small" color="primary" />
                        ) : null}
                        {ev.status !== 'published' ? (
                          <Chip label={ev.status} size="small" color="warning" />
                        ) : null}
                      </Stack>

                      <Typography variant="body2" color="text.secondary">
                        {ev.description}
                      </Typography>

                      <Typography variant="caption" color="text.secondary">
                        {ev.starts_at ? `Time: ${String(ev.starts_at).slice(0, 5)}` : ''}
                        {ev.ends_at ? ` - ${String(ev.ends_at).slice(0, 5)}` : ''}
                        {ev.registration_deadline ? ` · RSVP before ${String(ev.registration_deadline).slice(0, 10)}` : ''}
                      </Typography>
                    </Stack>

                    <Box className="job-card__footer">
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {isRegistered ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            disabled={ev.my_status === 'attended'}
                            onClick={() => handleCancelRegistration(ev.id)}
                          >
                            {ev.my_status === 'attended' ? 'Attended' : 'Cancel RSVP'}
                          </Button>
                        ) : ev.status === 'published' ? (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<EventAvailableRounded />}
                            disabled={isFull}
                            onClick={() => handleRegister(ev.id)}
                          >
                            {isFull ? 'Full' : 'Register'}
                          </Button>
                        ) : null}

                        {canManage ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<GroupsRounded />}
                            onClick={() => openParticipants(ev)}
                          >
                            Roster
                          </Button>
                        ) : null}
                      </Stack>

                      {canManage ? (
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" aria-label="Edit event" onClick={() => openEditDrawer(ev)}>
                            <EditRounded fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" aria-label="Delete event" onClick={() => setDeleteTarget(ev)}>
                            <DeleteOutlineRounded fontSize="small" />
                          </IconButton>
                        </Stack>
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
          icon={<EventBusyRounded />}
          title="No events match your criteria"
          description="Upcoming institutional reunions, seminars, and workshops will appear here once scheduled."
        />
      )}

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box className="drawer-form">
          <Box className="drawer-form__header">
            <Box>
              <Typography variant="h6">{editingEvent ? 'Edit Event' : 'Create Event'}</Typography>
              <Typography variant="body2" color="text.secondary">
                Publish schedules, venues, seat capacity, and event posters.
              </Typography>
            </Box>
            <IconButton onClick={() => setDrawerOpen(false)} aria-label="Close">
              <CloseRounded />
            </IconButton>
          </Box>
          <Box component="form" onSubmit={handleSaveEvent}>
            <Stack spacing={2}>
              <TextField
                label="Event title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                size="small"
                fullWidth
                required
              />
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    label="Category"
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    size="small"
                    fullWidth
                  >
                    {EVENT_CATEGORIES.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Available seats"
                    type="number"
                    value={form.availableSeats}
                    onChange={(e) => setForm((p) => ({ ...p, availableSeats: e.target.value }))}
                    size="small"
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Event date"
                    type="date"
                    value={form.eventDate}
                    onChange={(e) => setForm((p) => ({ ...p, eventDate: e.target.value }))}
                    slotProps={{ inputLabel: { shrink: true } }}
                    size="small"
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Registration deadline"
                    type="date"
                    value={form.registrationDeadline}
                    onChange={(e) => setForm((p) => ({ ...p, registrationDeadline: e.target.value }))}
                    slotProps={{ inputLabel: { shrink: true } }}
                    size="small"
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    label="Starts at"
                    type="time"
                    value={form.startsAt}
                    onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))}
                    slotProps={{ inputLabel: { shrink: true } }}
                    size="small"
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    label="Ends at"
                    type="time"
                    value={form.endsAt}
                    onChange={(e) => setForm((p) => ({ ...p, endsAt: e.target.value }))}
                    slotProps={{ inputLabel: { shrink: true } }}
                    size="small"
                    fullWidth
                  />
                </Grid>
              </Grid>
              <TextField
                label="Venue"
                value={form.venue}
                onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))}
                size="small"
                fullWidth
                required
              />
              {editingEvent ? (
                <TextField
                  select
                  label="Status"
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  size="small"
                  fullWidth
                >
                  <MenuItem value="published">Published</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                </TextField>
              ) : null}
              <TextField
                label="Event description"
                multiline
                minRows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                size="small"
                fullWidth
                required
              />
              <Box>
                <Button variant="outlined" component="label" size="small" startIcon={<PhotoCameraRounded />}>
                  Upload Event Poster (optional image)
                  <input
                    type="file"
                    hidden
                    accept=".png,.jpg,.jpeg,.webp"
                    onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
                  />
                </Button>
                {posterFile ? (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                    Selected: {posterFile.name}
                  </Typography>
                ) : null}
              </Box>
              <Stack direction="row" spacing={1.25} justifyContent="flex-end">
                <Button variant="outlined" color="inherit" onClick={() => setDrawerOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" disabled={saving}>
                  {saving ? 'Saving...' : editingEvent ? 'Save Changes' : 'Publish Event'}
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Box>
      </Drawer>

      <Dialog open={Boolean(participantsEvent)} onClose={() => setParticipantsEvent(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Participants &amp; Attendance · {participantsEvent?.title}</DialogTitle>
        <DialogContent dividers>
          {participantsLoading ? (
            <Skeleton variant="rounded" height={160} />
          ) : participants.length > 0 ? (
            <Stack spacing={1.5}>
              {participants.map((row) => (
                <Box key={row.id} className="history-item">
                  <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {row.full_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.email} {row.current_company ? `· ${row.current_company}` : ''}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Chip label={row.status} size="small" variant="outlined" />
                      <Button
                        size="small"
                        variant={row.status === 'attended' ? 'contained' : 'outlined'}
                        color="success"
                        onClick={() => handleMarkAttendance(row.user_id, 'attended')}
                      >
                        Attended
                      </Button>
                      <Button
                        size="small"
                        variant={row.status === 'absent' ? 'contained' : 'outlined'}
                        color="warning"
                        onClick={() => handleMarkAttendance(row.user_id, 'absent')}
                      >
                        Absent
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
          ) : (
            <EmptyState
              compact
              icon={<GroupsRounded />}
              title="No registrants yet"
              description="Members who reserve a seat for this event will appear here for attendance tracking."
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setParticipantsEvent(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete event?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Remove "{deleteTarget?.title}"? Existing RSVPs will also be removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteEvent}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
