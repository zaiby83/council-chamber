import { teamsLightTheme, teamsDarkTheme, BrandVariants, createLightTheme } from '@fluentui/react-components';

// City of Fairfield brand color (Teams purple as base, customizable)
const fairfieldBrand: BrandVariants = {
  10: '#020308',
  20: '#0d1323',
  30: '#11213d',
  40: '#132d54',
  50: '#133a6c',
  60: '#124884',
  70: '#0f579d',
  80: '#0566b7',
  90: '#1e6eb8',
  100: '#3478b9',
  110: '#4782bb',
  120: '#5a8dbc',
  130: '#6d97be',
  140: '#7fa3c0',
  150: '#92aec2',
  160: '#a6bac5',
};

export const fairfieldTheme = createLightTheme(fairfieldBrand);

export { teamsLightTheme, teamsDarkTheme };
