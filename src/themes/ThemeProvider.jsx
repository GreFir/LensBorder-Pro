import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { UiThemeContext } from './context';
import { getBrowserStorage, normalizeUiStyle, readUiStyle, UI_STYLE_KEY, writeUiStyle } from './preferences';
import './themes.css';

export default function ThemeProvider({ children }) {
  const [style, setStyle] = useState(() => readUiStyle(getBrowserStorage()));
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute('data-ui-theme');
    root.setAttribute('data-ui-theme', style);
    return () => {
      if (previous === null) root.removeAttribute('data-ui-theme');
      else root.setAttribute('data-ui-theme', previous);
    };
  }, [style]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.storageArea !== getBrowserStorage()) return;
      if (event.key === UI_STYLE_KEY || event.key === null) {
        setStyle(normalizeUiStyle(event.newValue));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(() => ({
    style,
    setStyle: (next) => setStyle(writeUiStyle(getBrowserStorage(), next)),
  }), [style]);

  return (
    <UiThemeContext.Provider value={value}>
      <div className="lb-interface">{children}</div>
    </UiThemeContext.Provider>
  );
}
