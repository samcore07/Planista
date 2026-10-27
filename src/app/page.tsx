import Link from "next/link";
import {
  Sparkles,
  Calendar,
  DollarSign,
  CheckCircle2,
  Palette,
  ShieldAlert,
  FileDown,
  Receipt,
  ArrowRight,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Home() {
  const capabilities = [
    {
      icon: Sparkles,
      title: "AI Event Architect",
      desc: "Turn natural language descriptions into fully structured, editable event blueprints with validated timelines, budgets, and vendor needs.",
      badge: "Core Engine",
    },
    {
      icon: DollarSign,
      title: "Live Budget Intelligence",
      desc: "Deterministic, decimal-safe financial calculations. Real-time planned vs. actual tracking, per-guest math, and variance warnings.",
      badge: "Financial Engine",
    },
    {
      icon: Calendar,
      title: "Adaptive Timeline & Checklist",
      desc: "Dynamic task schedules with dependency awareness. Material delay impact analysis and automated schedule proposals.",
      badge: "Scheduling",
    },
    {
      icon: Palette,
      title: "AI Theme Studio",
      desc: "Cohesive aesthetic concepts, color palettes, decor styling, floral guidance, and curated moodboard asset generation.",
      badge: "Visual Direction",
    },
    {
      icon: Compass,
      title: "Context-Aware Planning Copilot",
      desc: "A conversational copilot embedded in your event workspace. Analyzes event state to propose, preview, and safely apply changes.",
      badge: "Copilot",
    },
    {
      icon: ShieldAlert,
      title: "Event Risk Radar",
      desc: "Continuous explainable risk auditing. Surfaces budget overruns, dependency blockades, missing vendors, and vendor gaps.",
      badge: "Auditing",
    },
    {
      icon: FileDown,
      title: "One-Click Event Pack",
      desc: "Instant export of run sheets, vendor summaries, emergency contacts, budgets, and task checklists in PDF and CSV format.",
      badge: "Production Ready",
    },
    {
      icon: Receipt,
      title: "AI Quote & Receipt Scanner",
      desc: "OCR and document extraction for vendor invoices and receipts with category mapping and duplicate detection.",
      badge: "Automation",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-accent selection:text-accent-foreground">
      {/* Header / Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold text-lg shadow-sm">
              P
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl font-semibold tracking-tight text-foreground">
                Planista
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground -mt-1 font-medium">
                Intelligent Event Architecture
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#architecture" className="hover:text-foreground transition-colors">
              Architecture
            </a>
            <a href="#workflow" className="hover:text-foreground transition-colors">
              Workflow
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm" className="gap-1.5 shadow-sm">
                Get Started
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto">
            <Badge variant="outline" className="px-3 py-1 gap-1.5 border-border/80 bg-secondary/40 text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
              Milestone 1 — Architecture & Core Design System
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
                <Badge variant="success">Budget Healthy</Badge>
                <Badge variant="outline">180 Guests</Badge>
                <Badge variant="outline">Oct 2026</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              <div className="rounded-lg bg-secondary/50 p-4 border border-border/60">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Planned Budget</span>
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-semibold tracking-tight text-foreground">
                  $45,000.00
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
                  $250.00
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Dynamic calculation based on guest count
                </p>
              </div>

              <div className="rounded-lg bg-secondary/50 p-4 border border-border/60">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Critical Checklist</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
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

        {/* Feature Capabilities Grid */}
        <section id="features" className="py-16 md:py-24 border-t border-border/60 bg-secondary/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <Badge variant="outline" className="uppercase tracking-widest text-[10px]">
                Built for Precision
              </Badge>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-foreground">
                Eight Pillars of Event Orchestration
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Engineered to replace scattered spreadsheets and superficial chatbots with verified data models.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {capabilities.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Card key={idx} className="border-border/80 bg-card hover:border-primary/40 transition-colors">
                    <CardHeader className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-md bg-secondary text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {item.badge}
                        </Badge>
                      </div>
                      <CardTitle className="text-base font-semibold">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-xs leading-relaxed">
                        {item.desc}
                      </CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-serif font-semibold text-foreground text-sm">Planista</span>
            <span>— Precision Event Architecture Platform</span>
          </div>
          <div>
            <span>TypeScript • Next.js App Router • Tailwind CSS • Supabase</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
