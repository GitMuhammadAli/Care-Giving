'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { en, type Translations } from './translations/en';
import { fr } from './translations/fr';

export type Language = 'en' | 'fr';

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const translations: Record<Language, Translations> = {
  en,
  fr,
};

const I18nContext = createContext<I18nContextValue | null>(null);

const LANGUAGE_STORAGE_KEY = 'carecircle-language';

interface I18nProviderProps {
  children: React.ReactNode;
  defaultLanguage?: Language;
}

export function I18nProvider({ children, defaultLanguage = 'en' }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load saved language from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
      if (saved && translations[saved]) {
        setLanguageState(saved);
      } else {
        // Try to detect browser language
        const browserLang = navigator.language.split('-')[0] as Language;
        if (translations[browserLang]) {
          setLanguageState(browserLang);
        }
      }
      setIsInitialized(true);
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    if (translations[lang]) {
      setLanguageState(lang);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
        // Update html lang attribute
        document.documentElement.lang = lang;
      }
    }
  }, []);

  // Update html lang attribute when language changes
  useEffect(() => {
    if (typeof window !== 'undefined' && isInitialized) {
      document.documentElement.lang = language;
    }
  }, [language, isInitialized]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: translations[language],
    }),
    [language, setLanguage]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Hook to access translations
 * @returns The translations object for the current language
 */
export function useTranslation(): Translations {
  const context = useContext(I18nContext);
  if (!context) {
    // Return English as fallback if used outside provider
    return en;
  }
  return context.t;
}

/**
 * Hook to access language state and setter
 * @returns Object with current language and setLanguage function
 */
export function useLanguage(): { language: Language; setLanguage: (lang: Language) => void } {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      language: 'en',
      setLanguage: () => {
        console.warn('useLanguage must be used within I18nProvider');
      },
    };
  }
  return {
    language: context.language,
    setLanguage: context.setLanguage,
  };
}

/**
 * Available languages with their display names
 */
export const availableLanguages: { code: Language; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
];

