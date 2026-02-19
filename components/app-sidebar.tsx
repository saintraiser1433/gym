"use client"

import * as React from "react"
import {
  Command,
  LayoutDashboard,
  Users,
  Dumbbell,
  CalendarClock,
  CreditCard,
  Activity,
} from "lucide-react"
import { useSession } from "next-auth/react"
import Link from "next/link"

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

function getNavItems(role?: string): NavItem[] {
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
        url: "/admin/exercises",
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
      {
        title: "Coach",
        url: "/coach/dashboard",
        icon: Users,
        isActive: true,
        items: [
          { title: "Dashboard", url: "/coach/dashboard" },
          { title: "Clients", url: "/coach/clients" },
          { title: "Workouts", url: "/coach/workouts" },
          { title: "Schedules", url: "/coach/schedules" },
        ],
      },
    ]
  }

  if (role === "CLIENT") {
    return [
      {
        title: "Client",
        url: "/client/dashboard",
        icon: Activity,
        isActive: true,
      },
      { title: "Memberships", url: "/client/memberships", icon: CreditCard },
      { title: "Workouts", url: "/client/workouts", icon: Dumbbell },
      { title: "Goals", url: "/client/goals", icon: Activity },
      { title: "Check-in", url: "/client/checkin", icon: CalendarClock },
      { title: "Attendance", url: "/client/attendance", icon: CalendarClock },
      { title: "Payments", url: "/client/payments", icon: CreditCard },
    ]
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
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as string | undefined

  const navItems = React.useMemo(() => getNavItems(role), [role])

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
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
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

