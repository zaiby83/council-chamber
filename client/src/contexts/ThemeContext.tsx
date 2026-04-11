import React, { createContext, useContext, useState, useEffect } from 'react';
import { FluentProvider } from '@fluentui/react-components';
import { fairfieldTheme } from '../theme/teamsTheme';
import { teamsDarkTheme } from '@fluentui/react-components';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('cc_theme_mode');
    return (saved as ThemeMode) || 'light';
  });

  useEffect(() => {
    localStorage.setItem('cc_theme_mode', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const theme = mode === 'dark' ? teamsDarkTheme : fairfieldTheme;

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <FluentProvider theme={theme}>{children}</FluentProvider>
    </ThemeContext.Provider>
  );
};
