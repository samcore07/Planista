import Link from "next/link";
import { Sparkles, ArrowRight, IndianRupee, Compass, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto">
        <Badge variant="outline" className="px-3 py-1 gap-1.5 border-border/80 bg-secondary/40 text-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Core Production Architecture Ready
        </Badge>

        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-foreground text-balance">
          Where event vision meets <span className="italic font-medium text-primary">mathematical rigor</span>.
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl text-balance">
          Planista transforms high-level event concepts into actionable blueprints.
          Every AI recommendation connects to live budget tables, verified tasks, and dependency-aware schedules.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link href="/events/new">
            <Button size="lg" className="gap-2 shadow-md px-7">
              Architect an Event
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg" className="px-6">
              Explore Workspace
            </Button>
          </Link>
        </div>
      </div>

      {/* Interactive Preview Surface */}
      <div className="mt-14 sm:mt-18 rounded-xl border border-border bg-card p-6 shadow-sm max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-border gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
              Active Blueprint Preview
            </span>
            <h3 className="text-lg font-serif font-semibold text-foreground mt-0.5">
              Verdant Manor Wedding & Reception
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Budget Healthy
            </Badge>
            <Badge variant="outline">180 Guests</Badge>
            <Badge variant="outline">Oct 2026</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="rounded-lg bg-secondary/50 p-4 border border-border/60">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Planned Budget</span>
              <IndianRupee className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">
              ₹45,000.00
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Allocated across 8 core categories
            </p>
          </div>

          <div className="rounded-lg bg-secondary/50 p-4 border border-border/60">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Cost Per Guest</span>
              <Compass className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">
              ₹250.00
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Dynamic calculation based on guest count
            </p>
          </div>

          <div className="rounded-lg bg-secondary/50 p-4 border border-border/60">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Critical Checklist</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">
              14 / 22 Tasks
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All critical dependencies on track
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
