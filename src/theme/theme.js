import { createTheme } from '@mui/material';

export const getTheme = (mode = 'light') => {
  const isLight = mode === 'light';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isLight ? '#0d6e66' : '#4fd1c5',
        contrastText: isLight ? '#ffffff' : '#081c1a',
      },
      secondary: {
        main: isLight ? '#b84a1e' : '#f08a5d',
      },
      background: {
        default: isLight ? '#f6f5f0' : '#0b0f14',
        paper: isLight ? '#ffffff' : '#121821',
      },
      text: {
        primary: isLight ? '#14181f' : '#eff3f8',
        secondary: isLight ? '#525b69' : '#9aa7b8',
      },
      divider: isLight ? '#e4e2da' : '#212b38',
    },
    shape: {
      borderRadius: 10,
    },
    typography: {
      fontFamily: "'Inter Tight', -apple-system, BlinkMacSystemFont, sans-serif",
      h3: {
        fontWeight: 700,
        letterSpacing: '-0.025em',
        fontSize: '1.875rem',
        lineHeight: 1.18,
      },
      h4: {
        fontWeight: 700,
        letterSpacing: '-0.02em',
        fontSize: '1.5rem',
        lineHeight: 1.25,
      },
      h5: {
        fontWeight: 700,
        letterSpacing: '-0.015em',
        fontSize: '1.125rem',
        lineHeight: 1.35,
      },
      h6: {
        fontWeight: 600,
        letterSpacing: '-0.01em',
        fontSize: '0.975rem',
        lineHeight: 1.4,
      },
      subtitle1: {
        fontWeight: 600,
        fontSize: '0.9375rem',
        lineHeight: 1.45,
      },
      subtitle2: {
        fontWeight: 600,
        fontSize: '0.8125rem',
        lineHeight: 1.45,
      },
      body1: {
        fontSize: '0.9375rem',
        lineHeight: 1.55,
      },
      body2: {
        fontSize: '0.8125rem',
        lineHeight: 1.5,
      },
      caption: {
        fontSize: '0.75rem',
        lineHeight: 1.4,
      },
      overline: {
        fontSize: '0.6875rem',
        fontWeight: 600,
        letterSpacing: '0.08em',
        lineHeight: 1.4,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '0.84rem',
        letterSpacing: '-0.005em',
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
      MuiCard: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: `1px solid ${isLight ? '#e4e2da' : '#212b38'}`,
            backgroundColor: isLight ? '#ffffff' : '#121821',
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: '22px',
            '&:last-child': {
              paddingBottom: '22px',
            },
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 8,
            paddingInline: 16,
            paddingBlock: 8,
          },
          sizeLarge: {
            paddingInline: 20,
            paddingBlock: 10,
          },
          sizeSmall: {
            paddingInline: 12,
            paddingBlock: 5,
            fontSize: '0.78rem',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 500,
            fontSize: '0.75rem',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
            border: `1px solid ${isLight ? '#e4e2da' : '#212b38'}`,
          },
        },
      },
    },
  });
};
