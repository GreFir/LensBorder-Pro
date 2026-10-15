import { createContext, useContext } from 'react';
export const UiThemeContext = createContext(null);
export const useUiTheme = () => {
  const value = useContext(UiThemeContext);
  if (!value) throw new Error('useUiTheme must be used inside ThemeProvider');
  return value;
};
