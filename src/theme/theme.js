import { createTheme } from '@mui/material';

export const getTheme = (mode = 'light') =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'light' ? '#0f766e' : '#5eead4',
      },
      secondary: {
        main: mode === 'light' ? '#c2410c' : '#fb923c',
      },
      background: {
        default: mode === 'light' ? '#f3f7fb' : '#0f172a',
        paper: mode === 'light' ? '#ffffff' : '#152238',
      },
      text: {
        primary: mode === 'light' ? '#0f172a' : '#e5edf7',
        secondary: mode === 'light' ? '#475569' : '#9fb2cc',
      },
      divider: mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'rgba(148, 163, 184, 0.18)',
    },
    shape: {
      borderRadius: 18,
    },
    typography: {
      fontFamily: "'Inter Tight', sans-serif",
      h3: {
        fontWeight: 800,
        letterSpacing: '-0.03em',
        fontSize: '2.1rem',
      },
      h4: {
        fontWeight: 700,
        letterSpacing: '-0.02em',
        fontSize: '1.65rem',
      },
      h5: {
        fontWeight: 700,
        fontSize: '1.15rem',
      },
      h6: {
        fontSize: '0.98rem',
      },
      subtitle1: {
        fontSize: '0.92rem',
      },
      subtitle2: {
        fontSize: '0.82rem',
      },
      body1: {
        fontSize: '0.9rem',
      },
      body2: {
        fontSize: '0.78rem',
      },
      caption: {
        fontSize: '0.7rem',
      },
      overline: {
        fontSize: '0.58rem',
      },
      button: {
        textTransform: 'none',
        fontWeight: 700,
        fontSize: '0.82rem',
      },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
          },
        },
      },
    },
  });
