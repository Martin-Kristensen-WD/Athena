"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LogOut,
  MoreHorizontal,
  Settings,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type NavItem = { href: string; label: string; icon: LucideIcon };

type NavUser = {
  name?: string | null;
  email?: string | null;
  role: "user" | "admin";
};

const BAR_COUNT = 4;

const rowClass =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium";

export function MobileNav({
  navItems,
  user,
}: {
  navItems: readonly NavItem[];
  user: NavUser;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  const barItems = navItems.slice(0, BAR_COUNT);
  const overflowItems = navItems.slice(BAR_COUNT);

  function go(href: string) {
    setMoreOpen(false);
    router.push(href);
  }

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {barItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-[0.65rem] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-label="Mere"
          className="flex flex-1 flex-col items-center gap-1 py-2 text-[0.65rem] font-medium text-muted-foreground"
        >
          <MoreHorizontal className="size-5" />
          Mere
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="gap-1 p-4 pb-8">
          <SheetHeader className="p-0 pb-2">
            <SheetTitle>{user.name ?? "Menu"}</SheetTitle>
            {user.email && <SheetDescription>{user.email}</SheetDescription>}
          </SheetHeader>

          {overflowItems.map((item) => {
            const active = isActive(item.href);
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => go(item.href)}
                className={cn(
                  rowClass,
                  active ? "bg-primary/10 text-primary" : "hover:bg-muted"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            );
          })}

          <div className="my-1 h-px bg-border" />

          <button
            type="button"
            onClick={() => go("/dashboard/profile")}
            className={cn(rowClass, "hover:bg-muted")}
          >
            <UserRound className="size-4" /> Profil
          </button>
          <button
            type="button"
            onClick={() => go("/dashboard/settings")}
            className={cn(rowClass, "hover:bg-muted")}
          >
            <Settings className="size-4" /> Indstillinger
          </button>
          {user.role === "admin" && (
            <button
              type="button"
              onClick={() => go("/admin/exercises")}
              className={cn(rowClass, "hover:bg-muted")}
            >
              <ShieldCheck className="size-4" /> Admin
            </button>
          )}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={cn(
              rowClass,
              "text-destructive hover:bg-destructive/10"
            )}
          >
            <LogOut className="size-4" /> Log ud
          </button>
        </SheetContent>
      </Sheet>
    </>
  );
}
