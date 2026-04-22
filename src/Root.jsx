import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import AppLayout from './layout/AppLayout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AlumniPage from './pages/AlumniPage.jsx';
import JobsPage from './pages/JobsPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import EducationHistoryPage from './pages/EducationHistoryPage.jsx';
import SignIn from './auth/Signin.jsx';
import ForgotPassword from './auth/ForgotPassword.jsx';
import { getTheme } from './theme/theme.js';
import { seedJobs, seedMembers } from './data/mockData.js';
import {
  canConnectMembers,
  canViewAnalytics,
  canViewEducationHistory,
  normalizeJob,
  normalizeMember,
  USER_ROLES,
} from './data/platformConfig.js';
import {
  ALUMNI_STORAGE_KEY,
  AUTH_USER_STORAGE_KEY,
  JOBS_STORAGE_KEY,
  loadStoredCollection,
  saveStoredCollection,
} from './auth/authStorage.js';

function buildAuthUser(member) {
  return {
    id: member.id,
    fullName: member.fullName,
    email: member.email,
    role: member.role,
  };
}

function loadMembers() {
  const stored = loadStoredCollection(ALUMNI_STORAGE_KEY, seedMembers);
  return (Array.isArray(stored) ? stored : seedMembers).map(normalizeMember);
}

function loadJobs() {
  const stored = loadStoredCollection(JOBS_STORAGE_KEY, seedJobs);
  return (Array.isArray(stored) ? stored : seedJobs).map(normalizeJob);
}

export default function Root() {
  const [mode, setMode] = useState(() => localStorage.getItem('theme-mode') || 'light');
  const [members, setMembers] = useState(loadMembers);
  const [jobs, setJobs] = useState(loadJobs);
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = loadStoredCollection(AUTH_USER_STORAGE_KEY, null);
    return stored ? { ...stored, role: stored.role || USER_ROLES.alumni } : null;
  });

  const currentProfile = useMemo(
    () => (currentUser ? members.find((entry) => entry.id === currentUser.id) || null : null),
    [currentUser, members],
  );

  useEffect(() => {
    localStorage.setItem('theme-mode', mode);
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  useEffect(() => {
    saveStoredCollection(ALUMNI_STORAGE_KEY, members);
  }, [members]);

  useEffect(() => {
    const lightweightJobs = jobs.map(({ document, ...job }) => ({
      ...job,
      document: document
        ? {
            name: document.name,
            type: document.type,
            size: document.size,
            url: document.type.startsWith('image/') ? document.url : null,
          }
        : null,
    }));

    if (!saveStoredCollection(JOBS_STORAGE_KEY, lightweightJobs)) {
      localStorage.removeItem(JOBS_STORAGE_KEY);
    }
  }, [jobs]);

  useEffect(() => {
    if (!currentUser) {
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      return;
    }

    saveStoredCollection(AUTH_USER_STORAGE_KEY, currentUser);
  }, [currentUser]);

  const toggleTheme = () => setMode((prev) => (prev === 'light' ? 'dark' : 'light'));

  const addMember = (entry) => {
    const emailInUse = members.some((member) => member.email.toLowerCase() === entry.email.toLowerCase());

    if (emailInUse) {
      return { ok: false, reason: 'Email already exists in the directory.' };
    }

    setMembers((prev) => [{ ...normalizeMember(entry), id: Date.now() }, ...prev]);
    return { ok: true };
  };

  const addJob = (entry) => {
    if (!currentUser) {
      return;
    }

    setJobs((prev) => [
      {
        ...normalizeJob(entry),
        id: Date.now(),
        postedById: currentUser.id,
        postedByName: currentUser.fullName,
        postedByRole: currentUser.role,
      },
      ...prev,
    ]);
  };

  const deleteJob = (id) => {
    setJobs((prev) => prev.filter((entry) => entry.id !== id));
  };

  const signIn = ({ email, password }) => {
    const matchedUser = members.find(
      (entry) => entry.email.toLowerCase() === email.toLowerCase() && entry.password === password,
    );

    if (!matchedUser) {
      return false;
    }

    setCurrentUser(buildAuthUser(matchedUser));
    return true;
  };

  const createAccount = (account) => {
    const emailInUse = members.some((entry) => entry.email.toLowerCase() === account.email.toLowerCase());

    if (emailInUse) {
      return { ok: false, reason: 'Email already exists. Sign in instead.' };
    }

    const record = normalizeMember({
      ...account,
      id: Date.now(),
      mentorshipCount: 0,
      posts: account.posts || [],
      connections: [],
      avatar: account.avatar || null,
    });

    setMembers((prev) => [record, ...prev]);
    setCurrentUser(buildAuthUser(record));

    return { ok: true };
  };

  const signOut = () => {
    setCurrentUser(null);
  };

  const requestPasswordReset = (email) =>
    members.some((entry) => entry.email.toLowerCase() === email.toLowerCase());

  const updateCurrentUserProfile = (updates) => {
    if (!currentUser) {
      return { ok: false, reason: 'No signed in user.' };
    }

    const emailInUse = members.some(
      (entry) => entry.id !== currentUser.id && entry.email.toLowerCase() === updates.email.toLowerCase(),
    );

    if (emailInUse) {
      return { ok: false, reason: 'That email address is already in use.' };
    }

    setMembers((prev) =>
      prev.map((entry) => (entry.id === currentUser.id ? normalizeMember({ ...entry, ...updates, id: currentUser.id }) : entry)),
    );
    setCurrentUser((prev) =>
      prev
        ? {
            ...prev,
            fullName: updates.fullName,
            email: updates.email,
            role: updates.role || prev.role,
          }
        : prev,
    );

    return { ok: true };
  };

  const toggleConnection = (targetId) => {
    if (!currentUser) {
      return { ok: false, reason: 'No signed in user.' };
    }

    const source = members.find((entry) => entry.id === currentUser.id);
    const target = members.find((entry) => entry.id === targetId);

    if (!source || !target) {
      return { ok: false, reason: 'Selected member was not found.' };
    }

    if (!canConnectMembers(source.role, target.role)) {
      return { ok: false, reason: 'Connections are only available between alumni and students.' };
    }

    const isConnected = source.connections.includes(targetId);

    setMembers((prev) =>
      prev.map((entry) => {
        if (entry.id === source.id) {
          return {
            ...entry,
            connections: isConnected
              ? entry.connections.filter((id) => id !== targetId)
              : [...entry.connections, targetId],
          };
        }

        if (entry.id === target.id) {
          return {
            ...entry,
            connections: isConnected
              ? entry.connections.filter((id) => id !== source.id)
              : [...entry.connections, source.id],
          };
        }

        return entry;
      }),
    );

    return {
      ok: true,
      connected: !isConnected,
      targetName: target.fullName,
    };
  };

  return (
    <ThemeProvider theme={getTheme(mode)}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              currentUser ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <SignIn onSignIn={signIn} onCreateAccount={createAccount} />
              )
            }
          />
          <Route
            path="/forgot-password"
            element={
              currentUser ? <Navigate to="/dashboard" replace /> : <ForgotPassword onRequestReset={requestPasswordReset} />
            }
          />
          <Route
            path="/"
            element={
              currentUser ? (
                <AppLayout
                  mode={mode}
                  toggleTheme={toggleTheme}
                  memberCount={members.length}
                  jobCount={jobs.length}
                  currentUser={currentUser}
                  currentProfile={currentProfile}
                  onSignOut={signOut}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          >
            <Route
              path="dashboard"
              element={<DashboardPage members={members} jobs={jobs} currentUser={currentUser} currentProfile={currentProfile} />}
            />
            <Route
              path="profile"
              element={<ProfilePage currentProfile={currentProfile} onSaveProfile={updateCurrentUserProfile} />}
            />
            <Route
              path="education-history"
              element={
                currentProfile && canViewEducationHistory(currentProfile.role) ? (
                  <EducationHistoryPage currentProfile={currentProfile} onSaveProfile={updateCurrentUserProfile} />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route
              path="alumni"
              element={
                <AlumniPage
                  members={members}
                  currentUser={currentUser}
                  currentProfile={currentProfile}
                  onAddMember={addMember}
                  onToggleConnection={toggleConnection}
                />
              }
            />
            <Route
              path="jobs"
              element={<JobsPage jobs={jobs} currentUser={currentUser} onAddJob={addJob} onDeleteJob={deleteJob} />}
            />
            <Route
              path="analytics"
              element={
                currentProfile && canViewAnalytics(currentProfile.role) ? (
                  <AnalyticsPage members={members} jobs={jobs} />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
          </Route>
          <Route path="*" element={<Navigate to={currentUser ? '/dashboard' : '/'} replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </ThemeProvider>
  );
}
