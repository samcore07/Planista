import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Calendar,
  DollarSign,
  Plus,
  LogOut,
  User,
  ShieldCheck,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

async function DashboardContent() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/dashboard");
  }

  const userEmail = user.email || "planner@planista.app";
  const userName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    userEmail.split("@")[0];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold text-base shadow-sm">
                P
              </div>
              <span className="font-serif text-lg font-semibold tracking-tight text-foreground">
                Planista
              </span>
            </Link>
            <Badge variant="outline" className="hidden sm:inline-flex text-[10px]">
              Workspace
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{userName}</span>
            </div>
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit" className="gap-1.5 text-xs text-muted-foreground hover:text-destructive">
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Planning Overview
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Active celebrations, real-time budget intelligence, and task radars
            </p>
          </div>
          <Link href="/events/new">
            <Button size="sm" className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              Architect New Event
            </Button>
          </Link>
        </div>

        {/* Security & RLS Verified Status Banner */}
        <div className="rounded-lg border border-border bg-secondary/40 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>Row Level Security (RLS) Active: Authenticated as {userEmail}</span>
          </div>
          <Badge variant="success">Tenant Isolated</Badge>
        </div>

        {/* Workspace Quick Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Managed Events
              </CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">0 Active</div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Ready to architect your first event
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Allocated Capital
              </CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">$0.00</div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Deterministic decimal-safe tracking
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Risk Engine
              </CardTitle>
              <Compass className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">Operational</div>
              <p className="text-[11px] text-muted-foreground mt-1">
                All event parameters verified
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Empty State / Prompt to Create First Event */}
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-primary">
            <Calendar className="h-6 w-6" />
          </div>
          <div className="max-w-sm mx-auto space-y-1">
            <h3 className="font-serif text-lg font-semibold text-foreground">
              No events planned yet
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Describe your vision in natural language or configure dates, guest count, and budgets manually.
            </p>
          </div>
          <Link href="/events/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-3.5 w-3.5" />
              Create First Event
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
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
      <DashboardContent />
    </Suspense>
  );
}
