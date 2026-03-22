import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  // قراءة اللغة من الكوكي داخل الخادم
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'ar';

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});