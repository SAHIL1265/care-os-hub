import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Bell, LogOut, Moon, Search, Siren, Sun } from "lucide-react";
import { toast } from "sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";
import { useI18n } from "@/lib/i18n";
import { user as demoUser } from "@/lib/demo-data";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { getStoredProfile, initialsFrom, PROFILE_UPDATED_EVENT } from "@/lib/profile-helpers";

export function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const nav = useNavigate();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState<string>(demoUser.name);
  const [displayEmail, setDisplayEmail] = useState<string | null>(demoUser.email);
  const [displayAvatar, setDisplayAvatar] = useState<string | undefined>(demoUser.avatar);

  const syncProfile = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const u = auth.user;
    if (u) {
      setDisplayEmail(u.email ?? demoUser.email);
      const cached = getStoredProfile(u.id);
      const name = cached?.full_name || u.user_metadata?.full_name || demoUser.name;
      const avatar = cached?.avatar_url || cached?.avatar_path || u.user_metadata?.avatar_url || demoUser.avatar;
      setDisplayName(name);
      if (avatar) setDisplayAvatar(avatar);
    }
  }, []);

  useEffect(() => {
    void syncProfile();
    window.addEventListener(PROFILE_UPDATED_EVENT, syncProfile);
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void syncProfile();
    });
    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, syncProfile);
      sub.subscription.unsubscribe();
    };
  }, [syncProfile]);

  async function handleLogout() {
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      try { localStorage.removeItem("sahara.ai.chat.v1"); } catch {}
      await supabase.auth.signOut({ scope: "local" });
    } catch (err) {
      console.error("Sign out error", err);
    } finally {
      setDisplayEmail(null);
      toast.success("Signed out");
      nav({ to: "/login", replace: true });
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border/60 bg-background/70 px-3 backdrop-blur-xl sm:px-6">
      <SidebarTrigger />
      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search patients, medicines, reports…" className="pl-9 bg-muted/60 border-0 focus-visible:ring-1" />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button asChild variant="destructive" size="sm" className="gap-1.5 shadow-elegant">
          <Link to="/emergency"><Siren className="h-4 w-4" />SOS</Link>
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <Button variant="ghost" size="icon" className="relative" aria-label={t("nav.notifications")}>
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button aria-label="Account menu" className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <Avatar className="h-9 w-9 ring-2 ring-primary/30">
                <AvatarImage src={displayAvatar} alt={displayName} />
                <AvatarFallback>{initialsFrom(displayName, displayEmail)}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{displayName || displayEmail}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings">{t("nav.settings")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/notifications">{t("nav.notifications")}</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> {t("common.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
