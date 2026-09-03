import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Bot, Users, Pill, FileText, CalendarDays, Activity, PhoneCall,
  BarChart3, Siren, Bell, Settings, Heart,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter,
} from "@/components/ui/sidebar";
import { useI18n, type TranslationKey } from "@/lib/i18n";

const mainItems: { key: TranslationKey; url: string; icon: any }[] = [
  { key: "nav.dashboard" as TranslationKey, url: "/dashboard", icon: LayoutDashboard },
  { key: "nav.ai" as TranslationKey, url: "/ai", icon: Bot },
  { key: "nav.family" as TranslationKey, url: "/family", icon: Users },
  { key: "nav.callHistory" as TranslationKey, url: "/call-history", icon: PhoneCall },
  { key: "nav.medicines" as TranslationKey, url: "/medicines", icon: Pill },
  { key: "nav.reports" as TranslationKey, url: "/reports", icon: FileText },
  { key: "nav.appointments" as TranslationKey, url: "/appointments", icon: CalendarDays },
];

const wellnessItems: { key: TranslationKey; url: string; icon: any }[] = [
  { key: "nav.fitness" as TranslationKey, url: "/fitness", icon: Activity },
  { key: "nav.analytics" as TranslationKey, url: "/analytics", icon: BarChart3 },
];

const systemItems: { key: TranslationKey; url: string; icon: any }[] = [
  { key: "nav.emergency" as TranslationKey, url: "/emergency", icon: Siren },
  { key: "nav.notifications" as TranslationKey, url: "/notifications", icon: Bell },
  { key: "nav.settings" as TranslationKey, url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string) => pathname === url;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-bg shadow-glow">
            <Heart className="h-5 w-5 text-white" fill="white" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-bold tracking-tight">CareOS AI</div>
            <div className="truncate text-[10px] text-muted-foreground">Healthcare OS</div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.groupOverview")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={t(item.key)}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.key)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.groupWellness")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {wellnessItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={t(item.key)}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.key)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.groupSystem")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={t(item.key)}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.key)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="glass rounded-xl p-3 group-data-[collapsible=icon]:hidden">
          <div className="text-xs font-semibold">Upgrade to Pro</div>
          <div className="mt-1 text-[10px] text-muted-foreground">Unlock advanced AI insights and unlimited reports.</div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
