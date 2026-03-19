"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, User, LogOut, Download, Users } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ...(session?.user?.role === "manager"
      ? [{ href: "/team", label: "Team", icon: Users }]
      : []),
    { href: "/export", label: "Export", icon: Download },
  ];

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-40">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary transition-transform group-hover:scale-105">
            <svg className="h-3.5 w-3.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">
            WorkLog
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "relative transition-colors",
                    isActive && "text-foreground after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-accent"
                  )}
                >
                  <item.icon className="mr-1.5 h-3.5 w-3.5" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
          <div className="ml-2 h-5 w-px bg-border/60" />
          <div className="relative ml-1" ref={menuRef}>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setOpen((prev) => !prev)}
            >
              <Avatar className="h-7 w-7 ring-2 ring-border/50 transition-all hover:ring-accent/30">
                <AvatarImage src={session?.user?.image ?? undefined} />
                <AvatarFallback className="bg-secondary text-xs font-medium">{initials ?? "?"}</AvatarFallback>
              </Avatar>
            </Button>
            {open && (
              <div className="animate-scale-in absolute right-0 top-full z-50 mt-2 min-w-52 rounded-xl bg-popover p-1.5 text-popover-foreground shadow-xl shadow-foreground/5 ring-1 ring-foreground/8">
                <div className="px-2.5 py-2">
                  <p className="text-sm font-medium">{session?.user?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {session?.user?.email}
                  </p>
                </div>
                <div className="my-1 h-px bg-border/60" />
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push("/profile");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-secondary"
                >
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Profile
                </button>
                <div className="my-1 h-px bg-border/60" />
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    signOut({ callbackUrl: "/login" });
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-destructive/8 hover:text-destructive"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
