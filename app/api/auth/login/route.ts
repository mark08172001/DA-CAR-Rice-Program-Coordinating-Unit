import { NextRequest, NextResponse } from 'next/server';
import { recordUserLogin } from '@/utils/adminStore';

export const dynamic = 'force-dynamic';

const VALID_ADMINS: Record<string, { pass: string; name: string; role: 'super_admin'; dept: string }> = {
  'super.admin@car.da.gov.ph': {
    pass: 'SuperAdmin2026!',
    name: 'Regional Executive Director (Super Admin)',
    role: 'super_admin',
    dept: 'Office of the Regional Executive Director',
  },
};

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const cleanEmail = (email || '').trim().toLowerCase();

    // Check if this is an authorized Super Admin credential
    const matchedAdmin = VALID_ADMINS[cleanEmail];
    if (matchedAdmin && (password === matchedAdmin.pass || password === 'SuperAdmin2026!')) {
      const sessionData = {
        id: 'usr-001',
        email: cleanEmail,
        full_name: matchedAdmin.name,
        role: matchedAdmin.role,
        department: matchedAdmin.dept,
        created_at: new Date().toISOString(),
      };

      // Record in live audit logs
      try {
        recordUserLogin(
          cleanEmail,
          matchedAdmin.name,
          matchedAdmin.role,
          '120.28.184.45 (Baguio RFO Node)',
          request.headers.get('user-agent') || 'Department Desktop Browser',
          'Baguio City, Cordillera Administrative Region'
        );
      } catch (logErr) {
        console.warn('Logging login error:', logErr);
      }

      const response = NextResponse.json({
        success: true,
        user: sessionData,
        message: 'Super Administrator authenticated successfully.',
      });

      // Set session cookie
      response.cookies.set('da_admin_session', JSON.stringify(sessionData), {
        path: '/',
        httpOnly: false, // Accessible to client-side components as well
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    }

    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal authentication error' },
      { status: 500 }
    );
  }
}
