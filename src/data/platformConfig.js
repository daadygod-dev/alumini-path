export const USER_ROLES = [
  { code: 'alumni', label: 'Alumni', description: 'Graduate profile, referrals, mentorship & events' },
  { code: 'student', label: 'Student', description: 'Explore mentors, job postings, events & peers' },
  { code: 'employee', label: 'Employee', description: 'Post jobs & manage campus directory' },
  { code: 'school_leader', label: 'School Leader', description: 'Analytics & community oversight' },
];

export const ALL_USER_ROLES = [
  { code: 'administrator', label: 'Administrator' },
  ...USER_ROLES.map(({ code, label }) => ({ code, label })),
];

export const JOB_EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'internship', label: 'Internship' },
  { value: 'contract', label: 'Contract' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'volunteer', label: 'Volunteer' },
];

export const EVENT_CATEGORIES = [
  { value: 'conference', label: 'Conference' },
  { value: 'workshop', label: 'Professional Workshop' },
  { value: 'networking_session', label: 'Networking Session' },
  { value: 'career_fair', label: 'Career Fair' },
  { value: 'reunion', label: 'Alumni Reunion' },
  { value: 'graduation_anniversary', label: 'Graduation Anniversary' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'other', label: 'Other Event' },
];

const ROLE_LABELS = {
  administrator: 'Administrator',
  alumni: 'Alumni',
  student: 'Student',
  employee: 'Employee',
  school_leader: 'School Leader',
};

const EMPLOYMENT_TYPE_LABELS = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  internship: 'Internship',
  contract: 'Contract',
  temporary: 'Temporary',
  volunteer: 'Volunteer',
};

const EVENT_CATEGORY_LABELS = Object.fromEntries(
  EVENT_CATEGORIES.map((item) => [item.value, item.label]),
);

export function getRoleLabel(roleCode) {
  return ROLE_LABELS[roleCode] || 'Member';
}

export function getEmploymentTypeLabel(typeCode) {
  return EMPLOYMENT_TYPE_LABELS[typeCode] || typeCode || 'Full-time';
}

export function getEventCategoryLabel(category) {
  return EVENT_CATEGORY_LABELS[category] || category || 'Event';
}

export function hasPermission(user, code) {
  return Array.isArray(user?.permissions) && user.permissions.includes(code);
}

export function canViewAnalytics(user) {
  if (!user) return false;
  return hasPermission(user, 'analytics.view') || user.role === 'school_leader' || user.role === 'administrator';
}

export function canManageDirectory(user) {
  if (!user) return false;
  return hasPermission(user, 'directory.manage') || user.role === 'employee' || user.role === 'administrator';
}

export function canManageUsers(user) {
  if (!user) return false;
  return hasPermission(user, 'users.manage') || user.role === 'administrator';
}

export function canManageEvents(user) {
  if (!user) return false;
  return hasPermission(user, 'events.manage') || user.role === 'administrator';
}

export function canModeratePosts(user) {
  if (!user) return false;
  return hasPermission(user, 'posts.moderate') || user.role === 'administrator';
}

export function canManageJobs(user) {
  if (!user) return false;
  return (
    hasPermission(user, 'jobs.publish') ||
    hasPermission(user, 'jobs.manage') ||
    user.role === 'employee' ||
    user.role === 'alumni' ||
    user.role === 'administrator'
  );
}

export function canApplyToJobs(user) {
  if (!user) return false;
  return hasPermission(user, 'jobs.apply') || user.role === 'student' || user.role === 'alumni';
}

export function canRequestMentorship(user) {
  if (!user) return false;
  return hasPermission(user, 'mentorship.request') || user.role === 'student' || user.role === 'alumni';
}

export function canEditProfile(user) {
  if (!user) return false;
  return hasPermission(user, 'profile.edit');
}

export function canViewEducationHistory(user) {
  return Boolean(user);
}

export function canConnectMembers(user) {
  if (!user) return false;
  return hasPermission(user, 'connections.manage') || user.role === 'alumni' || user.role === 'student';
}

export function formatEducationLine(record) {
  if (!record) return '';
  if (typeof record === 'string') return record;

  const years =
    record.start_year && record.end_year
      ? `${record.start_year}-${record.end_year} `
      : record.end_year
        ? `${record.end_year} `
        : record.start_year
          ? `${record.start_year} `
          : '';
  const institution =
    record.institution && record.institution !== record.qualification
      ? ` (${record.institution})`
      : '';

  return `${years}${record.qualification || ''}${institution}`.trim();
}

export function formatEmploymentLine(record) {
  if (!record) return '';
  if (typeof record === 'string') return record;

  const company = record.company ? ` @ ${record.company}` : '';
  const tag = Number(record.is_current) === 1 ? ' (Current)' : '';
  return `${record.job_title || ''}${company}${tag}`.trim();
}

export function normalizeApiMe(payload) {
  const user = payload?.user || {};
  const profile = payload?.profile || {};
  const skills = Array.isArray(payload?.skills)
    ? payload.skills.map((item) => (typeof item === 'string' ? item : item.name)).filter(Boolean)
    : [];
  const educationRecords = Array.isArray(payload?.education) ? payload.education : [];
  const employmentRecords = Array.isArray(payload?.employment) ? payload.employment : [];
  const postsRecords = Array.isArray(payload?.posts) ? payload.posts : [];

  return {
    id: Number(user.id),
    fullName: user.full_name || 'Member',
    email: user.email || '',
    phone: user.phone || '',
    role: user.role_code || 'alumni',
    roleLabel: user.role_label || getRoleLabel(user.role_code),
    permissions: Array.isArray(payload?.permissions) ? payload.permissions : [],
    regNo: profile.reg_no || '',
    graduationYear: profile.graduation_year ? Number(profile.graduation_year) : new Date().getFullYear(),
    departmentId: profile.department_id ? Number(profile.department_id) : null,
    department: profile.department_name || '',
    programmeId: profile.programme_id ? Number(profile.programme_id) : null,
    programme: profile.programme_name || '',
    sectorId: profile.sector_id ? Number(profile.sector_id) : null,
    sector: profile.sector_name || '',
    currentRole: profile.current_role || '',
    company: profile.current_company || '',
    location: profile.location || '',
    bio: profile.bio || '',
    yearsExperience: Number(profile.years_experience || 0),
    mentorshipAvailable: Boolean(Number(profile.mentorship_available || 0)),
    avatarUrl: profile.avatar_url || '',
    skills,
    educationRecords,
    employmentRecords,
    educationHistory: educationRecords.map(formatEducationLine).filter(Boolean),
    jobHistory: employmentRecords.map(formatEmploymentLine).filter(Boolean),
    posts: postsRecords.map((p) => (typeof p === 'string' ? p : p.body)).filter(Boolean),
    postItems: postsRecords,
  };
}

export function normalizeApiMember(row) {
  const skills = Array.isArray(row?.skills)
    ? row.skills.map((item) => (typeof item === 'string' ? item : item.name)).filter(Boolean)
    : [];
  const educationRecords = Array.isArray(row?.education) ? row.education : [];
  const employmentRecords = Array.isArray(row?.employment) ? row.employment : [];
  const postsRecords = Array.isArray(row?.posts) ? row.posts : [];

  return {
    id: Number(row?.user_id || row?.id),
    fullName: row?.full_name || 'Member',
    email: row?.email || '',
    phone: row?.phone || '',
    role: row?.role_code || 'alumni',
    roleLabel: row?.role_label || getRoleLabel(row?.role_code),
    regNo: row?.reg_no || '',
    graduationYear: row?.graduation_year ? Number(row.graduation_year) : new Date().getFullYear(),
    departmentId: row?.department_id ? Number(row.department_id) : null,
    department: row?.department_name || '',
    programmeId: row?.programme_id ? Number(row.programme_id) : null,
    programme: row?.programme_name || '',
    sectorId: row?.sector_id ? Number(row.sector_id) : null,
    sector: row?.employment_sector || row?.sector_name || '',
    currentRole: row?.current_role || '',
    company: row?.current_company || '',
    location: row?.location || '',
    bio: row?.bio || '',
    yearsExperience: Number(row?.years_experience || 0),
    mentorshipAvailable: Boolean(Number(row?.mentorship_available || 0)),
    avatarUrl: row?.avatar_url || '',
    skills,
    educationRecords,
    employmentRecords,
    educationHistory: educationRecords.map(formatEducationLine).filter(Boolean),
    jobHistory: employmentRecords.map(formatEmploymentLine).filter(Boolean),
    posts: postsRecords.map((p) => (typeof p === 'string' ? p : p.body)).filter(Boolean),
    postItems: postsRecords,
  };
}

export function normalizeApiJob(row) {
  const docs = Array.isArray(row?.documents) ? row.documents : [];
  const firstDoc = docs[0] || null;

  return {
    id: Number(row?.id),
    postedById: Number(row?.posted_by || 0),
    postedBy: row?.posted_by_name || 'Member',
    postedByRole: row?.posted_by_role || 'alumni',
    title: row?.title || '',
    company: row?.company || '',
    sector: row?.sector_name || '',
    sectorId: row?.sector_id ? Number(row.sector_id) : null,
    location: row?.location || '',
    type: row?.employment_type || 'full_time',
    typeLabel: getEmploymentTypeLabel(row?.employment_type),
    salaryMin: row?.salary_min !== null && row?.salary_min !== undefined ? Number(row.salary_min) : null,
    salaryMax: row?.salary_max !== null && row?.salary_max !== undefined ? Number(row.salary_max) : null,
    salaryCurrency: row?.salary_currency || 'RWF',
    deadline: row?.application_deadline || '',
    description: row?.description || '',
    qualifications: row?.qualifications || '',
    applicationInstructions: row?.application_instructions || '',
    contactEmail: row?.contact_email || '',
    status: row?.status || 'open',
    postedOn: row?.published_at ? String(row.published_at).slice(0, 10) : String(row?.created_at || '').slice(0, 10),
    applicationCount: Number(row?.application_count || 0),
    myApplication: row?.my_application || null,
    documents: docs,
    documentName: firstDoc?.original_name || '',
    documentType: firstDoc?.mime_type || '',
    documentUrl: firstDoc?.download_url || (firstDoc?.id ? `api/files.php?id=${firstDoc.id}` : ''),
  };
}

export function firstFieldErrorMessage(fieldErrors) {
  if (!fieldErrors || typeof fieldErrors !== 'object') {
    return '';
  }

  for (const value of Object.values(fieldErrors)) {
    if (Array.isArray(value) && value.length > 0) {
      return value[0];
    }
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return '';
}
