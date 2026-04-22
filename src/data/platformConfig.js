export const USER_ROLES = {
  alumni: 'alumni',
  student: 'student',
  employee: 'employee',
  schoolLeader: 'school_leader',
};

export const departments = ['Information Technology', 'Computer Science', 'Business Information Systems', 'Networking'];

export const sectors = ['Software', 'Analytics', 'Operations', 'Education', 'Finance', 'Student Development'];

export const roleOptions = [
  { value: USER_ROLES.alumni, label: 'Alumni' },
  { value: USER_ROLES.student, label: 'Student' },
  { value: USER_ROLES.employee, label: 'Employee' },
  { value: USER_ROLES.schoolLeader, label: 'School Leader' },
];

export const roleLabels = {
  [USER_ROLES.alumni]: 'Alumni',
  [USER_ROLES.student]: 'Student',
  [USER_ROLES.employee]: 'Employee',
  [USER_ROLES.schoolLeader]: 'School Leader',
};

export function getRoleLabel(role) {
  return roleLabels[role] || 'Member';
}

export function getYearFieldLabel(role) {
  if (role === USER_ROLES.student) {
    return 'Expected graduation year';
  }

  if (role === USER_ROLES.employee || role === USER_ROLES.schoolLeader) {
    return 'Institution year';
  }

  return 'Graduation year';
}

export function getRoleFieldLabel(role) {
  if (role === USER_ROLES.student) {
    return 'Current status';
  }

  if (role === USER_ROLES.schoolLeader) {
    return 'Leadership title';
  }

  if (role === USER_ROLES.employee) {
    return 'Staff title';
  }

  return 'Current role';
}

export function getOrganizationFieldLabel(role) {
  if (role === USER_ROLES.student) {
    return 'School or campus';
  }

  if (role === USER_ROLES.employee || role === USER_ROLES.schoolLeader) {
    return 'Office or unit';
  }

  return 'Current company';
}

export function canViewAnalytics(role) {
  return role === USER_ROLES.employee || role === USER_ROLES.schoolLeader;
}

export function canManageDirectory(role) {
  return role === USER_ROLES.employee || role === USER_ROLES.schoolLeader;
}

export function canManageJobs(role) {
  return role === USER_ROLES.alumni || role === USER_ROLES.employee || role === USER_ROLES.schoolLeader;
}

export function canViewEducationHistory(role) {
  return role === USER_ROLES.alumni || role === USER_ROLES.student;
}

export function canConnectMembers(sourceRole, targetRole) {
  return (
    (sourceRole === USER_ROLES.alumni && targetRole === USER_ROLES.student) ||
    (sourceRole === USER_ROLES.student && targetRole === USER_ROLES.alumni)
  );
}

export function getDefaultDirectoryRoleFilter(role) {
  if (role === USER_ROLES.alumni) {
    return USER_ROLES.student;
  }

  if (role === USER_ROLES.student) {
    return USER_ROLES.alumni;
  }

  return '';
}

export function normalizeMember(entry) {
  const normalized = {
    mentorshipCount: 0,
    role: USER_ROLES.alumni,
    department: '',
    graduationYear: '',
    currentRole: '',
    company: '',
    location: '',
    employmentSector: 'General',
    skills: [],
    educationHistory: [],
    jobHistory: [],
    posts: [],
    connections: [],
    bio: '',
    avatar: null,
    ...entry,
  };

  return {
    ...normalized,
    skills: Array.isArray(normalized.skills) ? normalized.skills : [],
    educationHistory: Array.isArray(normalized.educationHistory) ? normalized.educationHistory : [],
    jobHistory: Array.isArray(normalized.jobHistory) ? normalized.jobHistory : [],
    posts: Array.isArray(normalized.posts) ? normalized.posts : [],
    connections: Array.isArray(normalized.connections) ? normalized.connections : [],
    graduationYear: normalized.graduationYear ?? '',
    avatar: normalized.avatar || null,
  };
}

export function normalizeJob(entry) {
  const normalized = {
    applicants: [],
    qualifications: [],
    document: null,
    postedById: null,
    postedByName: 'Community team',
    postedByRole: USER_ROLES.employee,
    ...entry,
  };

  return {
    ...normalized,
    applicants: Array.isArray(normalized.applicants) ? normalized.applicants : [],
    qualifications: Array.isArray(normalized.qualifications) ? normalized.qualifications : [],
    document: normalized.document || null,
  };
}
