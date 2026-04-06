import { useEffect, useState } from 'react';
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
import { seedAlumni, seedJobs } from './data/mockData.js';
import { ALUMNI_STORAGE_KEY, AUTH_USER_STORAGE_KEY, JOBS_STORAGE_KEY, loadStoredCollection, saveStoredCollection } from './auth/authStorage.js';

export default function Root() {
  const [mode, setMode] = useState(() => localStorage.getItem('theme-mode') || 'light');
  const [alumni, setAlumni] = useState(() => loadStoredCollection(ALUMNI_STORAGE_KEY, seedAlumni));
  const [jobs, setJobs] = useState(seedJobs);
  const [currentUser, setCurrentUser] = useState(() => loadStoredCollection(AUTH_USER_STORAGE_KEY, null));
  const currentProfile = currentUser ? alumni.find((entry) => entry.id === currentUser.id) || null : null;

  useEffect(() => {
    localStorage.setItem('theme-mode', mode);
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  useEffect(() => {
    saveStoredCollection(ALUMNI_STORAGE_KEY, alumni);
  }, [alumni]);

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
    if (currentUser) {
      saveStoredCollection(AUTH_USER_STORAGE_KEY, currentUser);
      return;
    }

    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  }, [currentUser]);

  const toggleTheme = () => setMode((prev) => (prev === 'light' ? 'dark' : 'light'));

  const addAlumni = (entry) => {
    setAlumni((prev) => [{ ...entry, id: Date.now() }, ...prev]);
  };

  const addJob = (entry) => {
    setJobs((prev) => [{ ...entry, id: Date.now() }, ...prev]);
  };

  const deleteJob = (id) => {
    setJobs((prev) => prev.filter((entry) => entry.id !== id));
  };

  const signIn = ({ email, password }) => {
    const matchedUser = alumni.find(
      (entry) => entry.email.toLowerCase() === email.toLowerCase() && entry.password === password,
    );

    if (!matchedUser) {
      return false;
    }

    setCurrentUser({
      id: matchedUser.id,
      fullName: matchedUser.fullName,
      email: matchedUser.email,
    });
    return true;
  };

  const createAccount = (account) => {
    const emailInUse = alumni.some((entry) => entry.email.toLowerCase() === account.email.toLowerCase());

    if (emailInUse) {
      return { ok: false, reason: 'Email already exists. Sign in instead.' };
    }

    const record = {
      ...account,
      id: Date.now(),
      mentorshipCount: 0,
      posts: account.posts || [],
      avatar: account.avatar || null,
    };

    setAlumni((prev) => [record, ...prev]);
    setCurrentUser({
      id: record.id,
      fullName: record.fullName,
      email: record.email,
    });

    return { ok: true };
  };

  const signOut = () => {
    setCurrentUser(null);
  };

  const requestPasswordReset = (email) =>
    alumni.some((entry) => entry.email.toLowerCase() === email.toLowerCase());

  const updateCurrentUserProfile = (updates) => {
    if (!currentUser) {
      return { ok: false, reason: 'No signed in user.' };
    }

    const emailInUse = alumni.some(
      (entry) => entry.id !== currentUser.id && entry.email.toLowerCase() === updates.email.toLowerCase(),
    );

    if (emailInUse) {
      return { ok: false, reason: 'That email address is already in use.' };
    }

    setAlumni((prev) =>
      prev.map((entry) => (entry.id === currentUser.id ? { ...entry, ...updates, id: currentUser.id } : entry)),
    );
    setCurrentUser((prev) => ({
      ...prev,
      fullName: updates.fullName,
      email: updates.email,
    }));

    return { ok: true };
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
                  alumniCount={alumni.length}
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
            <Route path="dashboard" element={<DashboardPage alumni={alumni} jobs={jobs} />} />
            <Route
              path="profile"
              element={<ProfilePage currentProfile={currentProfile} onSaveProfile={updateCurrentUserProfile} />}
            />
            <Route
              path="education-history"
              element={<EducationHistoryPage currentProfile={currentProfile} onSaveProfile={updateCurrentUserProfile} />}
            />
            <Route
              path="alumni"
              element={<AlumniPage alumni={alumni} onAddAlumni={addAlumni} />}
            />
            <Route
              path="jobs"
              element={<JobsPage jobs={jobs} onAddJob={addJob} onDeleteJob={deleteJob} />}
            />
            <Route path="analytics" element={<AnalyticsPage alumni={alumni} jobs={jobs} />} />
          </Route>
          <Route path="*" element={<Navigate to={currentUser ? '/dashboard' : '/'} replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </ThemeProvider>
  );
}
