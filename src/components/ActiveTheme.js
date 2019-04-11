import React, { useEffect, useContext } from 'react';
import { useImmerReducer } from '../hooks';
import themes from '../design-system/theme';

const ActiveThemeContext = React.createContext();
export const useActiveTheme = () => useContext(ActiveThemeContext);

function themeReducer(draft, action) {
  switch (action.type) {
    case 'SET_THEME':
      draft.themeName = action.themeName;
      draft.theme = action.theme;
      return;
    default:
      throw new Error();
  }
}

export const ActiveThemeProvider = ({ defaultThemeName, ...props }) => {
  const themeNames = Object.keys(themes);

  const [{ themeName, theme }, dispatch] = useImmerReducer(themeReducer, {
    themeName: defaultThemeName,
    theme: themes[defaultThemeName],
  });

  const setActiveTheme = themeName => {
    if (themeNames.includes(themeName)) {
      dispatch({
        type: 'SET_THEME',
        themeName,
        theme: themes[themeName],
      });
    } else {
      console.error('Invalid theme to switch to.');
    }
  };

  useEffect(() => {
    if (theme.colors && theme.colors.bg) {
      document.body.style.backgroundColor = theme.colors.bg;
    }
  }, [theme]);

  const value = {
    themes,
    themeNames,
    activeTheme: theme,
    activeThemeName: themeName,
    setActiveTheme,
  };

  return <ActiveThemeContext.Provider {...props} value={value} />;
};

ActiveThemeProvider.defaultProps = {
  defaultThemeName: 'light',
};
