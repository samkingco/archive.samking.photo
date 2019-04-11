const breakpoints = ['32em', '56em', '64em'];
const space = [0, 4, 8, 16, 24, 32, 64];

export const fonts = {
  text: '-apple-system, Helvetica, sans-serif',
  textAlt: '-apple-system, Helvetica, sans-serif',
  display: 'serif',
  mono: '"SF Mono", Menlo, monospace',
};

export const fontSizes = [14, 16, 24, 64, 128];
export const fontWeights = ['normal', 'bold'];
export const lineHeights = ['1em', '1.4em', '1.6em'];

export const letterSpacings = {
  none: '0',
  normal: '0.05em',
  wide: '0.25em',
};

export const baseColors = {
  black: '#000000',
  blackAlt: '#141414',
  white: '#ffffff',
  whiteAlt: '#EBEBEB',
  grey: '#808080',
  greyOnBlack: '#A3A3A3',
  greyOnWhite: '#5C5C5C',
  red: '#FF4747',
  redAlt: '#E03F3F',
};

export const colorsDark = {
  bg: baseColors.black,
  bgAlt: baseColors.blackAlt,
  text: baseColors.white,
  textAlt: baseColors.greyOnBlack,
  accent: baseColors.red,
  accentAlt: baseColors.redAlt,
};

export const colorsLight = {
  bg: baseColors.white,
  bgAlt: baseColors.whiteAlt,
  text: baseColors.black,
  textAlt: baseColors.greyOnWhite,
  accent: baseColors.red,
  accentAlt: baseColors.redAlt,
};

export const colorsRed = {
  bg: baseColors.red,
  bgAlt: baseColors.redAlt,
  text: baseColors.black,
  textAlt: baseColors.white,
  accent: baseColors.white,
  accentAlt: baseColors.black,
};

const defaultTheme = {
  breakpoints,
  space,
  fonts,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacings,
};

const themes = {
  light: {
    ...defaultTheme,
    colors: colorsLight,
  },
  dark: {
    ...defaultTheme,
    colors: colorsDark,
  },
  red: {
    ...defaultTheme,
    colors: colorsRed,
  },
};

export default themes;
