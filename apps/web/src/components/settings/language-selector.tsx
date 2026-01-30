'use client';

import { useLanguage, type Language } from '@/lib/i18n';
import { useTranslation } from '@/lib/i18n';
import { Globe } from 'lucide-react';
import toast from 'react-hot-toast';

const languages: { code: Language; name: string; nativeName: string; flag: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
];

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const t = useTranslation();

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    toast.success(t.settings.languageChanged);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-text-secondary">
        <Globe className="w-5 h-5" />
        <span className="text-sm font-medium">{t.settings.selectLanguage}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
              language === lang.code
                ? 'border-sage-600 bg-sage-50'
                : 'border-border bg-bg-muted hover:border-sage-400'
            }`}
          >
            <span className="text-2xl">{lang.flag}</span>
            <div className="text-left">
              <p className="font-medium text-text-primary">{lang.nativeName}</p>
              <p className="text-sm text-text-secondary">{lang.name}</p>
            </div>
            {language === lang.code && (
              <div className="ml-auto w-5 h-5 rounded-full bg-sage-600 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

