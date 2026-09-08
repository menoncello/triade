import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeTokens, ThemeName, themeForName, darkTokens, lightTokens } from './tokens.ts';

type ThemePreference = ThemeName | 'system';

interface ThemeContextValue {
  theme: ThemeTokens;
  themeName: ThemeName;
  preference: ThemePreference;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTokens,
  themeName: 'light',
  preference: 'system',
  isDark: false,
});

interface Props {
  children: ReactNode;
  /** 'system' segue o iOS (useColorScheme); 'light'|'dark'|'color-blind' força. */
  preference?: ThemePreference;
  /** Fallback quando useColorScheme retorna null (ex: web sem match). */
  fallback?: ThemeName;
}

export function ThemeProvider({ children, preference = 'system', fallback = 'light' }: Props) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null

  const value = useMemo<ThemeContextValue>(() => {
    let resolved: ThemeName;
    if (preference === 'system') {
      if (systemScheme === 'dark') resolved = 'dark';
      else if (systemScheme === 'light') resolved = 'light';
      else resolved = fallback;
    } else {
      resolved = preference as ThemeName;
    }
    const theme = themeForName(resolved);
    return {
      theme,
      themeName: resolved,
      preference,
      isDark: resolved === 'dark',
    };
  }, [preference, systemScheme, fallback]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeTokens {
  return useContext(ThemeContext).theme;
}

export function useThemeMeta(): ThemeContextValue {
  return useContext(ThemeContext);
}

export function useIsDark(): boolean {
  return useContext(ThemeContext).isDark;
}
