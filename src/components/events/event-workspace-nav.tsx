"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  IndianRupee,
  CalendarCheck,
  AlertTriangle,
  Palette,
  FileSearch,
  Download,
  Workflow,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceNavProps {
  eventId: string;
}

export function EventWorkspaceNav({ eventId }: WorkspaceNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Overview",
      href: `/events/${eventId}`,
      exact: true,
      icon: LayoutDashboard,
    },
    {
      name: "Budget",
      href: `/events/${eventId}/budget`,
      exact: false,
      icon: IndianRupee,
    },
    {
      name: "Timeline",
      href: `/events/${eventId}/timeline`,
      exact: false,
      icon: CalendarCheck,
    },
    {
      name: "Risk Radar",
      href: `/events/${eventId}/risks`,
      exact: false,
      icon: AlertTriangle,
    },
    {
      name: "Theme Studio",
      href: `/events/${eventId}/theme`,
      exact: false,
      icon: Palette,
    },
    {
      name: "Doc Scanner",
      href: `/events/${eventId}/scanner`,
      exact: false,
      icon: FileSearch,
    },
    {
      name: "Event Pack",
      href: `/events/${eventId}/export`,
      exact: false,
      icon: Download,
    },
    {
      name: "Logistics",
      href: `/events/${eventId}/logistics`,
      exact: false,
      icon: Workflow,
    },
    {
      name: "Settings",
      href: `/events/${eventId}/settings`,
      exact: false,
      icon: Settings,
    },
  ];

  return (
    <nav className="flex items-center space-x-1 overflow-x-auto border-b border-border bg-card px-4 sm:px-6 lg:px-8 py-1.5 scrollbar-none">
      {navItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
