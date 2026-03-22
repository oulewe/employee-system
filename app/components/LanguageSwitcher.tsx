'use client';

import { useRouter } from 'next/navigation';
import { setCookie } from 'cookies-next';
import { useLocale } from 'next-intl';

const locales = [
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' }
];

export default function LanguageSwitcher() {
  const router = useRouter();
  const currentLocale = useLocale();

  const switchLanguage = (locale: string) => {
    setCookie('NEXT_LOCALE', locale, { path: '/' });
    router.refresh();
  };

  return (
    <select
      value={currentLocale}
      onChange={(e) => switchLanguage(e.target.value)}
      style={{
        padding: '8px 12px',
        borderRadius: 6,
        border: '1px solid #ccc',
        backgroundColor: 'white',
        cursor: 'pointer'
      }}
    >
      {locales.map(loc => (
        <option key={loc.code} value={loc.code}>
          {loc.label}
        </option>
      ))}
    </select>
  );
}