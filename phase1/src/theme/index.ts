export const colors = {
  // Canvas & Core Grounding (The Void)
  background: '#050507',        // Deep Obsidian Canvas
  backgroundSubtle: '#0A0B0E',  // Root view vignette / header backdrop
  tabBar: '#0A0B0E',            // Navigation dock foundation
  tabBarBorder: 'rgba(255, 255, 255, 0.08)', // Ultra-subtle hairline divider
  tabActive: '#00E5FF',         // Vibrant electric cyan active tab indicator
  tabInactive: '#6E768E',       // Elevated accessible muted tab icon

  // Architectural Surface Elevation Hierarchy
  surface: '#111319',           // Level 1: Primary card & container base
  surfaceElevated: '#171922',   // Level 2: Modals, bottom sheets, active cards
  surfaceHighlight: '#222634',  // Level 3: Controls, chip backgrounds, stepper buttons
  surfaceGlass: 'rgba(17, 19, 25, 0.78)', // Glassmorphism container surface

  // Structural Borders & Dividers
  border: '#1E222F',            // Standard card border
  borderSubtle: 'rgba(255, 255, 255, 0.06)', // Delicate inner dividers
  borderLight: 'rgba(255, 255, 255, 0.12)',  // Input borders & elevated cards
  borderActive: 'rgba(0, 229, 255, 0.40)',   // Focused interactive ring

  // The Electric Cyan Accent System (Ultra-modern athletic high contrast)
  accent: '#00E5FF',            // Primary Electric Cyan
  accentDark: '#0099B8',        // Deep accent shade
  accentHover: '#38E1FF',       // Interactive state
  accentSubtle: 'rgba(0, 229, 255, 0.05)', // Card wash / background glow
  accentMuted: 'rgba(0, 229, 255, 0.10)',  // Inactive chips / soft tags
  accentDim: 'rgba(0, 229, 255, 0.16)',    // Active badges, flame circle, tags
  accentBorder: 'rgba(0, 229, 255, 0.32)', // Active card and chip outlines
  accentFlash: 'rgba(0, 229, 255, 0.22)',  // Set completion spring flash

  // Typography Hierarchy (WCAG AAA Optimized)
  text: {
    primary: '#FFFFFF',         // Crisp White
    secondary: '#A0A5B5',       // Cool Neutral Meta
    muted: '#7C859E',           // Elevated to #7C859E to achieve >= 5.1:1 AA compliance
    inverse: '#050507',         // Obsidian text on Cyan surfaces
    accent: '#00E5FF',          // Electric cyan text highlight
  },

  // Semantic Signals (Unified, High-Contrast)
  success: '#10B981',           // Laser Emerald
  successDark: '#059669',       // 3D shadow for success CTAs
  successDim: 'rgba(16, 185, 129, 0.14)',
  successBorder: 'rgba(16, 185, 129, 0.30)',

  danger: '#EF4444',            // Crimson Red
  dangerDark: '#991B1B',        // 3D bottom bevel for destructive ChunkyButton
  dangerDim: 'rgba(239, 68, 68, 0.14)',
  dangerBorder: 'rgba(239, 68, 68, 0.30)',

  warning: '#F59E0B',           // Electric Amber
  warningDim: 'rgba(245, 158, 11, 0.14)',
  warningBorder: 'rgba(245, 158, 11, 0.30)',

  info: '#38BDF8',              // Cyan (GPX Badges, Aerobic Metrics)
  infoDim: 'rgba(56, 189, 248, 0.14)',
  infoBorder: 'rgba(56, 189, 248, 0.30)',

  // Overlays
  overlay: 'rgba(5, 5, 7, 0.85)', // Deep obsidian modal backdrop
};

export const glass = {
  // Surface Fills
  surfaceBase: 'rgba(18, 20, 26, 0.75)',
  surfaceElevated: 'rgba(24, 27, 36, 0.85)',
  surfaceFloating: 'rgba(20, 22, 30, 0.94)',
  surfaceInset: 'rgba(255, 255, 255, 0.03)',
  surfaceAccent: 'rgba(0, 229, 255, 0.08)',
  surfaceDone: 'rgba(0, 229, 255, 0.06)',

  // Razor-Sharp Optical Borders
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  borderBase: 'rgba(255, 255, 255, 0.08)',
  borderElevated: 'rgba(255, 255, 255, 0.12)',
  borderHighlight: 'rgba(255, 255, 255, 0.18)',
  borderTopRim: 'rgba(255, 255, 255, 0.22)',
  borderAccent: 'rgba(0, 229, 255, 0.35)',
  borderAccentGlow: 'rgba(0, 229, 255, 0.55)',

  // Ambient Glows (replacing muddy black shadows)
  glowAccent: {
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
  glowElevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.40,
    shadowRadius: 20,
    elevation: 6,
  },
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
};

export const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
};

export const typography = {
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    display: 34,
  },
  lineHeight: {
    xs: 14,
    sm: 18,
    base: 22,
    md: 24,
    lg: 26,
    xl: 30,
    xxl: 36,
    display: 42,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '900' as const,
  },
  fontFamily: {
    semiBold: 'Nunito_600SemiBold',
    bold: 'Nunito_700Bold',
    extraBold: 'Nunito_800ExtraBold',
  },
};

export const cardStyle = {
  backgroundColor: colors.surface,
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.base,
};

export const theme = {
  colors,
  glass,
  spacing,
  radii,
  typography,
  cardStyle,
};

export default theme;
