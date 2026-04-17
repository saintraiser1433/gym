"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  CalendarClock,
  CreditCard,
  Activity,
} from "lucide-react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type NavItem = React.ComponentProps<typeof NavMain>["items"][number]

function getNavItems(role?: string, hasActiveMembership?: boolean): NavItem[] {
  if (role === "ADMIN") {
    return [
      {
        title: "Analytics",
        url: "/admin/analytics",
        icon: LayoutDashboard,
        isActive: true,
      },
      {
        title: "Accounts",
        url: "/admin/accounts",
        icon: Users,
      },
      {
        title: "Schedules",
        url: "/admin/schedules",
        icon: CalendarClock,
      },
      {
        title: "Attendance",
        url: "/admin/attendance",
        icon: CalendarClock,
      },
      {
        title: "Memberships",
        url: "/admin/memberships",
        icon: CreditCard,
      },
      {
        title: "Client Memberships",
        url: "/admin/client-memberships",
        icon: Users,
      },
      {
        title: "Coach Assignments",
        url: "/admin/coach-assignments",
        icon: Users,
      },
      {
        title: "Renewals",
        url: "/admin/renewals",
        icon: CreditCard,
      },
      {
        title: "Payments",
        url: "/admin/payments",
        icon: CreditCard,
      },
      {
        title: "Workout Goals",
        url: "/admin/goals",
        icon: Activity,
      },
      {
        title: "Client Goals",
        url: "/admin/client-goals",
        icon: Users,
      },
      {
        title: "Workouts",
        url: "/admin/workouts",
        icon: Dumbbell,
      },
      {
        title: "Equipment",
        url: "/admin/equipment",
        icon: CalendarClock,
      },
    ]
  }

  if (role === "COACH") {
    return [
      { title: "My Dashboard", url: "/coach/dashboard", icon: LayoutDashboard, isActive: true },
      { title: "My Clients", url: "/coach/clients", icon: Users },
      { title: "Schedules", url: "/coach/schedules", icon: CalendarClock },
    ]
  }

  if (role === "CLIENT") {
    const items: NavItem[] = [
      {
        title: "Client",
        url: "/client/dashboard",
        icon: Activity,
        isActive: true,
      },
      { title: "Memberships", url: "/client/memberships", icon: CreditCard },
    ];
    if (hasActiveMembership) {
      items.push(
        { title: "Goals", url: "/client/goals", icon: Activity },
        { title: "Schedules", url: "/client/schedules", icon: CalendarClock },
        { title: "Attendance", url: "/client/attendance", icon: CalendarClock },
      );
    }
    items.push({ title: "Payments", url: "/client/payments", icon: CreditCard });
    return items;
  }

  // Guest / fallback
  return [
    {
      title: "Welcome",
      url: "/auth/sign-in",
      icon: LayoutDashboard,
      isActive: true,
      items: [
        { title: "Sign in", url: "/auth/sign-in" },
      ],
    },
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const [hasActiveMembership, setHasActiveMembership] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    if (role !== "CLIENT") {
      setHasActiveMembership(undefined);
      return;
    }
    let cancelled = false;
    fetch("/api/client/me/membership", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setHasActiveMembership(!!data.hasActiveMembership);
      })
      .catch(() => {
        if (!cancelled) setHasActiveMembership(false);
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  const navItems = React.useMemo(
    () => getNavItems(role, role === "CLIENT" ? hasActiveMembership : undefined),
    [role, hasActiveMembership],
  );

  const user = {
    name: session?.user?.name ?? "Guest",
    email: session?.user?.email ?? "",
    avatar: "/avatars/shadcn.jpg",
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg border bg-white">
                  <Image
                    src="/croscalogo.jpg"
                    alt="CrosCal logo"
                    width={32}
                    height={32}
                    className="size-full object-cover"
                    priority
                  />
                </div>
                <div className="grid flex-1 text-left text-[12px] leading-tight">
                  <span className="truncate font-medium">CrosCal Fitness</span>
                  <span className="truncate text-xs">
                    {role ? role.toLowerCase() : "guest"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}

