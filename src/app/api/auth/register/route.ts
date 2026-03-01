
import { NextResponse } from 'next/server';
import { firebaseConfig } from '@/firebase/config';

/**
 * API Endpoint for Postman registration.
 * URL: POST /api/auth/register
 * Body: { "email": "...", "password": "...", "name": "...", "role": "..." }
 */
export async function POST(request: Request) {
  try {
    const { email, password, name, role } = await request.json();

    if (!email || !password || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Create User in Firebase Auth via Public REST API
    const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`;
    
    const authRes = await fetch(signUpUrl, {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const authData = await authRes.json();

    if (authData.error) {
      return NextResponse.json({ error: authData.error.message }, { status: 400 });
    }

    // Note: Profiles are completed in the Firestore via the UI after registration
    // or you can hit a separate Firestore proxy endpoint if needed.
    
    return NextResponse.json({ 
      message: "User account created successfully in Firebase Auth.",
      uid: authData.localId,
      instructions: "Now log in via the web UI to initialize your Firestore profile."
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
