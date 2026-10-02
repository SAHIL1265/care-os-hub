import { supabase } from "@/integrations/supabase/client";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || "zkokgahubzdpfrtqwsah";
const STORAGE_KEY = `sb-${PROJECT_ID}-auth-token`;

export interface DemoUserMetadata {
  full_name?: string;
  role?: string;
}

export function isFetchError(error: any): boolean {
  if (!error) return false;
  const msg = (typeof error === "string" ? error : error?.message || "").toLowerCase();
  const name = (error?.name || "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("fetch failed") ||
    msg.includes("networkerror") ||
    msg.includes("enotfound") ||
    msg.includes("load failed") ||
    name.includes("typeerror")
  );
}

export function createDemoSession(email: string, metadata?: DemoUserMetadata) {
  const normalizedEmail = email.trim().toLowerCase();
  const name = metadata?.full_name?.trim() || normalizedEmail.split("@")[0] || "User";
  const role = metadata?.role || "Patient";

  const demoSession = {
    access_token: `demo-access-token-${Date.now()}`,
    token_type: "bearer",
    expires_in: 86400 * 30,
    expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
    refresh_token: `demo-refresh-token-${Date.now()}`,
    user: {
      id: `demo-user-${Date.now()}`,
      aud: "authenticated",
      role: "authenticated",
      email: normalizedEmail,
      user_metadata: {
        full_name: name,
        role: role,
      },
      app_metadata: {
        provider: "email",
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoSession));
  } catch (e) {
    console.error("Failed to write demo session to localStorage", e);
  }

  return demoSession;
}

export async function getValidAuthToken(): Promise<string | null> {
  let token: string | null | undefined = null;

  try {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token;
  } catch {}

  if (!token && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("supabase.auth.token");
      if (raw) {
        const parsed = JSON.parse(raw);
        token = parsed?.access_token || parsed?.currentSession?.access_token;
      }
    } catch {}
  }

  if (
    token &&
    typeof token === "string" &&
    token !== "null" &&
    token !== "undefined" &&
    token.trim().split(".").length === 3
  ) {
    return token.trim();
  }

  return null;
}
