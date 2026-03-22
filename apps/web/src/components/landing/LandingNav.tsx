import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Menu } from "lucide-react";
import xpsLogo from "@/assets/xps-logo.png";
import { useState } from "react";

export const LandingNav = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4 bg-black/0 border border-solid shadow-sm opacity-100">
        <Link to="/" className="flex items-center gap-3">
          <img alt="XPS Intelligence" className="h-10 w-10" src="/lovable-uploads/b438d249-21ec-46ab-a55c-d807ce4debe8.png" />
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-wider text-foreground">XPS XPRESS  </span>
            <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Xtreme Polishing Systems</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {["Platform", "Solutions", "Coverage", "About"].map((item) =>
          <a key={item} href={`#${item.toLowerCase()}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {item}
            </a>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">Sign In</Link>
          </Button>
          <Button variant="gold" size="sm" asChild>
            <Link to="/login">Request Demo</Link>
          </Button>
        </div>

        <button className="md:hidden text-muted-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {mobileOpen &&
      <div className="md:hidden border-t border-border bg-background p-4 space-y-3">
          {["Platform", "Solutions", "Coverage", "About"].map((item) =>
        <a key={item} href={`#${item.toLowerCase()}`} className="block text-sm text-muted-foreground py-2">
              {item}
            </a>
        )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button variant="gold" size="sm" className="flex-1" asChild>
              <Link to="/login">Demo</Link>
            </Button>
          </div>
        </div>
      }
    </nav>);

};