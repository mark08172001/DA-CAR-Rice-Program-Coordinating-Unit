import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  const client = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    },
  );

  // Wrap getUser to also support local admin session cookie
  const originalGetUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = async (jwt?: string) => {
    try {
      const res = await originalGetUser(jwt);
      if (res.data?.user) return res;
    } catch {}

    const adminCookie = cookieStore.get('da_admin_session')?.value;
    if (adminCookie) {
      try {
        const parsed = JSON.parse(adminCookie);
        if (parsed?.email) {
          return {
            data: {
              user: {
                id: parsed.id || 'usr-001',
                email: parsed.email,
                user_metadata: {
                  full_name: parsed.full_name || 'Regional Executive Director (Super Admin)',
                  role: parsed.role || 'super_admin',
                  department: parsed.department || 'Office of the Regional Executive Director',
                },
                app_metadata: {},
                aud: 'authenticated',
                created_at: parsed.created_at || new Date().toISOString(),
              } as any,
            },
            error: null,
          };
        }
      } catch {}
    }

    return { data: { user: null }, error: null };
  };

  return client;
};
