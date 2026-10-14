import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://wzvcxffiwmhsqavrsbjb.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_FeXqVsnwAIZTLblegl24mw_3-jTW8ac";

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );

