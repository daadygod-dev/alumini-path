import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Box, CircularProgress, CssBaseline, Stack, ThemeProvider, Typography } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import AppLayout from './layout/AppLayout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AlumniPage from './pages/AlumniPage.jsx';
import JobsPage from './pages/JobsPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import EducationHistoryPage from './pages/EducationHistoryPage.jsx';
import MentorshipPage from './pages/MentorshipPage.jsx';
import EventsPage from './pages/EventsPage.jsx';
import CommunityFeedPage from './pages/CommunityFeedPage.jsx';
import AdminUsersPage from './pages/AdminUsersPage.jsx';
import SignIn from './auth/Signin.jsx';
import ForgotPassword from './auth/ForgotPassword.jsx';
import { getTheme } from './theme/theme.js';
import { apiRequest } from './api/client.js';
import { clearAuthToken, loadAuthToken, saveAuthToken } from './auth/authStorage.js';
import {
  canConnectMembers,
  canManageUsers,
  canViewAnalytics,
  canViewEducationHistory,
  firstFieldErrorMessage,
  normalizeApiJob,
  normalizeApiMe,
  normalizeApiMember,
} from './data/platformConfig.js';

function extractErrorReason(error, fallback) {
  const fieldMsg = firstFieldErrorMessage(error?.fieldErrors);
  return fieldMsg || error?.message || fallback;
}

export default function Root() {
  const [mode, setMode] = useState(() => localStorage.getItem('theme-mode') || 'light');
  const [booting, setBooting] = useState(() => Boolean(loadAuthToken()));
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');

  const [lookups, setLookups] = useState({
    departments: [],
    programmes: [],
    sectors: [],
    roles: [],
  });
  const [lookupsLoading, setLookupsLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [acceptedConnections, setAcceptedConnections] = useState([]);

  useEffect(() => {
    localStorage.setItem('theme-mode', mode);
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  const loadLookups = useCallback(async () => {
    setLookupsLoading(true);
    try {
      const data = await apiRequest('lookups', { skipAuthClear: true });
      setLookups({
        departments: Array.isArray(data?.departments) ? data.departments : [],
        programmes: Array.isArray(data?.programmes) ? data.programmes : [],
        sectors: Array.isArray(data?.sectors) ? data.sectors : [],
        roles: Array.isArray(data?.roles) ? data.roles : [],
      });
    } catch {
      // Keep empty lookup arrays if offline; forms surface helpful messaging cleanly.
    } finally {
      setLookupsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  const loadWorkspaceData = useCallback(async (userObj) => {
    if (!userObj) {
      return;
    }

    setDataLoading(true);
    setDataError('');

    try {
      const [dirResult, jobsResult] = await Promise.all([
        apiRequest('directory', { query: { pageSize: 100 } }),
        apiRequest('jobs', { query: { pageSize: 100, status: 'all' } }),
      ]);

      const normalizedMembers = (dirResult?.rows || []).map(normalizeApiMember);
      const normalizedJobs = (jobsResult?.jobs || []).map(normalizeApiJob);

      setMembers(normalizedMembers);
      setJobs(normalizedJobs);

      if (canConnectMembers(userObj)) {
        try {
          const connResult = await apiRequest('connections');
          setIncomingRequests(Array.isArray(connResult?.requests) ? connResult.requests : []);
          setAcceptedConnections(Array.isArray(connResult?.connections) ? connResult.connections : []);
        } catch {
          setIncomingRequests([]);
          setAcceptedConnections([]);
        }
      } else {
        setIncomingRequests([]);
        setAcceptedConnections([]);
      }
    } catch (error) {
      setDataError(error.message || 'Unable to load workspace data from the server.');
    } finally {
      setDataLoading(false);
    }
  }, []);

  const hydrateSession = useCallback(async () => {
    const token = loadAuthToken();
    if (!token) {
      setCurrentUser(null);
      setBooting(false);
      return null;
    }

    try {
      const meData = await apiRequest('me');
      const normalizedUser = normalizeApiMe(meData);
      setCurrentUser(normalizedUser);
      await loadWorkspaceData(normalizedUser);
      return normalizedUser;
    } catch {
      clearAuthToken();
      setCurrentUser(null);
      setMembers([]);
      setJobs([]);
      setIncomingRequests([]);
      setAcceptedConnections([]);
      return null;
    } finally {
      setBooting(false);
    }
  }, [loadWorkspaceData]);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  const currentProfile = useMemo(() => {
    if (!currentUser) {
      return null;
    }
    return members.find((entry) => entry.id === currentUser.id) || currentUser;
  }, [currentUser, members]);

  const connectionLookup = useMemo(() => {
    const map = {};
    if (!currentUser) {
      return map;
    }

    acceptedConnections.forEach((conn) => {
      const otherId =
        Number(conn.requester_id) === currentUser.id
          ? Number(conn.addressee_id)
          : Number(conn.requester_id);
      map[otherId] = { id: Number(conn.id), status: 'accepted', direction: 'connected' };
    });

    incomingRequests.forEach((conn) => {
      map[Number(conn.requester_id)] = { id: Number(conn.id), status: 'pending', direction: 'incoming' };
    });

    return map;
  }, [acceptedConnections, currentUser, incomingRequests]);

  const refreshProfileAndWorkspace = useCallback(async () => {
    if (!loadAuthToken()) {
      return;
    }
    const meData = await apiRequest('me');
    const normalizedUser = normalizeApiMe(meData);
    setCurrentUser(normalizedUser);
    await loadWorkspaceData(normalizedUser);
  }, [loadWorkspaceData]);

  const handleSignIn = async ({ email, password }) => {
    try {
      const data = await apiRequest('signin', {
        method: 'POST',
        body: { email, password },
        skipAuthClear: true,
      });

      if (!data?.session?.token) {
        return { ok: false, reason: 'Session token missing from server response.' };
      }

      saveAuthToken(data.session.token);
      const user = await hydrateSession();
      if (!user) {
        return { ok: false, reason: 'Could not load signed-in profile.' };
      }

      return { ok: true };
    } catch (error) {
      return { ok: false, reason: extractErrorReason(error, 'Sign in failed.') };
    }
  };

  const handleCreateAccount = async (payload) => {
    try {
      const data = await apiRequest('register', {
        method: 'POST',
        body: payload,
        skipAuthClear: true,
      });

      if (!data?.session?.token) {
        return { ok: false, reason: 'Session token missing from server response.' };
      }

      saveAuthToken(data.session.token);

      if (payload.educationHistory?.trim()) {
        await apiRequest('education', {
          method: 'POST',
          body: { educationHistory: payload.educationHistory },
        }).catch(() => {});
      }

      if (payload.jobHistory?.trim()) {
        await apiRequest('employment', {
          method: 'POST',
          body: { jobHistory: payload.jobHistory, company: payload.company, location: payload.location },
        }).catch(() => {});
      }

      await hydrateSession();
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: extractErrorReason(error, 'Could not create account.') };
    }
  };

  const handleSignOut = async () => {
    try {
      if (loadAuthToken()) {
        await apiRequest('signout', { method: 'POST', skipAuthClear: true });
      }
    } catch {
      // Clear local session regardless of server logout response.
    } finally {
      clearAuthToken();
      setCurrentUser(null);
      setMembers([]);
      setJobs([]);
      setIncomingRequests([]);
      setAcceptedConnections([]);
      setDataError('');
    }
  };

  const handleRequestReset = async (email) => {
    try {
      await apiRequest('forgot-password', {
        method: 'POST',
        body: { email },
        skipAuthClear: true,
      });
      return { ok: true, message: 'If that address is registered, a reset token has been created.' };
    } catch (error) {
      return { ok: false, reason: extractErrorReason(error, 'Could not submit reset request.') };
    }
  };

  const handleCompleteReset = async ({ token, password }) => {
    try {
      await apiRequest('reset-password', {
        method: 'POST',
        body: { token, password },
        skipAuthClear: true,
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: extractErrorReason(error, 'Could not reset password.') };
    }
  };

  const handleAddMember = async (payload) => {
    try {
      await apiRequest('member-create', {
        method: 'POST',
        body: payload,
      });
      await loadWorkspaceData(currentUser);
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: extractErrorReason(error, 'Could not add member.') };
    }
  };

  const handleFetchMemberDetail = useCallback(async (memberId) => {
    const data = await apiRequest('member', { query: { id: memberId } });
    return {
      member: data?.member ? normalizeApiMember({
        ...data.member,
        skills: data.skills,
        education: data.education,
        employment: data.employment,
        posts: data.posts,
      }) : null,
      connection: data?.connection || null,
    };
  }, []);

  const handleUpdateCurrentProfile = async (payload) => {
    try {
      const formData = new FormData();
      formData.append('fullName', payload.fullName || '');
      formData.append('email', payload.email || '');
      formData.append('phone', payload.phone || '');
      formData.append('graduationYear', String(payload.graduationYear || ''));
      formData.append('department', payload.department || '');
      formData.append('programme', payload.programme || '');
      formData.append('sector', payload.sector || '');
      formData.append('currentRole', payload.currentRole || '');
      formData.append('company', payload.company || '');
      formData.append('location', payload.location || '');
      formData.append('bio', payload.bio || '');
      formData.append('regNo', payload.regNo || '');
      formData.append(
        'skills',
        Array.isArray(payload.skills) ? payload.skills.join(', ') : String(payload.skills || ''),
      );

      if (payload.avatarFile) {
        formData.append('avatar', payload.avatarFile);
      }

      await apiRequest('profile', { method: 'POST', body: formData });

      if (payload.educationItems) {
        await apiRequest('education', {
          method: 'POST',
          body: { items: payload.educationItems },
        });
      }

      if (payload.employmentItems) {
        await apiRequest('employment', {
          method: 'POST',
          body: { items: payload.employmentItems },
        });
      }

      await refreshProfileAndWorkspace();
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: extractErrorReason(error, 'Could not save profile updates.') };
    }
  };

  const handleAddProfilePost = async (bodyText) => {
    try {
      await apiRequest('post-create', {
        method: 'POST',
        body: { body: bodyText },
      });
      await refreshProfileAndWorkspace();
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: extractErrorReason(error, 'Could not publish update.') };
    }
  };

  const handleConnectMember = async (memberId, message = '') => {
    try {
      await apiRequest('connection', {
        method: 'POST',
        query: { id: memberId },
        body: message ? { message } : {},
      });
      await loadWorkspaceData(currentUser);
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: extractErrorReason(error, 'Could not send connection request.') };
    }
  };

  const handleRespondConnection = async (connectionId, decision) => {
    try {
      await apiRequest('connections', {
        method: 'POST',
        query: { action: 'respond' },
        body: { connectionId, decision },
      });
      await loadWorkspaceData(currentUser);
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: extractErrorReason(error, 'Could not update connection request.') };
    }
  };

  const handleAddJob = async (payload) => {
    try {
      const formData = new FormData();
      formData.append('title', payload.title || '');
      formData.append('company', payload.company || '');
      formData.append('sector', payload.sector || '');
      formData.append('location', payload.location || '');
      formData.append('employmentType', payload.type || 'full_time');
      formData.append('contactEmail', payload.contactEmail || '');
      formData.append('description', payload.description || '');
      if (payload.deadline) {
        formData.append('applicationDeadline', payload.deadline);
      }
      if (payload.qualifications) {
        formData.append('qualifications', payload.qualifications);
      }
      if (payload.salaryMin !== '' && payload.salaryMin !== undefined) {
        formData.append('salaryMin', String(payload.salaryMin));
      }
      if (payload.salaryMax !== '' && payload.salaryMax !== undefined) {
        formData.append('salaryMax', String(payload.salaryMax));
      }
      if (payload.salaryCurrency) {
        formData.append('salaryCurrency', payload.salaryCurrency);
      }
      if (payload.applicationInstructions) {
        formData.append('applicationInstructions', payload.applicationInstructions);
      }
      if (payload.documentFile) {
        formData.append('document', payload.documentFile);
      }

      await apiRequest('job-create', {
        method: 'POST',
        body: formData,
      });
      await loadWorkspaceData(currentUser);
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: extractErrorReason(error, 'Could not publish opportunity.') };
    }
  };

  const handleUpdateJobStatus = async (jobId, status) => {
    try {
      await apiRequest('job-update', {
        method: 'POST',
        query: { id: jobId },
        body: { status },
      });
      await loadWorkspaceData(currentUser);
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: extractErrorReason(error, 'Could not update job status.') };
    }
  };

  const handleDeleteJob = async (jobId) => {
    try {
      await apiRequest('job-delete', {
        method: 'DELETE',
        query: { id: jobId },
      });
      await loadWorkspaceData(currentUser);
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: extractErrorReason(error, 'Could not delete opportunity.') };
    }
  };

  const handleApplyToJob = async (jobId, { coverNote, cvFile, supportingFile }) => {
    try {
      const formData = new FormData();
      formData.append('coverNote', coverNote);
      if (cvFile) {
        formData.append('cv', cvFile);
      }
      if (supportingFile) {
        formData.append('supportingDocument', supportingFile);
      }
      await apiRequest('job-apply', {
        method: 'POST',
        query: { id: jobId },
        body: formData,
      });
      await loadWorkspaceData(currentUser);
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: extractErrorReason(error, 'Could not submit application.') };
    }
  };

  const handleChangePassword = async ({ currentPassword, newPassword }) => {
    try {
      await apiRequest('change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: extractErrorReason(error, 'Could not change password.') };
    }
  };

  const theme = useMemo(() => getTheme(mode), [mode]);
  const toggleTheme = () => setMode((prev) => (prev === 'light' ? 'dark' : 'light'));

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster position="top-right" />
      <BrowserRouter>
        {booting ? (
          <Box
            sx={{
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--surface-canvas)',
            }}
          >
            <Stack spacing={1.5} alignItems="center">
              <CircularProgress size={30} />
              <Typography variant="body2" color="text.secondary">
                Loading workspace...
              </Typography>
            </Stack>
          </Box>
        ) : (
          <Routes>
            {!currentUser ? (
              <>
                <Route
                  path="/"
                  element={
                    <SignIn
                      onSignIn={handleSignIn}
                      onCreateAccount={handleCreateAccount}
                      lookups={lookups}
                      lookupsLoading={lookupsLoading}
                      mode={mode}
                      toggleTheme={toggleTheme}
                    />
                  }
                />
                <Route
                  path="/forgot-password"
                  element={
                    <ForgotPassword
                      onRequestReset={handleRequestReset}
                      onCompleteReset={handleCompleteReset}
                      mode={mode}
                      toggleTheme={toggleTheme}
                    />
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            ) : (
              <Route
                element={
                  <AppLayout
                    mode={mode}
                    toggleTheme={toggleTheme}
                    currentUser={currentUser}
                    currentProfile={currentProfile}
                    onSignOut={handleSignOut}
                  />
                }
              >
                <Route
                  path="/dashboard"
                  element={
                    <DashboardPage
                      currentUser={currentUser}
                      currentProfile={currentProfile}
                      members={members}
                      jobs={jobs}
                      acceptedConnections={acceptedConnections}
                      incomingRequests={incomingRequests}
                      connectionLookup={connectionLookup}
                      loading={dataLoading}
                      error={dataError}
                      onRetry={() => loadWorkspaceData(currentUser)}
                      onConnectMember={handleConnectMember}
                      onRespondConnection={handleRespondConnection}
                    />
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProfilePage
                      currentUser={currentUser}
                      currentProfile={currentProfile}
                      lookups={lookups}
                      onSaveProfile={handleUpdateCurrentProfile}
                      onAddPost={handleAddProfilePost}
                      onChangePassword={handleChangePassword}
                    />
                  }
                />
                <Route
                  path="/education-history"
                  element={
                    canViewEducationHistory(currentUser) ? (
                      <EducationHistoryPage
                        currentUser={currentUser}
                        currentProfile={currentProfile}
                        loading={dataLoading}
                        onRefreshWorkspace={refreshProfileAndWorkspace}
                      />
                    ) : (
                      <Navigate to="/dashboard" replace />
                    )
                  }
                />
                <Route
                  path="/alumni"
                  element={
                    <AlumniPage
                      currentUser={currentUser}
                      members={members}
                      lookups={lookups}
                      connectionLookup={connectionLookup}
                      loading={dataLoading}
                      onAddMember={handleAddMember}
                      onConnectMember={handleConnectMember}
                      onFetchMemberDetail={handleFetchMemberDetail}
                    />
                  }
                />
                <Route
                  path="/feed"
                  element={<CommunityFeedPage currentUser={currentUser} />}
                />
                <Route
                  path="/jobs"
                  element={
                    <JobsPage
                      currentUser={currentUser}
                      jobs={jobs}
                      lookups={lookups}
                      loading={dataLoading}
                      onAddJob={handleAddJob}
                      onDeleteJob={handleDeleteJob}
                      onUpdateJobStatus={handleUpdateJobStatus}
                      onApplyJob={handleApplyToJob}
                    />
                  }
                />
                <Route
                  path="/mentorship"
                  element={<MentorshipPage currentUser={currentUser} />}
                />
                <Route
                  path="/events"
                  element={<EventsPage currentUser={currentUser} />}
                />
                <Route
                  path="/analytics"
                  element={
                    canViewAnalytics(currentUser) ? (
                      <AnalyticsPage lookups={lookups} />
                    ) : (
                      <Navigate to="/dashboard" replace />
                    )
                  }
                />
                <Route
                  path="/admin"
                  element={
                    canManageUsers(currentUser) ? (
                      <AdminUsersPage currentUser={currentUser} />
                    ) : (
                      <Navigate to="/dashboard" replace />
                    )
                  }
                />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            )}
          </Routes>
        )}
      </BrowserRouter>
    </ThemeProvider>
  );
}
