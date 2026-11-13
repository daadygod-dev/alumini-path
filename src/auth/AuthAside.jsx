import { useEffect, useState } from 'react';
import { Avatar, Box, Typography } from '@mui/material';
import {
  AutoGraphRounded,
  CheckCircleRounded,
  DescriptionRounded,
  HandshakeRounded,
  WorkOutlineRounded,
} from '@mui/icons-material';
import Logo from '../assets/alumini-path-logo.webp';

const SHOWCASE_SLIDES = [
  {
    id: 'opportunities',
    label: 'Referral Board',
    moduleTag: 'Opportunity Pipeline',
    headline: 'Direct referrals & CV review',
    icon: WorkOutlineRounded,
    previewTitle: 'Role Referral Workflow',
    previewMeta: 'Verified Employers & Alumni',
    steps: ['Open Brief Attached', 'Applicant Review', 'Shortlist & Outcome'],
  },
  {
    id: 'mentorship',
    label: 'Mentorship Hub',
    moduleTag: 'Guided Pairing',
    headline: 'Graduate-to-student mentoring',
    icon: HandshakeRounded,
    previewTitle: 'Structured Session Track',
    previewMeta: 'Department & Expertise Match',
    steps: ['Expertise Filter', 'Request Accepted', 'Session Completed'],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    moduleTag: 'Career Outcomes',
    headline: 'Cohort & sector visibility',
    icon: AutoGraphRounded,
    previewTitle: 'Institutional Metrics',
    previewMeta: 'Real-Time MySQL Views',
    steps: ['Cohort Distribution', 'Sector Breakdown', 'CSV Audit Export'],
  },
];

export default function AuthAside({
  eyebrow = 'RP Karongi · Career Network',
  headline = 'Where graduates, students, and career teams stay connected.',
  lead = 'Verified alumni directory, structured mentorship, and real-time referral tracking in one institutional portal.',
  showShowcase = true,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!showShowcase || paused) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SHOWCASE_SLIDES.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [paused, showShowcase]);

  const activeSlide = SHOWCASE_SLIDES[activeIndex];
  const ActiveIcon = activeSlide.icon;

  return (
    <Box component="aside" className="auth-aside">
      <Box className="auth-aside__backdrop" aria-hidden="true">
        <Box className="auth-aside__grid" />
        <Box className="auth-aside__orb auth-aside__orb--one" />
        <Box className="auth-aside__orb auth-aside__orb--two" />
        <Box className="auth-aside__orb auth-aside__orb--three" />
      </Box>

      <Box className="auth-aside__inner">
        <Box className="auth-aside__top">
          <Box className="auth-aside__brand">
            <Avatar src={Logo} variant="rounded" className="auth-aside__logo" />
            <Box>
              <Typography component="div" className="auth-aside__brand-title">
                Alumini-Path
              </Typography>
              <Typography component="div" className="auth-aside__brand-sub">
                Alumni &amp; Career Registry
              </Typography>
            </Box>
          </Box>

          <Box className="auth-aside__eyebrow">
            <Box component="span" className="auth-aside__beacon" />
            <span>{eyebrow}</span>
          </Box>
        </Box>

        <Box className="auth-aside__hero">
          <Typography component="h1" className="auth-aside__headline">
            {headline}
          </Typography>
          <Typography component="p" className="auth-aside__lead">
            {lead}
          </Typography>

          {showShowcase ? (
            <Box
              className="auth-showcase"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              <Box className="auth-preview" key={activeSlide.id}>
                <Box className="auth-preview__chrome">
                  <Box className="auth-preview__dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </Box>
                  <Box className="auth-preview__pill">{activeSlide.moduleTag}</Box>
                </Box>

                <Box className="auth-preview__header">
                  <Box className="auth-preview__icon-badge">
                    <ActiveIcon fontSize="small" />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography component="div" className="auth-preview__title">
                      {activeSlide.previewTitle}
                    </Typography>
                    <Typography component="div" className="auth-preview__meta">
                      {activeSlide.previewMeta}
                    </Typography>
                  </Box>
                  <DescriptionRounded className="auth-preview__corner-icon" fontSize="small" />
                </Box>

                <Box className="auth-preview__visual">
                  {activeSlide.id === 'opportunities' && (
                    <Box className="auth-viz auth-viz--pipeline">
                      {activeSlide.steps.map((step, idx) => (
                        <Box key={step} className="auth-viz__row" style={{ animationDelay: `${idx * 120}ms` }}>
                          <CheckCircleRounded className="auth-viz__check" />
                          <span className="auth-viz__label">{step}</span>
                          <span className="auth-viz__bar" />
                        </Box>
                      ))}
                    </Box>
                  )}

                  {activeSlide.id === 'mentorship' && (
                    <Box className="auth-viz auth-viz--mentorship">
                      <Box className="auth-viz__nodes">
                        <Box className="auth-viz__node">Graduate Mentor</Box>
                        <Box className="auth-viz__connector" aria-hidden="true">
                          <span className="auth-viz__pulse-track" />
                        </Box>
                        <Box className="auth-viz__node is-accent">Student Mentee</Box>
                      </Box>
                      <Box className="auth-viz__tags">
                        {activeSlide.steps.map((step) => (
                          <span key={step} className="auth-viz__tag">
                            {step}
                          </span>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {activeSlide.id === 'analytics' && (
                    <Box className="auth-viz auth-viz--analytics">
                      <Box className="auth-viz__bars" aria-hidden="true">
                        <span style={{ '--bar-h': '48%', '--bar-d': '0s' }} />
                        <span style={{ '--bar-h': '72%', '--bar-d': '0.15s' }} />
                        <span style={{ '--bar-h': '58%', '--bar-d': '0.3s' }} />
                        <span style={{ '--bar-h': '88%', '--bar-d': '0.45s' }} />
                        <span style={{ '--bar-h': '64%', '--bar-d': '0.6s' }} />
                        <span style={{ '--bar-h': '92%', '--bar-d': '0.75s' }} />
                      </Box>
                      <Box className="auth-viz__tags">
                        {activeSlide.steps.map((step) => (
                          <span key={step} className="auth-viz__tag">
                            {step}
                          </span>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>

                {!paused ? <Box className="auth-preview__progress" /> : null}
              </Box>

              <Box className="auth-showcase__tabs" role="tablist" aria-label="Platform capabilities">
                {SHOWCASE_SLIDES.map((slide, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={slide.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`auth-showcase__tab${isActive ? ' is-active' : ''}`}
                      onClick={() => setActiveIndex(index)}
                    >
                      <span className="auth-showcase__tab-label">{slide.label}</span>
                    </button>
                  );
                })}
              </Box>
            </Box>
          ) : null}
        </Box>

        <Box className="auth-aside__footer">
          <Typography component="span" className="auth-aside__footer-text">
            Institutional Alumni Networking &amp; Job Referral System
          </Typography>
          <Typography component="span" className="auth-aside__footer-text">
            Role-Secured Access
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
