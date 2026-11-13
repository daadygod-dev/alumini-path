import { useMemo, useState } from 'react';
import {
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
  InputAdornment,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  AddRounded,
  AttachFileRounded,
  CloseRounded,
  DeleteOutlineRounded,
  DescriptionRounded,
  DownloadRounded,
  GroupRounded,
  RestartAltRounded,
  SearchRounded,
  WorkOffOutlined,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState.jsx';
import { ProtectedMediaPreview } from '../components/ProtectedAsset.jsx';
import { apiRequest, downloadProtectedFile } from '../api/client.js';
import { createPreview, validateJobDocument } from '../utils/fileValidation.js';
import {
  canApplyToJobs,
  canManageJobs,
  getRoleLabel,
  JOB_EMPLOYMENT_TYPES,
} from '../data/platformConfig.js';
import '../styles/feature-pages.scss';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyForm = {
  title: '',
  company: '',
  location: '',
  type: 'full_time',
  sector: '',
  deadline: '',
  salaryMin: '',
  salaryMax: '',
  salaryCurrency: 'RWF',
  qualifications: '',
  applicationInstructions: '',
  description: '',
  contactEmail: '',
};

const APPLICATION_STATUS_OPTIONS = ['pending', 'reviewed', 'shortlisted', 'accepted', 'rejected'];
const JOB_STATUS_OPTIONS = ['open', 'closed', 'archived'];

export default function JobsPage({
  currentUser,
  jobs = [],
  lookups = { sectors: [] },
  loading = false,
  onAddJob,
  onDeleteJob,
  onUpdateJobStatus,
  onApplyJob,
}) {
  const canPublishJobs = canManageJobs(currentUser);
  const canApply = canApplyToJobs(currentUser);
  const sectors = lookups.sectors || [];

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [docTarget, setDocTarget] = useState(null);

  const [applyTarget, setApplyTarget] = useState(null);
  const [coverNote, setCoverNote] = useState('');
  const [cvFile, setCvFile] = useState(null);
  const [supportingFile, setSupportingFile] = useState(null);
  const [applying, setApplying] = useState(false);
  const [updatingJobId, setUpdatingJobId] = useState(null);

  const [applicantsTarget, setApplicantsTarget] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');

  const filteredJobs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesQuery = query
        ? job.title.toLowerCase().includes(query) ||
          job.company.toLowerCase().includes(query) ||
          job.description.toLowerCase().includes(query)
        : true;
      const matchesType = typeFilter ? job.type === typeFilter : true;
      const matchesSector = sectorFilter ? job.sector === sectorFilter : true;
      return matchesQuery && matchesType && matchesSector;
    });
  }, [jobs, searchQuery, sectorFilter, typeFilter]);

  const hasFilters = Boolean(searchQuery || typeFilter || sectorFilter);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDocumentChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const message = validateJobDocument(file);
    if (message) {
      setErrors((prev) => ({ ...prev, document: message }));
      return;
    }

    try {
      const nextPreview = await createPreview(file);
      setSelectedFile(file);
      setPreview(nextPreview);
      setErrors((prev) => ({ ...prev, document: '' }));
    } catch {
      setErrors((prev) => ({ ...prev, document: 'Unable to read the selected job brief.' }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = 'Job title is required.';
    if (!form.company.trim()) nextErrors.company = 'Company or organization is required.';
    if (!form.location.trim()) nextErrors.location = 'Location is required.';
    if (!form.type) nextErrors.type = 'Employment type is required.';
    if (!emailPattern.test(form.contactEmail.trim())) nextErrors.contactEmail = 'Enter a valid contact email.';
    if (!form.description.trim()) nextErrors.description = 'Description is required.';

    if (form.salaryMin && form.salaryMax && Number(form.salaryMin) > Number(form.salaryMax)) {
      nextErrors.salaryMax = 'Maximum salary must be at least minimum salary.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      toast.error('Please fix the highlighted fields.');
      return;
    }

    setSubmitting(true);
    const result = await onAddJob({
      ...form,
      documentFile: selectedFile,
    });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.reason || 'Could not publish opportunity.');
      return;
    }

    setForm(emptyForm);
    setSelectedFile(null);
    setPreview(null);
    setErrors({});
    setDrawerOpen(false);
    toast.success('Opportunity published.');
  };

  const handleJobStatusChange = async (jobId, status) => {
    if (!onUpdateJobStatus) return;
    setUpdatingJobId(jobId);
    const result = await onUpdateJobStatus(jobId, status);
    setUpdatingJobId(null);
    if (!result.ok) {
      toast.error(result.reason || 'Could not update opportunity status.');
      return;
    }
    toast.success(`Opportunity marked ${status}.`);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    const result = await onDeleteJob(deleteTarget.id);
    if (!result.ok) {
      toast.error(result.reason || 'Could not delete opportunity.');
      return;
    }
    setDeleteTarget(null);
    toast.success('Opportunity removed.');
  };

  const submitApplication = async (event) => {
    event.preventDefault();
    if (!applyTarget || !coverNote.trim()) {
      toast.error('Please write a short cover note before applying.');
      return;
    }

    setApplying(true);
    const result = await onApplyJob(applyTarget.id, {
      coverNote: coverNote.trim(),
      cvFile,
      supportingFile,
    });
    setApplying(false);

    if (!result.ok) {
      toast.error(result.reason || 'Could not submit application.');
      return;
    }

    setApplyTarget(null);
    setCoverNote('');
    setCvFile(null);
    setSupportingFile(null);
    toast.success('Application submitted.');
  };

  const openApplicants = async (job) => {
    setApplicantsTarget(job);
    setApplicantsLoading(true);
    try {
      const data = await apiRequest('job-applications', { query: { id: job.id } });
      setApplicants(Array.isArray(data?.applications) ? data.applications : []);
    } catch (error) {
      toast.error(error.message || 'Could not load applicants.');
      setApplicants([]);
    } finally {
      setApplicantsLoading(false);
    }
  };

  const handleStatusChange = async (applicationId, status) => {
    try {
      await apiRequest('application-status', {
        method: 'POST',
        query: { id: applicationId },
        body: { status },
      });
      setApplicants((prev) =>
        prev.map((app) => (Number(app.id) === Number(applicationId) ? { ...app, status } : app)),
      );
      toast.success('Application status updated.');
    } catch (error) {
      toast.error(error.message || 'Could not update application status.');
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('');
    setSectorFilter('');
  };

  const canManageSpecificJob = (job) =>
    currentUser.role === 'administrator' ||
    Number(job.postedById) === Number(currentUser.id);

  return (
    <Stack spacing={3}>
      <Box className="page-header reveal-block">
        <Box>
          <Typography variant="h4">Opportunity Board</Typography>
          <Typography variant="body1" color="text.secondary" className="page-header__copy">
            Open roles, internships, and referral briefs shared across the institutional network.
          </Typography>
        </Box>

        {canPublishJobs ? (
          <Button variant="contained" startIcon={<AddRounded />} onClick={() => setDrawerOpen(true)}>
            Post opportunity
          </Button>
        ) : null}
      </Box>

      <Card className="reveal-block reveal-delay-1">
        <CardContent>
          <Box className="filter-bar">
            <TextField
              size="small"
              placeholder="Search title, company, or description"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
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
              select
              label="Employment type"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              sx={{ minWidth: 165 }}
            >
              <MenuItem value="">All types</MenuItem>
              {JOB_EMPLOYMENT_TYPES.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              select
              label="Sector"
              value={sectorFilter}
              onChange={(event) => setSectorFilter(event.target.value)}
              sx={{ minWidth: 165 }}
            >
              <MenuItem value="">All sectors</MenuItem>
              {sectors.map((sector) => (
                <MenuItem key={sector.id} value={sector.name}>
                  {sector.name}
                </MenuItem>
              ))}
            </TextField>

            {hasFilters ? (
              <Button size="small" color="inherit" startIcon={<RestartAltRounded />} onClick={resetFilters}>
                Reset
              </Button>
            ) : null}
          </Box>
        </CardContent>
      </Card>

      {loading ? (
        <Grid container spacing={2.5}>
          {[1, 2, 3].map((idx) => (
            <Grid key={idx} size={{ xs: 12, md: 6, lg: 4 }}>
              <Skeleton variant="rounded" height={240} />
            </Grid>
          ))}
        </Grid>
      ) : filteredJobs.length > 0 ? (
        <Grid container spacing={2.5} alignItems="stretch">
          {filteredJobs.map((job) => {
            const isOwner = canManageSpecificJob(job);
            return (
              <Grid key={job.id} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card className="job-card reveal-block reveal-delay-2">
                  <CardContent className="job-card__content">
                    <Stack spacing={1.25} sx={{ flex: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                        <Box>
                          <Typography variant="h6">{job.title}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {[job.company, job.location].filter(Boolean).join(' · ')}
                          </Typography>
                        </Box>
                        <Chip label={job.typeLabel} size="small" variant="outlined" />
                      </Stack>

                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        {job.sector ? <Chip label={job.sector} size="small" /> : null}
                        <Chip
                          label={`${job.applicationCount} ${job.applicationCount === 1 ? 'applicant' : 'applicants'}`}
                          size="small"
                          variant="outlined"
                        />
                        {job.myApplication ? (
                          <Chip
                            label={`Applied · ${job.myApplication.status}`}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        ) : null}
                        {job.status !== 'open' ? (
                          <Chip label={job.status} size="small" color="warning" />
                        ) : null}
                      </Stack>

                      <Typography variant="body2" color="text.secondary">
                        {job.description}
                      </Typography>

                      {job.salaryMin || job.salaryMax ? (
                        <Typography variant="caption" fontWeight={600} color="primary">
                          Compensation:{' '}
                          {job.salaryMin && job.salaryMax
                            ? `${Number(job.salaryMin).toLocaleString()} - ${Number(job.salaryMax).toLocaleString()} ${job.salaryCurrency || 'RWF'}`
                            : `${Number(job.salaryMin || job.salaryMax).toLocaleString()} ${job.salaryCurrency || 'RWF'}`}
                        </Typography>
                      ) : null}

                      {job.qualifications ? (
                        <Typography variant="caption" color="text.secondary">
                          Qualifications: {job.qualifications}
                        </Typography>
                      ) : null}

                      {job.applicationInstructions ? (
                        <Typography variant="caption" color="text.secondary">
                          How to apply: {job.applicationInstructions}
                        </Typography>
                      ) : null}

                      <Typography variant="caption" color="text.secondary">
                        Posted by {job.postedBy} ({getRoleLabel(job.postedByRole)})
                        {job.postedOn ? ` · ${job.postedOn}` : ''}
                        {job.deadline ? ` · Closes ${job.deadline}` : ''}
                      </Typography>
                    </Stack>

                    <Box className="job-card__footer">
                      <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                        {job.documentUrl ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<DescriptionRounded />}
                            onClick={() => setDocTarget(job)}
                          >
                            Brief
                          </Button>
                        ) : null}

                        {isOwner ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<GroupRounded />}
                            onClick={() => openApplicants(job)}
                          >
                            Applicants
                          </Button>
                        ) : null}

                        {canApply && !isOwner && job.status === 'open' && !job.myApplication ? (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => {
                              setApplyTarget(job);
                              setCoverNote('');
                              setCvFile(null);
                              setSupportingFile(null);
                            }}
                          >
                            Apply
                          </Button>
                        ) : null}
                      </Stack>

                      {isOwner ? (
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          {onUpdateJobStatus ? (
                            <TextField
                              select
                              size="small"
                              value={job.status}
                              disabled={updatingJobId === job.id}
                              onChange={(event) => handleJobStatusChange(job.id, event.target.value)}
                              sx={{ minWidth: 102 }}
                              aria-label="Job status"
                            >
                              {JOB_STATUS_OPTIONS.map((opt) => (
                                <MenuItem key={opt} value={opt}>
                                  {opt}
                                </MenuItem>
                              ))}
                            </TextField>
                          ) : null}
                          <IconButton
                            size="small"
                            color="error"
                            aria-label="Delete job"
                            onClick={() => setDeleteTarget(job)}
                          >
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
          icon={<WorkOffOutlined />}
          title={jobs.length === 0 ? 'No opportunities posted yet' : 'No opportunities match those filters'}
          description={
            jobs.length === 0
              ? 'New job referrals and internships published by alumni and staff will appear here.'
              : 'Clear or adjust your search criteria to see all published openings.'
          }
          actionLabel={hasFilters ? 'Clear filters' : ''}
          onAction={hasFilters ? resetFilters : null}
        />
      )}

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box className="drawer-form">
          <Box className="drawer-form__header">
            <Box>
              <Typography variant="h6">Post an opportunity</Typography>
              <Typography variant="body2" color="text.secondary">
                Publish a referral role or internship directly to the board.
              </Typography>
            </Box>
            <IconButton onClick={() => setDrawerOpen(false)} aria-label="Close">
              <CloseRounded />
            </IconButton>
          </Box>

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Job title"
                name="title"
                value={form.title}
                onChange={handleChange}
                error={Boolean(errors.title)}
                helperText={errors.title}
                size="small"
                fullWidth
                required
              />
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Company / organization"
                    name="company"
                    value={form.company}
                    onChange={handleChange}
                    error={Boolean(errors.company)}
                    helperText={errors.company}
                    size="small"
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Location"
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    error={Boolean(errors.location)}
                    helperText={errors.location}
                    size="small"
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Employment type"
                    name="type"
                    select
                    value={form.type}
                    onChange={handleChange}
                    error={Boolean(errors.type)}
                    helperText={errors.type}
                    size="small"
                    fullWidth
                    required
                  >
                    {JOB_EMPLOYMENT_TYPES.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Sector"
                    name="sector"
                    select
                    value={form.sector}
                    onChange={handleChange}
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
                    label="Contact email"
                    name="contactEmail"
                    type="email"
                    value={form.contactEmail}
                    onChange={handleChange}
                    error={Boolean(errors.contactEmail)}
                    helperText={errors.contactEmail}
                    size="small"
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Application deadline"
                    name="deadline"
                    type="date"
                    value={form.deadline}
                    onChange={handleChange}
                    slotProps={{ inputLabel: { shrink: true } }}
                    size="small"
                    fullWidth
                  />
                </Grid>
              </Grid>

              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Salary min"
                    name="salaryMin"
                    type="number"
                    value={form.salaryMin}
                    onChange={handleChange}
                    size="small"
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Salary max"
                    name="salaryMax"
                    type="number"
                    value={form.salaryMax}
                    onChange={handleChange}
                    error={Boolean(errors.salaryMax)}
                    helperText={errors.salaryMax}
                    size="small"
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Currency"
                    name="salaryCurrency"
                    select
                    value={form.salaryCurrency}
                    onChange={handleChange}
                    size="small"
                    fullWidth
                  >
                    <MenuItem value="RWF">RWF</MenuItem>
                    <MenuItem value="USD">USD</MenuItem>
                    <MenuItem value="EUR">EUR</MenuItem>
                  </TextField>
                </Grid>
              </Grid>

              <TextField
                label="Qualifications"
                name="qualifications"
                value={form.qualifications}
                onChange={handleChange}
                size="small"
                fullWidth
              />
              <TextField
                label="Application instructions"
                name="applicationInstructions"
                value={form.applicationInstructions}
                onChange={handleChange}
                size="small"
                fullWidth
              />
              <TextField
                label="Role description"
                name="description"
                value={form.description}
                onChange={handleChange}
                error={Boolean(errors.description)}
                helperText={errors.description}
                multiline
                minRows={3}
                size="small"
                fullWidth
                required
              />

              <Box>
                <Button variant="outlined" component="label" startIcon={<AttachFileRounded />} size="small">
                  Attach brief (PDF or image)
                  <input type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={handleDocumentChange} />
                </Button>
                {errors.document ? (
                  <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
                    {errors.document}
                  </Typography>
                ) : null}
                {preview ? (
                  <Box className="file-preview file-preview--document">
                    <Typography variant="caption" fontWeight={600}>
                      {preview.name}
                    </Typography>
                    {preview.type?.startsWith('image/') ? (
                      <Box component="img" src={preview.url} alt={preview.name} className="file-preview__image" />
                    ) : null}
                  </Box>
                ) : null}
              </Box>

              <Stack direction="row" spacing={1.25} justifyContent="flex-end" sx={{ pt: 1 }}>
                <Button variant="outlined" color="inherit" onClick={() => setDrawerOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" disabled={submitting}>
                  {submitting ? 'Publishing...' : 'Publish'}
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Box>
      </Drawer>

      <Dialog open={Boolean(applyTarget)} onClose={() => setApplyTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Apply for {applyTarget?.title}</DialogTitle>
        <Box component="form" onSubmit={submitApplication}>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                label="Cover note"
                value={coverNote}
                onChange={(event) => setCoverNote(event.target.value)}
                multiline
                minRows={4}
                placeholder="Introduce your relevant experience and interest in this role."
                fullWidth
                required
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Box>
                  <Button variant="outlined" component="label" startIcon={<AttachFileRounded />} size="small">
                    Upload CV (optional PDF)
                    <input
                      type="file"
                      hidden
                      accept=".pdf"
                      onChange={(event) => setCvFile(event.target.files?.[0] || null)}
                    />
                  </Button>
                  {cvFile ? (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                      CV: {cvFile.name}
                    </Typography>
                  ) : null}
                </Box>
                <Box>
                  <Button variant="outlined" component="label" startIcon={<AttachFileRounded />} size="small">
                    Supporting document (optional)
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={(event) => setSupportingFile(event.target.files?.[0] || null)}
                    />
                  </Button>
                  {supportingFile ? (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                      Doc: {supportingFile.name}
                    </Typography>
                  ) : null}
                </Box>
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setApplyTarget(null)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={applying}>
              {applying ? 'Submitting...' : 'Submit application'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(applicantsTarget)} onClose={() => setApplicantsTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Applicants · {applicantsTarget?.title}</DialogTitle>
        <DialogContent dividers>
          {applicantsLoading ? (
            <Stack spacing={1.25}>
              <Skeleton variant="rounded" height={64} />
              <Skeleton variant="rounded" height={64} />
            </Stack>
          ) : applicants.length > 0 ? (
            <Stack spacing={1.5}>
              {applicants.map((app) => (
                <Box key={app.id} className="history-item">
                  <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap">
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {app.applicant_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {app.applicant_email}
                        {app.department_name ? ` · ${app.department_name}` : ''}
                        {app.graduation_year ? ` · Cohort ${app.graduation_year}` : ''}
                      </Typography>
                    </Box>

                    <TextField
                      select
                      size="small"
                      value={app.status}
                      onChange={(event) => handleStatusChange(app.id, event.target.value)}
                      sx={{ minWidth: 135 }}
                    >
                      {APPLICATION_STATUS_OPTIONS.map((statusOption) => (
                        <MenuItem key={statusOption} value={statusOption}>
                          {statusOption}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>

                  {app.cover_note ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {app.cover_note}
                    </Typography>
                  ) : null}

                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.75 }}>
                    {app.cv_file_id ? (
                      <Button
                        size="small"
                        startIcon={<DownloadRounded />}
                        onClick={() =>
                          downloadProtectedFile(
                            `api/files.php?id=${app.cv_file_id}`,
                            `${app.applicant_name || 'applicant'}-cv.pdf`,
                          ).catch(() => toast.error('Could not download CV.'))
                        }
                      >
                        Download CV
                      </Button>
                    ) : null}
                    {(app.supporting_documents || []).map((doc) => (
                      <Button
                        key={doc.id}
                        size="small"
                        variant="outlined"
                        startIcon={<DownloadRounded />}
                        onClick={() =>
                          downloadProtectedFile(
                            doc.download_url || `api/files.php?id=${doc.id}`,
                            doc.original_name || 'supporting-document',
                          ).catch(() => toast.error('Could not download supporting document.'))
                        }
                      >
                        {doc.original_name || 'Supporting doc'}
                      </Button>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          ) : (
            <EmptyState
              compact
              icon={<GroupRounded fontSize="small" />}
              title="No applications yet"
              description="Applicants who submit a cover note or CV will appear here."
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApplicantsTarget(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(docTarget)} onClose={() => setDocTarget(null)} maxWidth="md" fullWidth>
        <DialogTitle>{docTarget?.documentName || 'Job brief'}</DialogTitle>
        <DialogContent dividers>
          {docTarget?.documentUrl ? (
            <Stack spacing={2} alignItems="flex-start">
              <ProtectedMediaPreview
                src={docTarget.documentUrl}
                mimeType={docTarget.documentType}
                alt={docTarget.documentName || 'Job brief'}
              />
              <Button
                variant="contained"
                startIcon={<DownloadRounded />}
                onClick={() =>
                  downloadProtectedFile(docTarget.documentUrl, docTarget.documentName || 'job-brief').catch(
                    () => toast.error('Unable to download file.'),
                  )
                }
              >
                Download {docTarget.documentName}
              </Button>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocTarget(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete opportunity?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Remove "{deleteTarget?.title}" from the opportunity board? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
