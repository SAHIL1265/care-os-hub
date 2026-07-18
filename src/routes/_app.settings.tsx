import { createFileRoute, Link } from "@tanstack/react-router";
import { User, Bell, Shield, Palette, Languages, LogOut, HeartPulse, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/page-header";
import { useTheme } from "@/components/theme-provider";
import { user } from "@/lib/demo-data";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings · CareOS AI" }] }),
  component: Settings,
});

function Settings() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Profile, preferences, privacy and devices." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-4 w-4" />Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16"><AvatarImage src={user.avatar} /><AvatarFallback>{user.name[0]}</AvatarFallback></Avatar>
              <div><div className="font-semibold">{user.name}</div><div className="text-xs text-muted-foreground">{user.role} · {user.email}</div></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Full name</Label><Input defaultValue={user.name} /></div>
              <div><Label>Email</Label><Input defaultValue={user.email} /></div>
              <div><Label>Blood group</Label><Input defaultValue={user.bloodGroup} /></div>
              <div><Label>Age</Label><Input defaultValue={user.age} type="number" /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Preferences</CardTitle><CardDescription>Personalize your experience</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <Row icon={Palette} label="Dark mode"><Switch checked={theme === "dark"} onCheckedChange={toggleTheme} /></Row>
            <Row icon={Bell} label="Push notifications"><Switch defaultChecked /></Row>
            <Row icon={Shield} label="Biometric login"><Switch defaultChecked /></Row>
            <Row icon={Languages} label="Language">English</Row>
            <Row icon={HeartPulse} label="Health sync">Apple Health</Row>
            <Row icon={Smartphone} label="Connected devices">2</Row>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between p-5">
          <div><div className="font-semibold">Sign out of CareOS AI</div><div className="text-xs text-muted-foreground">You'll return to the welcome screen.</div></div>
          <Button asChild variant="destructive" className="gap-2"><Link to="/"><LogOut className="h-4 w-4" />Sign out</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2 text-sm"><Icon className="h-4 w-4 text-muted-foreground" /><span className="truncate">{label}</span></div>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  );
}
