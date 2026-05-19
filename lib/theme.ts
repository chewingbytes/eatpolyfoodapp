// Hand-Drawn Design System tokens for React Native
// Adapted from the web design system for NativeWind + inline styles

export const colors = {
  paper: "#fdfbf7",
  pencil: "#2d2d2d",
  muted: "#e5e0d8",
  accent: "#ff4d4d",
  ink: "#2d5da1",
  postit: "#fff9c4",
  white: "#ffffff",
  green: "#22c55e",
  greenLight: "#dcfce7",
  yellowLight: "#fef9c3",
  yellowDark: "#854d0e",
};

// Wobbly border-radius values (set per-corner in React Native)
export const wobbly = {
  topLeft: 255,
  topRight: 15,
  bottomRight: 225,
  bottomLeft: 15,
};

export const wobblyAlt = {
  topLeft: 15,
  topRight: 225,
  bottomRight: 15,
  bottomLeft: 255,
};

export const wobblyMd = {
  topLeft: 20,
  topRight: 8,
  bottomRight: 18,
  bottomLeft: 8,
};

export const wobblyLg = {
  topLeft: 32,
  topRight: 12,
  bottomRight: 28,
  bottomLeft: 12,
};

// Hard offset shadow — simulated with a sibling View in React Native
// Usage: wrap content in <HardShadow> component
export const shadowOffset = { x: 4, y: 4 };
export const shadowOffsetLg = { x: 6, y: 6 };

// iOS shadow props (no blur = hard shadow)
export const iosShadow = {
  shadowColor: colors.pencil,
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
};

export const iosShadowLg = {
  shadowColor: colors.pencil,
  shadowOffset: { width: 6, height: 6 },
  shadowOpacity: 1,
  shadowRadius: 0,
};
