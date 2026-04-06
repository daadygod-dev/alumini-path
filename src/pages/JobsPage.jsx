import { useState } from 'react';
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
  Grid,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AttachFileRounded, DeleteOutlineRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { createPreview, validateJobDocument } from '../utils/fileValidation.js';
import '../styles/feature-pages.scss';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyForm = {
  title: '',
  company: '',
  location: '',
  type: '',
  sector: '',
  qualifications: '',
  description: '',
  contactEmail: '',
  applicants: '',
};

export default function JobsPage({ jobs, onAddJob, onDeleteJob }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDocumentChange = async (event) => {
    const file = event.target.files?.[0];
    const message = validateJobDocument(file);

    if (message) {
      setErrors((prev) => ({ ...prev, document: message }));
      return;
    }

    try {
      const nextPreview = await createPreview(file);
      setPreview(nextPreview);
      setErrors((prev) => ({ ...prev, document: '' }));
    } catch {
      setErrors((prev) => ({ ...prev, document: 'Unable to load the selected job document.' }));
    }
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.title.trim()) nextErrors.title = 'Job title is required.';
    if (!form.company.trim()) nextErrors.company = 'Company is required.';
    if (!form.type) nextErrors.type = 'Select the job type.';
    if (!form.sector) nextErrors.sector = 'Select a sector.';
    if (!form.qualifications.trim()) nextErrors.qualifications = 'Qualifications are required.';
    if (!form.description.trim()) nextErrors.description = 'Description is required.';
    if (!emailPattern.test(form.contactEmail)) nextErrors.contactEmail = 'Enter a valid contact email.';
    if (!preview) nextErrors.document = 'Upload a job description document.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validateForm()) {
      toast.error('Resolve the job form validation issues first.');
      return;
    }

    onAddJob({
      ...form,
      postedDate: new Date().toISOString().slice(0, 10),
      qualifications: form.qualifications.split(',').map((item) => item.trim()).filter(Boolean),
      applicants: form.applicants.split(',').map((item) => item.trim()).filter(Boolean),
      document: preview,
    });

    setForm(emptyForm);
    setPreview(null);
    setErrors({});
    toast.success('Job referral published.');
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Job Referral Module</Typography>
        <Typography variant="body1" color="text.secondary">
          Publish alumni referrals, upload previewable PDF or image briefs, capture qualifications, and track applicant
          pipelines.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, xl: 4 }}>
          <Card elevation={0} className="feature-card">
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Post a new job
              </Typography>
              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  <Grid size={12}>
                    <TextField
                      label="Job title"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      error={Boolean(errors.title)}
                      helperText={errors.title}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Company"
                      name="company"
                      value={form.company}
                      onChange={handleChange}
                      error={Boolean(errors.company)}
                      helperText={errors.company}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Location" name="location" value={form.location} onChange={handleChange} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Job type"
                      name="type"
                      select
                      value={form.type}
                      onChange={handleChange}
                      error={Boolean(errors.type)}
                      helperText={errors.type}
                      fullWidth
                    >
                      <MenuItem value="Full-time">Full-time</MenuItem>
                      <MenuItem value="Part-time">Part-time</MenuItem>
                      <MenuItem value="Internship">Internship</MenuItem>
                      <MenuItem value="Contract">Contract</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Sector"
                      name="sector"
                      select
                      value={form.sector}
                      onChange={handleChange}
                      error={Boolean(errors.sector)}
                      helperText={errors.sector}
                      fullWidth
                    >
                      <MenuItem value="Software">Software</MenuItem>
                      <MenuItem value="Analytics">Analytics</MenuItem>
                      <MenuItem value="Education">Education</MenuItem>
                      <MenuItem value="Operations">Operations</MenuItem>
                      <MenuItem value="Finance">Finance</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid size={12}>
                    <TextField
                      label="Qualifications"
                      name="qualifications"
                      value={form.qualifications}
                      onChange={handleChange}
                      helperText={errors.qualifications || 'Separate items with commas.'}
                      error={Boolean(errors.qualifications)}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={12}>
                    <TextField
                      label="Job summary"
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      error={Boolean(errors.description)}
                      helperText={errors.description}
                      multiline
                      minRows={3}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={12}>
                    <TextField
                      label="Applicant tracker"
                      name="applicants"
                      value={form.applicants}
                      onChange={handleChange}
                      helperText="Optional comma-separated applicant names."
                      fullWidth
                    />
                  </Grid>
                  <Grid size={12}>
                    <TextField
                      label="Contact email"
                      name="contactEmail"
                      value={form.contactEmail}
                      onChange={handleChange}
                      error={Boolean(errors.contactEmail)}
                      helperText={errors.contactEmail}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={12}>
                    <Button component="label" variant="outlined" fullWidth startIcon={<AttachFileRounded />}>
                      Upload job brief
                      <input hidden type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={handleDocumentChange} />
                    </Button>
                    <Typography variant="caption" color={errors.document ? 'error' : 'text.secondary'}>
                      {errors.document || 'Accepted types: PDF, JPG, PNG, WEBP. Max size: 5MB.'}
                    </Typography>
                    {preview && (
                      <Box className="file-preview file-preview--document">
                        <Box>
                          <Typography variant="body2">{preview.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {(preview.size / 1024).toFixed(1)} KB
                          </Typography>
                        </Box>
                        {preview.type.startsWith('image/') ? (
                          <img src={preview.url} alt={preview.name} className="file-preview__image" />
                        ) : (
                          <>
                            <object data={preview.url} type="application/pdf" className="file-preview__pdf">
                              <Link href={preview.url} target="_blank" rel="noreferrer">
                                Open PDF preview
                              </Link>
                            </object>
                            <Link href={preview.url} target="_blank" rel="noreferrer">
                              Open PDF in new tab
                            </Link>
                          </>
                        )}
                      </Box>
                    )}
                  </Grid>
                  <Grid size={12}>
                    <Button type="submit" variant="contained" fullWidth size="large">
                      Publish referral
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, xl: 8 }}>
          <Grid container spacing={2.5}>
            {jobs.map((job) => (
              <Grid key={job.id} size={{ xs: 12, lg: 6 }}>
                <Card elevation={0} className="feature-card feature-card--job">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" spacing={2}>
                      <Box>
                        <Typography variant="h6">{job.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {job.company} | {job.location || 'Location TBC'} | {job.type}
                        </Typography>
                      </Box>
                      <Button color="error" onClick={() => setDeleteTarget(job)} startIcon={<DeleteOutlineRounded />}>
                        Delete
                      </Button>
                    </Stack>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                      {job.description}
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
                      {job.qualifications.map((qualification) => (
                        <Chip key={qualification} label={qualification} size="small" />
                      ))}
                    </Stack>

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2">Applicants</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {job.applicants.length ? job.applicants.join(', ') : 'No applicants tracked yet.'}
                      </Typography>
                    </Box>

                    {job.document && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2">Job description file</Typography>
                        {job.document.type.startsWith('image/') ? (
                          <img src={job.document.url} alt={job.document.name} className="job-card__doc-image" />
                        ) : (
                          <>
                            <object data={job.document.url} type="application/pdf" className="job-card__pdf">
                              <Link href={job.document.url} target="_blank" rel="noreferrer">
                                Open {job.document.name}
                              </Link>
                            </object>
                            <Link href={job.document.url} target="_blank" rel="noreferrer">
                              Open {job.document.name}
                            </Link>
                          </>
                        )}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete referral post?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Remove {deleteTarget?.title} from the job referral board.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              onDeleteJob(deleteTarget.id);
              setDeleteTarget(null);
              toast.success('Job referral deleted.');
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
