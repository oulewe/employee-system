import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

// إعدادات next-intl
const intlMiddleware = createMiddleware({
  locales: ['ar', 'fr', 'en'],
  defaultLocale: 'ar'
});

// التحقق من جلسة المدير
function isAdminAuthenticated(request: NextRequest): boolean {
  const adminCookie = request.cookies.get('admin_session');
  if (!adminCookie) return false;
  // يمكنك التحقق من صحة الجلسة بشكل أكثر أمانًا (مثل JWT)
  // هنا نفترض أن وجود الكوكي يعني أن المستخدم قد سجل الدخول
  return adminCookie.value === 'authenticated';
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // تطبيق next-intl أولاً
  const response = intlMiddleware(request);
  if (response) return response;

  // حماية مسار /admin (ما عدا /admin/login)
  if (pathname.startsWith('/admin') && !pathname.includes('/admin/login')) {
    if (!isAdminAuthenticated(request)) {
      const url = new URL('/admin/login', request.url);
      // الحفاظ على اللغة المختارة
      const locale = request.cookies.get('NEXT_LOCALE')?.value || 'ar';
      url.pathname = `/${locale}/admin/login`;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
};