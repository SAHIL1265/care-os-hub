import { Link } from "@tanstack/react-router";
import { Bell, Moon, Search, Siren, Sun } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/components/theme-provider";
import { user } from "@/lib/demo-data";

export function Topbar() {
  const { theme, toggleTheme } = useTheme();
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
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
        </Button>
        <Avatar className="h-9 w-9 ring-2 ring-primary/30">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
