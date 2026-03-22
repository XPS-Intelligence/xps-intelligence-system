import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Bell, Search, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import xpsLogo from "@/assets/xps-logo.png";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export const AppLayout = ({ children, title }: AppLayoutProps) => (
  <SidebarProvider>
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 border-b border-border glass flex items-center justify-between px-4 gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            {title && <h1 className="text-sm font-semibold text-foreground hidden sm:block">{title}</h1>}
          </div>

          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search leads, companies, proposals..." className="pl-9 bg-card border-border h-9 text-sm" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-muted-foreground relative">
              <Sparkles className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
            </Button>
            <div className="flex items-center gap-2 border border-border rounded-lg px-2.5 py-1.5 ml-1">
              <MapPin className="h-3 w-3 text-primary" />
              <span className="text-xs text-muted-foreground">Tampa, FL</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/20 border border-gold flex items-center justify-center">
              <span className="text-xs font-bold text-primary">MR</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  </SidebarProvider>
);
