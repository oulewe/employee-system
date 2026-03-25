'use client';

import { useRouter } from 'next/navigation';
import { setCookie, getCookie } from 'cookies-next';
import { useEffect, useState } from 'react';

const currencies = [
  { code: 'MRU', symbol: 'أوقية', label: 'أوقية موريتانية' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
];

export default function CurrencySwitcher() {
  const router = useRouter();
  const [currentCurrency, setCurrentCurrency] = useState('MRU');

  useEffect(() => {
    const saved = getCookie('currency');
    console.log('🔍 Currency from cookie:', saved);
    if (saved && typeof saved === 'string') {
      setCurrentCurrency(saved);
    }
  }, []);

  const switchCurrency = (code: string) => {
    setCookie('currency', code, { path: '/' });
    setCurrentCurrency(code);
    router.refresh();
  };

  return (
    <select
      value={currentCurrency}
      onChange={(e) => switchCurrency(e.target.value)}
      className="p-1 border rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
    >
      {currencies.map((c) => (
        <option key={c.code} value={c.code}>
          {c.label} ({c.symbol})
        </option>
      ))}
    </select>
  );
}