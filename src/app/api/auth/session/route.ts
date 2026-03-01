
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Handles server-side session storage for Next.js Middleware.
 * This effectively "bridges" Firebase Client Auth to the Next.js Server.
 */
export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();
    const cookieStore = await cookies();

    if (idToken) {
      cookieStore.set('roleflow_session', idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
      });
      return NextResponse.json({ status: 'Session set' });
    } else {
      cookieStore.delete('roleflow_session');
      return NextResponse.json({ status: 'Session cleared' });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
