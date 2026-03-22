const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const webEnv = {
  apiUrl:
    trimTrailingSlash(
      process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        "/api"
    ),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "",
};
