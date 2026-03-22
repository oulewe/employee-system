import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

// قائمة المسارات التي لا نريد إضافة بادئة اللغة لها
const excludedPaths = ['/admin', '/login', '/employee', '/api'];

// إعدادات next-intl
const intlMiddleware = createMiddleware({
  locales: ['ar', 'fr', 'en'],
  defaultLocale: 'ar',
  // لا نريد إضافة بادئة للمسارات المستثناة، لكن هذا الخيار لا يؤثر على الاستثناء، سنفعل ذلك يدوياً
});

// التحقق من جلسة المدير
function isAdminAuthenticated(request: NextRequest): boolean {
  const adminCookie = request.cookies.get('admin_session');
  return adminCookie?.value === 'authenticated';
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // إذا كان المسار في قائمة المستثناة، لا نطبق next-intl
  if (excludedPaths.some(path => pathname.startsWith(path))) {
    // لكن نطبق حماية /admin
    if (pathname.startsWith('/admin') && !pathname.includes('/admin/login')) {
      if (!isAdminAuthenticated(request)) {
        const url = new URL('/admin/login', request.url);
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  }

  // باقي المسارات (مثل الصفحة الرئيسية) تطبق عليها next-intl
  const response = intlMiddleware(request);
  if (response) return response;

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)']
};