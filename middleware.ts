import { NextRequest, NextResponse } from 'next/server';

function isAdminAuthenticated(request: NextRequest): boolean {
  const adminCookie = request.cookies.get('admin_session');
  return adminCookie?.value === 'authenticated';
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // حماية مسار /admin (ما عدا /admin/login)
  if (pathname.startsWith('/admin') && !pathname.includes('/admin/login')) {
    if (!isAdminAuthenticated(request)) {
      const url = new URL('/admin/login', request.url);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
};