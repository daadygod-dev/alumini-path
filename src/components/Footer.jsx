import React from "react";
import { Box, Typography, Link, IconButton } from "@mui/material";
import { Brightness4, Brightness7 } from '@mui/icons-material';
import './Footer.scss';

export default function Footer({ mode, toggleTheme }) {
  return (
    <Box
      component="footer"
      className="footer"
      sx={{
        backgroundColor: mode === 'light' ? 'white' : '#262626',
        color: mode === 'light' ? 'black' : 'white',
        borderTop: mode === 'light' ? '1px solid #e5e4e7' : '1px solid #3a3a3a',
      }}
    >
      {/* Main Footer Content */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          py: 2,
        }}
      >
        {/* Copyright Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.7rem',
              color: mode === 'light' ? '#6e6e6e' : '#bdbbbb',
            }}
          >
            &copy; {new Date().getFullYear()} AlumniPath. All rights reserved.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Link href="/privacy" underline="hover" sx={{ fontSize: '0.6rem', color: mode === 'light' ? '#6e6e6e' : '#bdbbbb', '&:hover': { color: mode === 'light' ? '#353535' : '#ffffff' } }}>
              Privacy
            </Link>
            <Link href="/terms" underline="hover" sx={{ fontSize: '0.6rem', color: mode === 'light' ? '#6e6e6e' : '#bdbbbb', '&:hover': { color: mode === 'light' ? '#353535' : '#ffffff' } }}>
              Terms
            </Link>
            <Link href="/contact" underline="hover" sx={{ fontSize: '0.6rem', color: mode === 'light' ? '#6e6e6e' : '#bdbbbb', '&:hover': { color: mode === 'light' ? '#353535' : '#ffffff' } }}>
              Contact
            </Link>
          </Box>
        </Box>

        {/* Theme Toggle Button */}
        <IconButton
          onClick={toggleTheme}
          sx={{
            color: mode === 'light' ? 'black' : 'white',
            border: mode === 'light' ? '1px solid lightgray' : '1px solid #555',
            borderRadius: '50%',
            p: '0.5rem'
          }}
          title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {mode === 'light' ? <Brightness4 /> : <Brightness7 />}
        </IconButton>
      </Box>
    </Box>
  );
}