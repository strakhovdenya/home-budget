'use client';

import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: '[data-mui-color-scheme="%s"]' },
  colorSchemes: {
    light: { palette: {
      primary: { main: '#146a51' }, success: { main: '#146a51' },
      warning: { main: '#865608' }, error: { main: '#b52e36' },
      background: { default: '#f5f6f3', paper: '#ffffff' },
      text: { primary: '#20372f', secondary: '#586b63' }, divider: '#dce3dd',
    } },
    dark: { palette: {
      primary: { main: '#80d5b4' }, success: { main: '#80d5b4' },
      warning: { main: '#edc16e' }, error: { main: '#ff9ca4' },
      background: { default: '#121c18', paper: '#1b2822' },
      text: { primary: '#edf3ef', secondary: '#b0c3b7' }, divider: '#374b40',
    } },
  },
  typography: {
    fontFamily: 'Inter, "Segoe UI", Arial, sans-serif',
    h1: { fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 650, letterSpacing: '-0.035em' },
    h2: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em' },
    h3: { fontSize: '1.125rem', fontWeight: 600 },
    body1: { lineHeight: 1.7 }, button: { textTransform: 'none', fontWeight: 600 },
  },
  spacing: 8,
  shape: { borderRadius: 14 },
  components: {
    MuiButtonBase: { styleOverrides: { root: { '&.Mui-focusVisible': { outline: '3px solid', outlineColor: 'var(--mui-palette-primary-main)', outlineOffset: 3 } } } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minHeight: 44 } } },
    MuiIconButton: { styleOverrides: { root: { minWidth: 44, minHeight: 44 } } },
    MuiListItemButton: { styleOverrides: { root: { minHeight: 48, borderRadius: 10, marginBottom: 6, '&.Mui-selected': { color: 'var(--mui-palette-primary-main)' } } } },
    MuiOutlinedInput: { styleOverrides: { root: { minHeight: 48, backgroundColor: 'var(--mui-palette-background-paper)' } } },
    MuiNativeSelect: { styleOverrides: { select: { minHeight: 44, boxSizing: 'border-box' } } },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none' } } },
  },
});
