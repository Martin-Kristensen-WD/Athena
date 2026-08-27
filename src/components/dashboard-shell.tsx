"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Activity,
  LayoutDashboard,
  LineChart,
  Dumbbell,
  LogOut,
  Settings,
  ShieldCheck,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/tracking", label: "Tracking", icon: LineChart },
  { href: "/dashboard/workouts", label: "Workouts", icon: Dumbbell },
];

type DashboardUser = {
  name?: string | null;
  email?: string | null;
  role: "user" | "admin";
};

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "?";
  return source
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function UserMenu({ user }: { user: DashboardUser }) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring/50">
            <Avatar className="size-8 shrink-0 ring-1 ring-border">
              <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                {initials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-sidebar-foreground">
                {user.name ?? "Account"}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        }
      />
      <DropdownMenuContent align="end" side="top" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-medium">{user.name ?? "Account"}</span>
            <span className="text-muted-foreground text-xs">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
          <Settings /> Settings
        </DropdownMenuItem>
        {user.role === "admin" && (
          <DropdownMenuItem onClick={() => router.push("/admin/exercises")}>
            <ShieldCheck /> Admin
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DashboardShell({
  user,
  children,
}: {
  user: DashboardUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar variant="floating">
        <SidebarHeader className="px-3 pt-3 pb-1">
          <Link href="/dashboard" className="flex items-center gap-2 px-1 py-1">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="size-4.5" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
              Athena
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="px-2 pt-2">
          <SidebarMenu className="gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <SidebarMenuItem key={item.href} className="relative">
                  {isActive && (
                    <span className="animate-pulse-soft absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary" />
                  )}
                  <SidebarMenuButton
                    isActive={isActive}
                    render={<Link href={item.href} />}
                    className="h-11 gap-3 pl-4 text-sm"
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                        isActive
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground group-hover/menu-button:text-sidebar-accent-foreground"
                      )}
                    >
                      <item.icon className="size-4" />
                    </span>
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2">
          <UserMenu user={user} />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="m-2 md:ml-0 rounded-2xl bg-card shadow-[0_1px_2px_rgba(22,35,28,0.04)] ring-1 ring-border">
        <header className="flex items-center border-b border-border px-4 py-2.5 md:hidden">
          <SidebarTrigger />
        </header>
        <div
          key={pathname}
          className="animate-in fade-in slide-in-from-bottom-2 flex-1 overflow-y-auto p-6 duration-500 md:p-8"
        >
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
