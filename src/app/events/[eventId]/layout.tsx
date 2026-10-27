import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { EventsDAL } from "@/lib/dal/events.dal";
import { CopilotDAL } from "@/lib/dal/copilot.dal";
import { EventSwitcher } from "@/components/events/event-switcher";
import { EventWorkspaceNav } from "@/components/events/event-workspace-nav";
import { CopilotDrawer } from "@/components/copilot/copilot-drawer";

export const instant = false;

interface EventLayoutProps {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}

async function EventLayoutInner({
  eventId,
  children,
}: {
  eventId: string;
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/auth/login?redirectTo=/events/${eventId}`);
  }

  const [currentEvent, allEvents, copilotHistory] = await Promise.all([
    EventsDAL.getEventById(eventId),
    EventsDAL.getEvents(),
    CopilotDAL.getHistory(eventId),
  ]);

  if (!currentEvent) {
    notFound();
  }

  const userEmail = user.email || "planner@planista.app";
  const userName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    userEmail.split("@")[0];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card">
        <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold text-sm shadow-sm">
                P
              </div>
              <span className="font-serif text-base font-semibold tracking-tight text-foreground hidden sm:inline">
                Planista
              </span>
            </Link>

            <span className="text-muted-foreground hidden sm:inline">/</span>

            <EventSwitcher currentEvent={currentEvent} allEvents={allEvents} />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>{userName}</span>
            </div>
            <form action={signOut}>
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="gap-1 text-xs text-muted-foreground hover:text-destructive h-8 px-2"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </form>
          </div>
        </div>

        {/* Feature Sub-Navigation */}
        <EventWorkspaceNav eventId={eventId} />
      </header>

      {/* Workspace Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Persistent Planning Copilot Drawer */}
      <CopilotDrawer eventId={eventId} initialHistory={copilotHistory} />
    </div>
  );
}

export default async function EventLayout({ children, params }: EventLayoutProps) {
  const { eventId } = await params;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="space-y-2 text-center">
            <div className="h-8 w-8 rounded-md bg-primary mx-auto animate-pulse" />
            <p className="text-xs text-muted-foreground">Loading workspace...</p>
          </div>
        </div>
      }
    >
      <EventLayoutInner eventId={eventId}>{children}</EventLayoutInner>
    </Suspense>
  );
}
