
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

/**
 * Next.js Middleware for Authentication and Role-Based Authorization.
 */
export function middleware(request: NextRequest) {
  const session = request.cookies.get('roleflow_session')?.value;
  const { pathname } = request.nextUrl;

  // 1. Authentication Check
  // In a real production app, you would verify the Firebase ID Token (JWT) here 
  // using a library like 'jose'. For this prototype, we check for existence.
  const isAuthPage = pathname === '/'; // Our login is on the root
  
  if (!session && pathname !== '/') {
    // If no session and trying to access a protected page, redirect to login
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (session && isAuthPage) {
    // If logged in and trying to access login page, redirect to dashboard
    // Note: We use the root for both, handled by conditional rendering in page.tsx
    // but this middleware provides the structure for multi-page apps.
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
