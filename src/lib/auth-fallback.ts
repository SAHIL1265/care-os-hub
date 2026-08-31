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
